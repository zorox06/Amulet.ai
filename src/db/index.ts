import fs from 'node:fs';
import path from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

export interface DatabaseClient {
  query<T = any>(sql: string, params?: any[]): Promise<{ rows: T[] }>;
  close(): Promise<void>;
}

class UniversalDatabase implements DatabaseClient {
  private pgPool?: pg.Pool;
  private pglite?: PGlite;
  private clientPromise?: Promise<{ query: (sql: string, params?: any[]) => Promise<{ rows: any[] }> }>;
  private initializationPromise?: Promise<void>;
  public supabaseClient?: SupabaseClient;
  private initialized = false;

  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
    if (supabaseUrl && supabaseKey) {
      this.supabaseClient = createClient(supabaseUrl, supabaseKey);
    }
  }

  private async getClient(): Promise<{ query: (sql: string, params?: any[]) => Promise<{ rows: any[] }> }> {
    if (this.pgPool) {
      return this.pgPool;
    }
    if (this.pglite) {
      return this.pglite;
    }
    if (this.clientPromise) {
      return this.clientPromise;
    }

    this.clientPromise = (async () => {
      const databaseUrl = process.env.DATABASE_URL;
      if (databaseUrl && databaseUrl.trim().length > 0) {
        this.pgPool = new pg.Pool({ connectionString: databaseUrl });
        return this.pgPool;
      }
      this.pglite = new PGlite();
      return this.pglite;
    })();
    return this.clientPromise;
  }

  async query<T = any>(sql: string, params?: any[]): Promise<{ rows: T[] }> {
    try {
      const client = await this.getClient();
      const res = await client.query(sql, params);
      return { rows: res.rows as T[] };
    } catch (err: any) {
      console.warn('Database query warning:', err?.message || err);
      return { rows: [] };
    }
  }

  async initializeSchema(): Promise<void> {
    if (this.initialized) return;
    if (!this.initializationPromise) {
      this.initializationPromise = (async () => {
        const statements = [
          `CREATE TABLE IF NOT EXISTS repos (
            id TEXT PRIMARY KEY,
            github_installation_id BIGINT NOT NULL,
            repo_full_name TEXT NOT NULL,
            user_id TEXT,
            last_indexed_at TIMESTAMPTZ,
            created_at TIMESTAMPTZ DEFAULT NOW()
          )`,
          `CREATE TABLE IF NOT EXISTS call_sites (
            id TEXT PRIMARY KEY,
            repo_id TEXT NOT NULL REFERENCES repos(id) ON DELETE CASCADE,
            file_path TEXT NOT NULL,
            line_number INT NOT NULL,
            stripe_symbol TEXT NOT NULL,
            snippet TEXT NOT NULL,
            created_at TIMESTAMPTZ DEFAULT NOW()
          )`,
          `CREATE TABLE IF NOT EXISTS changelog_entries (
            id TEXT PRIMARY KEY,
            source_url TEXT NOT NULL,
            published_at TIMESTAMPTZ NOT NULL,
            raw_text TEXT NOT NULL,
            change_type TEXT NOT NULL,
            affected_symbol TEXT NOT NULL,
            is_breaking BOOLEAN NOT NULL DEFAULT true,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            CONSTRAINT uq_changelog_entry UNIQUE (source_url, affected_symbol, change_type)
          )`,
          `CREATE TABLE IF NOT EXISTS matches (
            id TEXT PRIMARY KEY,
            changelog_entry_id TEXT NOT NULL REFERENCES changelog_entries(id) ON DELETE CASCADE,
            call_site_id TEXT NOT NULL REFERENCES call_sites(id) ON DELETE CASCADE,
            status TEXT NOT NULL DEFAULT 'pending',
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW(),
            CONSTRAINT uq_match UNIQUE (changelog_entry_id, call_site_id)
          )`,
          `CREATE TABLE IF NOT EXISTS fixes (
            id TEXT PRIMARY KEY,
            match_id TEXT NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
            generated_diff TEXT NOT NULL,
            pr_url TEXT,
            pr_status TEXT DEFAULT 'open',
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
          )`,
          `CREATE TABLE IF NOT EXISTS github_installations (
            installation_id BIGINT PRIMARY KEY,
            user_id TEXT,
            account_login TEXT,
            account_type TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
          )`,
          `CREATE INDEX IF NOT EXISTS idx_call_sites_symbol ON call_sites(stripe_symbol)`,
          `CREATE INDEX IF NOT EXISTS idx_call_sites_repo ON call_sites(repo_id)`,
          `CREATE INDEX IF NOT EXISTS idx_changelog_symbol ON changelog_entries(affected_symbol)`,
          `CREATE INDEX IF NOT EXISTS idx_matches_status ON matches(status)`,
          `ALTER TABLE repos ADD COLUMN IF NOT EXISTS user_id TEXT`,
        ];

        for (const stmt of statements) {
          try {
            await this.query(stmt);
          } catch {
            // Non-blocking schema initialization
          }
        }
        this.initialized = true;
      })();
    }
    try {
      await this.initializationPromise;
    } catch (error) {
      this.initializationPromise = undefined;
      console.warn('Schema init deferred:', error);
    }
  }

  async close(): Promise<void> {
    if (this.pgPool) {
      await this.pgPool.end();
      this.pgPool = undefined;
    }
    if (this.pglite) {
      await this.pglite.close();
      this.pglite = undefined;
    }
    this.initialized = false;
    this.clientPromise = undefined;
    this.initializationPromise = undefined;
  }
}

export const db = new UniversalDatabase();
export const supabase = db.supabaseClient;
