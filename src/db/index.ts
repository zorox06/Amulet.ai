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
    const client = await this.getClient();
    const res = await client.query(sql, params);
    return { rows: res.rows as T[] };
  }

  async initializeSchema(): Promise<void> {
    if (this.initialized) return;
    if (!this.initializationPromise) {
      this.initializationPromise = (async () => {
        // `tsc` does not copy SQL assets to dist. Prefer the source schema when
        const sourceSchemaPath = path.resolve(process.cwd(), 'src', 'db', 'schema.sql');
        const currentDir = typeof __dirname !== 'undefined' ? __dirname : process.cwd();
        const schemaPath = fs.existsSync(sourceSchemaPath) ? sourceSchemaPath : path.resolve(currentDir, 'schema.sql');
        if (fs.existsSync(schemaPath)) {
          const schemaSql = fs.readFileSync(schemaPath, 'utf8');
          const statements = schemaSql
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0);

          for (const stmt of statements) {
            await this.query(stmt);
          }

          // Seed default demo repo if repos is empty so dashboard displays out-of-the-box
          try {
            const check = await this.query('SELECT count(*) as count FROM repos');
            if (parseInt(check.rows[0]?.count || '0', 10) === 0) {
              await this.query(`
                INSERT INTO repos (id, github_installation_id, repo_full_name, last_indexed_at)
                VALUES ('stripe-demo', 10000001, 'enterprise/stripe-demo', NOW())
                ON CONFLICT (id) DO NOTHING
              `);
            }
          } catch {
            // Non-critical seeding fallback
          }
        }
        this.initialized = true;
      })();
    }
    try {
      await this.initializationPromise;
    } catch (error) {
      this.initializationPromise = undefined;
      throw error;
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
