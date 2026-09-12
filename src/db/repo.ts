import { db, supabase } from './index.js';
import { ChangelogEntryRecord } from '../services/changelog/types.js';

export interface RepoRecord {
  id: string;
  github_installation_id: number;
  repo_full_name: string;
  last_indexed_at?: Date | null;
  created_at?: Date;
}

export interface CallSiteRecord {
  id: string;
  repo_id: string;
  file_path: string;
  line_number: number;
  stripe_symbol: string;
  snippet: string;
  created_at?: Date;
}

export interface MatchRecord {
  id: string;
  changelog_entry_id: string;
  call_site_id: string;
  status: 'pending' | 'fix_generated' | 'pr_opened' | 'resolved' | 'dismissed';
  created_at?: Date;
  updated_at?: Date;
}

export interface FixRecord {
  id: string;
  match_id: string;
  generated_diff: string;
  pr_url?: string;
  pr_status?: 'open' | 'merged' | 'closed';
  created_at?: Date;
  updated_at?: Date;
}

export class DataStore {
  /**
   * Upsert changelog entries into Supabase (via client or SQL)
   */
  async upsertChangelogEntries(entries: ChangelogEntryRecord[]): Promise<number> {
    if (entries.length === 0) return 0;

    if (supabase) {
      // Deduplicate by conflict key (source_url, affected_symbol, change_type) to avoid Postgres error 21000
      const uniqueMap = new Map<string, any>();
      for (const e of entries) {
        const key = `${e.source_url}::${e.affected_symbol}::${e.change_type}`;
        uniqueMap.set(key, {
          id: e.id,
          source_url: e.source_url,
          published_at: e.published_at.toISOString(),
          raw_text: e.raw_text,
          change_type: e.change_type,
          affected_symbol: e.affected_symbol,
          is_breaking: e.is_breaking,
        });
      }
      const payload = Array.from(uniqueMap.values());

      const { data, error } = await supabase
        .from('changelog_entries')
        .upsert(payload, { onConflict: 'source_url,affected_symbol,change_type' })
        .select('id');

      if (!error && data) {
        return data.length;
      }
      if (error) {
        console.warn('Supabase JS upsert error, falling back to universal SQL client:', error.message);
      }
    }

    // Universal SQL fallback
    let saved = 0;
    for (const e of entries) {
      const sql = `
        INSERT INTO changelog_entries (
          id, source_url, published_at, raw_text, change_type, affected_symbol, is_breaking
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (source_url, affected_symbol, change_type)
        DO UPDATE SET raw_text = EXCLUDED.raw_text, published_at = EXCLUDED.published_at
        RETURNING id;
      `;
      const res = await db.query(sql, [
        e.id,
        e.source_url,
        e.published_at.toISOString(),
        e.raw_text,
        e.change_type,
        e.affected_symbol,
        e.is_breaking,
      ]);
      if (res.rows && res.rows.length > 0) saved++;
    }
    return saved;
  }

  /**
   * Fetch breaking changes
   */
  async getBreakingEntries(limit = 100): Promise<ChangelogEntryRecord[]> {
    if (supabase) {
      const { data, error } = await supabase
        .from('changelog_entries')
        .select('*')
        .eq('is_breaking', true)
        .order('published_at', { ascending: false })
        .limit(limit);

      if (!error && data) {
        return data.map((r: any) => ({
          ...r,
          published_at: new Date(r.published_at),
        }));
      }
    }

    const sql = `
      SELECT id, source_url, published_at, raw_text, change_type, affected_symbol, is_breaking
      FROM changelog_entries
      WHERE is_breaking = true
      ORDER BY published_at DESC
      LIMIT $1;
    `;
    const res = await db.query<ChangelogEntryRecord>(sql, [limit]);
    return res.rows.map((r) => ({ ...r, published_at: new Date(r.published_at) }));
  }

  /**
   * Upsert a repository
   */
  async upsertRepo(repo: RepoRecord): Promise<void> {
    if (supabase) {
      const { error } = await supabase.from('repos').upsert({
        id: repo.id,
        github_installation_id: repo.github_installation_id,
        repo_full_name: repo.repo_full_name,
        last_indexed_at: repo.last_indexed_at ? repo.last_indexed_at.toISOString() : null,
      });
      if (!error) return;
    }

    const sql = `
      INSERT INTO repos (id, github_installation_id, repo_full_name, last_indexed_at)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (id) DO UPDATE SET
        github_installation_id = EXCLUDED.github_installation_id,
        repo_full_name = EXCLUDED.repo_full_name,
        last_indexed_at = EXCLUDED.last_indexed_at;
    `;
    await db.query(sql, [
      repo.id,
      repo.github_installation_id,
      repo.repo_full_name,
      repo.last_indexed_at ? repo.last_indexed_at.toISOString() : null,
    ]);
  }

  /**
   * Save extracted call sites for a repository
   */
  async saveCallSites(sites: CallSiteRecord[]): Promise<number> {
    if (sites.length === 0) return 0;

    if (supabase) {
      const { data, error } = await supabase.from('call_sites').insert(sites).select('id');
      if (!error && data) return data.length;
    }

    let count = 0;
    for (const s of sites) {
      const sql = `
        INSERT INTO call_sites (id, repo_id, file_path, line_number, stripe_symbol, snippet)
        VALUES ($1, $2, $3, $4, $5, $6);
      `;
      await db.query(sql, [s.id, s.repo_id, s.file_path, s.line_number, s.stripe_symbol, s.snippet]);
      count++;
    }
    return count;
  }
}

export const dataStore = new DataStore();
