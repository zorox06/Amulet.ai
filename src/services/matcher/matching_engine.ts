import { db, supabase } from '../../db/index.js';
import { ChangelogEntryRecord } from '../changelog/types.js';
import { CallSiteRecord, MatchRecord } from '../../db/repo.js';

export interface CorrelatedMatch {
  matchId: string;
  changelogEntryId: string;
  callSiteId: string;
  repoName: string;
  filePath: string;
  lineNumber: number;
  stripeSymbol: string;
  snippet: string;
  changeType: string;
  affectedSymbol: string;
  rawText: string;
  sourceUrl: string;
  publishedAt: Date;
  status: 'pending' | 'fix_generated' | 'pr_opened' | 'resolved' | 'dismissed';
}

export class MatchingEngine {
  /**
   * Normalize an affected symbol or call site symbol to standard lower dotted representation
   * e.g. 'stripe.charges.create' -> 'charges.create'
   * e.g. 'this.stripe.refunds.create' -> 'refunds.create'
   */
  public normalizeSymbol(symbol: string): string {
    return symbol
      .replace(/^this\./, '')
      .replace(/^stripe\./i, '')
      .replace(/\(\)$/, '')
      .trim()
      .toLowerCase();
  }

  /**
   * Determine if a changelog entry's affected_symbol matches a codebase call site
   */
  public isMatch(callSiteSymbol: string, affectedSymbol: string): boolean {
    const normCall = this.normalizeSymbol(callSiteSymbol);
    const normAff = this.normalizeSymbol(affectedSymbol);

    if (normCall === normAff) return true;

    // Suffix match: e.g. 'charges.create' matches 'charges.create'
    if (normCall.endsWith(normAff) || normAff.endsWith(normCall)) {
      return true;
    }

    // Resource method correlation: e.g. 'charges' resource matches 'charges.create'
    const callParts = normCall.split('.');
    const affParts = normAff.split('.');

    if (callParts.length >= 2 && affParts.length >= 1) {
      // E.g. call is 'charges.create', entry is 'charges'
      if (callParts[0] === affParts[0]) {
        return true;
      }
    }

    return false;
  }

  /**
   * Scan all indexed call sites against breaking changelog entries and record matches in DB
   */
  public async correlateAll(): Promise<CorrelatedMatch[]> {
    await db.initializeSchema();

    // 1. Fetch all breaking changelog entries
    const changelogRes = await db.query<ChangelogEntryRecord>(
      `SELECT id, source_url, published_at, raw_text, change_type, affected_symbol, is_breaking
       FROM changelog_entries
       WHERE is_breaking = true
       ORDER BY published_at DESC`
    );
    const changelogEntries = changelogRes.rows;

    // 2. Fetch all call sites joined with repo
    const callSitesRes = await db.query<any>(
      `SELECT cs.id, cs.repo_id, cs.file_path, cs.line_number, cs.stripe_symbol, cs.snippet, r.repo_full_name
       FROM call_sites cs
       JOIN repos r ON cs.repo_id = r.id`
    );
    const callSites = callSitesRes.rows;

    // 3. Fetch all existing dismissed or recorded matches to avoid duplicate/overwritten dismissals
    const existingMatchesRes = await db.query<any>(
      `SELECT id, changelog_entry_id, call_site_id, status FROM matches`
    );
    const existingMap = new Map<string, { id: string; status: string }>();
    for (const m of existingMatchesRes.rows) {
      existingMap.set(`${m.changelog_entry_id}::${m.call_site_id}`, {
        id: m.id,
        status: m.status,
      });
    }

    const matchesToInsert: { id: string; changelog_entry_id: string; call_site_id: string; status: string }[] = [];
    const results: CorrelatedMatch[] = [];

    for (const cs of callSites) {
      for (const entry of changelogEntries) {
        if (this.isMatch(cs.stripe_symbol, entry.affected_symbol)) {
          const key = `${entry.id}::${cs.id}`;
          const existing = existingMap.get(key);

          // If already dismissed by the user, preserve dismissed status and do NOT re-flag
          const status = existing ? existing.status : 'pending';
          const matchId = existing ? existing.id : `match_${entry.id.slice(0, 8)}_${cs.id.slice(0, 8)}_${Date.now()}`;

          if (!existing) {
            matchesToInsert.push({
              id: matchId,
              changelog_entry_id: entry.id,
              call_site_id: cs.id,
              status: 'pending',
            });
            existingMap.set(key, { id: matchId, status: 'pending' });
          }

          results.push({
            matchId,
            changelogEntryId: entry.id,
            callSiteId: cs.id,
            repoName: cs.repo_full_name,
            filePath: cs.file_path,
            lineNumber: cs.line_number,
            stripeSymbol: cs.stripe_symbol,
            snippet: cs.snippet,
            changeType: entry.change_type,
            affectedSymbol: entry.affected_symbol,
            rawText: entry.raw_text,
            sourceUrl: entry.source_url,
            publishedAt: new Date(entry.published_at),
            status: status as any,
          });
        }
      }
    }

    // Persist new matches to DB
    if (matchesToInsert.length > 0) {
      for (const m of matchesToInsert) {
        await db.query(
          `INSERT INTO matches (id, changelog_entry_id, call_site_id, status)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (changelog_entry_id, call_site_id) DO NOTHING`,
          [m.id, m.changelog_entry_id, m.call_site_id, m.status]
        );
      }
    }

    return results;
  }

  /**
   * Dismiss a match (user declares it won't break or is already handled)
   */
  public async dismissMatch(matchId: string): Promise<boolean> {
    const res = await db.query(
      `UPDATE matches SET status = 'dismissed', updated_at = NOW() WHERE id = $1 RETURNING id`,
      [matchId]
    );
    return (res.rows && res.rows.length > 0);
  }

  /**
   * Fetch active (non-dismissed) matches with full join metadata
   */
  public async getActiveMatches(limit = 100): Promise<CorrelatedMatch[]> {
    const sql = `
      SELECT 
        m.id as "matchId",
        m.changelog_entry_id as "changelogEntryId",
        m.call_site_id as "callSiteId",
        m.status,
        cs.file_path as "filePath",
        cs.line_number as "lineNumber",
        cs.stripe_symbol as "stripeSymbol",
        cs.snippet,
        r.repo_full_name as "repoName",
        ce.affected_symbol as "affectedSymbol",
        ce.change_type as "changeType",
        ce.raw_text as "rawText",
        ce.source_url as "sourceUrl",
        ce.published_at as "publishedAt"
      FROM matches m
      JOIN call_sites cs ON m.call_site_id = cs.id
      JOIN repos r ON cs.repo_id = r.id
      JOIN changelog_entries ce ON m.changelog_entry_id = ce.id
      WHERE m.status != 'dismissed'
      ORDER BY ce.published_at DESC
      LIMIT $1;
    `;
    const res = await db.query(sql, [limit]);
    const seen = new Set<string>();
    const uniqueMatches: CorrelatedMatch[] = [];

    for (const r of res.rows) {
      const key = `${r.repoName}::${r.filePath}::${r.lineNumber}::${r.stripeSymbol}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueMatches.push({
          ...r,
          publishedAt: new Date(r.publishedAt),
        });
      }
    }

    return uniqueMatches;
  }
}

export const matchingEngine = new MatchingEngine();
