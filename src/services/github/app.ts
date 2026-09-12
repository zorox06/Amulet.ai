import type { Octokit as OctokitType } from '@octokit/rest';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { execFile } from 'node:child_process';
import { db } from '../../db/index.js';
import { dataStore } from '../../db/repo.js';
import { TreeSitterStripeIndexer } from '../indexer/tree_sitter_indexer.js';

export interface GitHubAppConfig {
  appId: string;
  privateKey: string;
  webhookSecret: string;
}

const execFileAsync = promisify(execFile);

// Dynamic module loader for pure ESM @octokit packages to prevent ERR_REQUIRE_ESM in CommonJS
let octokitRestModule: any = null;
let octokitAuthAppModule: any = null;

export async function loadOctokitModules() {
  if (!octokitRestModule) {
    octokitRestModule = await import('@octokit/rest');
  }
  if (!octokitAuthAppModule) {
    octokitAuthAppModule = await import('@octokit/auth-app');
  }
  const OctokitClass = octokitRestModule.Octokit || octokitRestModule.default?.Octokit || octokitRestModule.default;
  const createAppAuthFn = octokitAuthAppModule.createAppAuth || octokitAuthAppModule.default?.createAppAuth || octokitAuthAppModule.default;
  return {
    Octokit: OctokitClass,
    createAppAuth: createAppAuthFn,
  };
}

export class GitHubAppService {
  private config: GitHubAppConfig;
  private astIndexer: TreeSitterStripeIndexer;

  constructor(config?: Partial<GitHubAppConfig>) {
    this.config = {
      appId: config?.appId || process.env.GITHUB_APP_ID || 'dummy_app_id',
      privateKey: (config?.privateKey || process.env.GITHUB_APP_PRIVATE_KEY || process.env.GITHUB_PRIVATE_KEY || 'dummy_key').replace(/\\n/g, '\n'),
      webhookSecret: config?.webhookSecret || process.env.GITHUB_APP_WEBHOOK_SECRET || process.env.GITHUB_WEBHOOK_SECRET || 'dummy_secret',
    };
    this.astIndexer = new TreeSitterStripeIndexer();
  }

  /**
   * Returns an authenticated Octokit client scoped to a customer's specific installation
   */
  async getInstallationOctokit(installationId: number): Promise<any> {
    const { Octokit, createAppAuth } = await loadOctokitModules();
    return new Octokit({
      authStrategy: createAppAuth,
      auth: {
        appId: this.config.appId,
        privateKey: this.config.privateKey,
        installationId: installationId,
      },
    });
  }

  isConfigured(): boolean {
    return Boolean(process.env.GITHUB_APP_ID && (process.env.GITHUB_APP_PRIVATE_KEY || process.env.GITHUB_PRIVATE_KEY));
  }

  getInstallUrl(): string | null {
    const slug = process.env.GITHUB_APP_SLUG;
    return slug ? `https://github.com/apps/${encodeURIComponent(slug)}/installations/new` : null;
  }

  /** Obtains a fresh, short-lived installation token. The token is never persisted. */
  async getInstallationToken(installationId: number): Promise<string> {
    if (!this.isConfigured()) throw new Error('GitHub App is not configured');
    const { createAppAuth } = await loadOctokitModules();
    const auth = createAppAuth({ appId: this.config.appId, privateKey: this.config.privateKey, installationId });
    const result = await auth({ type: 'installation' });
    return result.token;
  }

  async saveInstallation(installationId: number, userId: string | null, account?: { login?: string; type?: string }): Promise<void> {
    await db.initializeSchema();
    await db.query(
      `INSERT INTO github_installations (installation_id, user_id, account_login, account_type, updated_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (installation_id) DO UPDATE SET user_id = EXCLUDED.user_id, account_login = EXCLUDED.account_login, account_type = EXCLUDED.account_type, updated_at = NOW()`,
      [installationId, userId, account?.login || null, account?.type || null],
    );
  }

  async getLatestInstallation(userId?: string | null): Promise<number | null> {
    await db.initializeSchema();
    const result = userId
      ? await db.query<{ installation_id: string }>('SELECT installation_id FROM github_installations WHERE user_id = $1 ORDER BY updated_at DESC LIMIT 1', [userId])
      : await db.query<{ installation_id: string }>('SELECT installation_id FROM github_installations ORDER BY updated_at DESC LIMIT 1');
    return result.rows[0] ? Number(result.rows[0].installation_id) : null;
  }

