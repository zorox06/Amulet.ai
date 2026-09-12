import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { db } from '../../db/index.js';
import { CallSiteRecord, dataStore } from '../../db/repo.js';
import { ExtractedCallSite, TreeSitterStripeIndexer } from './tree_sitter_indexer.js';

export interface RepoIndexResult {
  repoId: string;
  filesScanned: number;
  stripeCallSitesFound: number;
  callSites: ExtractedCallSite[];
}

export class RepoIndexer {
  private astIndexer: TreeSitterStripeIndexer;

  constructor() {
    this.astIndexer = new TreeSitterStripeIndexer();
  }

  /**
   * Recursively finds all TypeScript and TSX files in directory
   */
  findTypeScriptFiles(dir: string, baseDir = dir): string[] {
    const files: string[] = [];
    if (!fs.existsSync(dir)) return files;

    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relativePath = path.relative(baseDir, fullPath).replace(/\\/g, '/');

      // Skip common non-source directories
      if (entry.isDirectory()) {
        if (
          entry.name === 'node_modules' ||
          entry.name === 'dist' ||
          entry.name === '.git' ||
          entry.name === '.next' ||
          entry.name === 'build' ||
          entry.name === '.pgdata'
        ) {
          continue;
        }
        files.push(...this.findTypeScriptFiles(fullPath, baseDir));
      } else if (entry.isFile()) {
        if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) {
          // Skip declaration files
          if (!entry.name.endsWith('.d.ts')) {
            files.push(relativePath);
          }
        }
      }
    }

    return files;
  }

  /**
   * Indexes an entire repository directory and saves extracted call sites
   */
  async indexRepositoryDirectory(repoId: string, repoRoot: string): Promise<RepoIndexResult> {
    const tsFiles = this.findTypeScriptFiles(repoRoot);
    const allCallSites: ExtractedCallSite[] = [];
    const dbCallSites: CallSiteRecord[] = [];

    for (const relPath of tsFiles) {
      const fullPath = path.join(repoRoot, relPath);
      const code = fs.readFileSync(fullPath, 'utf8');

      const sites = this.astIndexer.indexSourceCode(code, relPath);
      allCallSites.push(...sites);

      for (const s of sites) {
        dbCallSites.push({
          id: crypto.randomUUID(),
          repo_id: repoId,
          file_path: s.filePath,
          line_number: s.lineNumber,
          stripe_symbol: s.stripeSymbol,
          snippet: s.snippet,
        });
      }
    }

    // Ensure repository record exists in repos table to satisfy foreign key constraint
    await db.query(
      `INSERT INTO repos (id, github_installation_id, repo_full_name, last_indexed_at)
       VALUES ($1, 10000001, $2, NOW())
       ON CONFLICT (id) DO UPDATE SET last_indexed_at = NOW()`,
      [repoId, repoId]
    );

    // Persist to Supabase / Postgres (clean prior call sites for repoId to prevent duplication)
    if (dbCallSites.length > 0) {
      await db.query('DELETE FROM call_sites WHERE repo_id = $1', [repoId]);
      await dataStore.saveCallSites(dbCallSites);
    }

    return {
      repoId,
      filesScanned: tsFiles.length,
      stripeCallSitesFound: allCallSites.length,
      callSites: allCallSites,
    };
  }
}
