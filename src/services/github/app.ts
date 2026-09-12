import { createAppAuth } from '@octokit/auth-app';
import { Octokit } from '@octokit/rest';
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
  getInstallationOctokit(installationId: number): Octokit {
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
    dirPath = ''
  ): Promise<number> {
    const octokit = this.getInstallationOctokit(installationId);
    let indexedSitesCount = 0;

    const { data: contents } = await octokit.rest.repos.getContent({
      owner,
      repo,
      path: dirPath,
    });

    if (Array.isArray(contents)) {
      for (const item of contents) {
        if (item.type === 'dir') {
          if (!['node_modules', 'dist', '.git', '.next'].includes(item.name)) {
            indexedSitesCount += await this.indexRemoteRepositoryViaAPI(
              installationId,
              owner,
              repo,
              item.path
            );
          }
        } else if (item.type === 'file' && (item.name.endsWith('.ts') || item.name.endsWith('.tsx'))) {
          // Fetch raw file content
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
                repo_id: `${owner}/${repo}`,
                file_path: cs.filePath,
                line_number: cs.lineNumber,
                stripe_symbol: cs.stripeSymbol,
                snippet: cs.snippet,
              }));
              await dataStore.saveCallSites(records);
              indexedSitesCount += records.length;
            }
          }
        }
      }
    }

    return indexedSitesCount;
  }
}