  /** Clones a customer-approved repository using an ephemeral installation token. */
  async cloneRepository(installationId: number, fullName: string, ref?: string): Promise<string> {
    if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(fullName)) throw new Error('Invalid GitHub repository name');
    const token = await this.getInstallationToken(installationId);
    const target = fs.mkdtempSync(path.join(os.tmpdir(), 'guardian-repo-'));
    const url = `https://x-access-token:${token}@github.com/${fullName}.git`;
    const args = ['clone', '--depth', '1'];
    if (ref) args.push('--branch', ref);
    args.push(url, target);
    try {
      await execFileAsync('git', args, { windowsHide: true, maxBuffer: 1024 * 1024 * 10 });
      return target;
    } catch (error) {
      fs.rmSync(target, { recursive: true, force: true });
      throw error;
    }
  }

  /**
   * Verifies incoming webhook signature (HMAC SHA-256)
   */
  verifyWebhookSignature(payload: string, signatureHeader?: string): boolean {
    if (!signatureHeader || !this.config.webhookSecret) return false;
    const hmac = crypto.createHmac('sha256', this.config.webhookSecret);
    const digest = 'sha256=' + hmac.update(payload).digest('hex');
    try {
      return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signatureHeader));
    } catch {
      return false;
    }
  }

  /**
   * Handles webhook events from GitHub
   */
  async handleWebhook(event: string, payload: any): Promise<{ handled: boolean; action: string }> {
    if (event === 'installation') {
      const action = payload.action;
      const installationId = payload.installation?.id;

      if (action === 'created') {
        const repositories = payload.repositories || [];
        for (const repo of repositories) {
          await dataStore.upsertRepo({
            id: String(repo.id),
            github_installation_id: installationId,
            repo_full_name: repo.full_name,
            last_indexed_at: null,
          });
        }
        return { handled: true, action: 'installation_created' };
      }

      if (action === 'deleted') {
        return { handled: true, action: 'installation_deleted' };
      }
    }

    if (event === 'push') {
      const repoFullName = payload.repository?.full_name;
      const installationId = payload.installation?.id;
      // In production, queue an incremental indexing job for the modified files
      return { handled: true, action: 'push_indexing_triggered' };
    }

    return { handled: false, action: 'ignored' };
  }

  /**
   * Fetches and indexes a remote repository directly via the GitHub Contents API
   * without needing to clone the entire repository to local disk.
   */
  async indexRemoteRepositoryViaAPI(
    installationId: number,
    owner: string,
    repo: string,
    dirPath = '',
    targetRepoId?: string,
    customToken?: string
  ): Promise<number> {
    await db.initializeSchema();
    const { Octokit } = await loadOctokitModules();
    const token = customToken || process.env.GITHUB_TOKEN || undefined;
    const octokit = (installationId && this.isConfigured())
      ? await this.getInstallationOctokit(installationId)
      : new Octokit({ auth: token });

    const actualRepoId = targetRepoId || `${owner}/${repo}`;
    await db.query(
      `INSERT INTO repos (id, github_installation_id, repo_full_name, last_indexed_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (id) DO UPDATE SET last_indexed_at = NOW()`,
      [actualRepoId, installationId || 0, `${owner}/${repo}`]
    );

    let indexedSitesCount = 0;

    try {
      const { data: contents } = await octokit.rest.repos.getContent({
        owner,
        repo,
        path: dirPath,
      });

      if (Array.isArray(contents)) {
        for (const item of contents) {
          if (item.type === 'dir') {
            if (!['node_modules', 'dist', '.git', '.next', 'build', 'out'].includes(item.name)) {
              indexedSitesCount += await this.indexRemoteRepositoryViaAPI(
                installationId,
                owner,
                repo,
                item.path,
                actualRepoId,
                token
              );
            }
          } else if (item.type === 'file' && (item.name.endsWith('.ts') || item.name.endsWith('.tsx') || item.name.endsWith('.js') || item.name.endsWith('.jsx'))) {
            try {
              const { data: fileData } = await octokit.rest.repos.getContent({
                owner,
                repo,
                path: item.path,
              });

              if ('content' in fileData && fileData.encoding === 'base64') {
                const rawContent = Buffer.from(fileData.content, 'base64').toString('utf8');
                const callSites = this.astIndexer.indexSourceCode(rawContent, item.path);

                if (callSites.length > 0) {
                  const records = callSites.map((cs) => ({
                    id: crypto.randomUUID(),
                    repo_id: actualRepoId,
                    file_path: cs.filePath,
                    line_number: cs.lineNumber,
                    stripe_symbol: cs.stripeSymbol,
                    snippet: cs.snippet,
                  }));
                  await dataStore.saveCallSites(records);
                  indexedSitesCount += records.length;
                }
              }
            } catch (fileErr) {
              console.warn(`Could not index remote file ${item.path}:`, fileErr);
            }
          }
        }
      }
    } catch (apiErr: any) {
      console.warn(`GitHub Contents API error for ${owner}/${repo}/${dirPath}:`, apiErr?.message || apiErr);
    }

    return indexedSitesCount;
  }
}
