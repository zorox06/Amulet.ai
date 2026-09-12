import fs from 'node:fs';
import path from 'node:path';
import { RawRelease } from './types.js';

interface CacheEntry {
  etag?: string;
  lastModified?: string;
  lastFetchedAt: number;
  data: string;
}

export class ChangelogFetcher {
  private cacheFilePath: string;
  private minPollIntervalMs: number;

  constructor(options?: { cacheFilePath?: string; minPollIntervalMinutes?: number }) {
    this.cacheFilePath = options?.cacheFilePath || path.resolve(process.cwd(), '.changelog_cache.json');
    this.minPollIntervalMs = (options?.minPollIntervalMinutes ?? 15) * 60 * 1000;
  }

  private readCache(): Record<string, CacheEntry> {
    try {
      if (fs.existsSync(this.cacheFilePath)) {
        const raw = fs.readFileSync(this.cacheFilePath, 'utf8');
        return JSON.parse(raw);
      }
    } catch {
      // ignore corrupt cache
    }
    return {};
  }

  private writeCache(cache: Record<string, CacheEntry>): void {
    try {
      fs.writeFileSync(this.cacheFilePath, JSON.stringify(cache, null, 2), 'utf8');
    } catch (err) {
      console.warn('Failed to write changelog cache:', err);
    }
  }

  /**
   * Fetches raw content from URL respecting ETag, Last-Modified, and minimum polling interval
   */
  async fetchWithCache(url: string, force = false): Promise<{ content: string; fromCache: boolean }> {
    const cache = this.readCache();
    const entry = cache[url];
    const now = Date.now();

    if (!force && entry && now - entry.lastFetchedAt < this.minPollIntervalMs) {
      return { content: entry.data, fromCache: true };
    }

    const headers: Record<string, string> = {
      'User-Agent': 'API-Breaking-Change-Guardian/1.0',
    };

    if (entry?.etag) {
      headers['If-None-Match'] = entry.etag;
    }
    if (entry?.lastModified) {
      headers['If-Modified-Since'] = entry.lastModified;
    }

    try {
      const response = await fetch(url, { headers });

      if (response.status === 304 && entry) {
        entry.lastFetchedAt = now;
        this.writeCache(cache);
        return { content: entry.data, fromCache: true };
      }

      if (!response.ok) {
        if (entry) {
          console.warn(`Fetch failed with status ${response.status}. Using stale cached content.`);
          return { content: entry.data, fromCache: true };
        }
        throw new Error(`Failed to fetch ${url}: HTTP ${response.status} ${response.statusText}`);
      }

      const content = await response.text();
      cache[url] = {
        etag: response.headers.get('etag') || undefined,
        lastModified: response.headers.get('last-modified') || undefined,
        lastFetchedAt: now,
        data: content,
      };
      this.writeCache(cache);

      return { content, fromCache: false };
    } catch (error) {
      if (entry) {
        console.warn('Network error during fetch. Falling back to cached data:', error);
        return { content: entry.data, fromCache: true };
      }
      throw error;
    }
  }

  /**
   * Fetches the official stripe-node CHANGELOG.md
   */
  async fetchStripeNodeChangelog(force = false): Promise<string> {
    const url = 'https://raw.githubusercontent.com/stripe/stripe-node/master/CHANGELOG.md';
    const { content } = await this.fetchWithCache(url, force);
    return content;
  }

  /**
   * Fetches recent GitHub releases for stripe-node
   */
  async fetchStripeNodeReleases(perPage = 10, force = false): Promise<RawRelease[]> {
    const url = `https://api.github.com/repos/stripe/stripe-node/releases?per_page=${perPage}`;
    const { content } = await this.fetchWithCache(url, force);
    const json = JSON.parse(content);
    if (!Array.isArray(json)) {
      return [];
    }

    return json.map((r: any) => ({
      version: r.tag_name ? r.tag_name.replace(/^v/, '') : '',
      published_at: r.published_at || new Date().toISOString(),
      raw_body: r.body || '',
      source_url: r.html_url || `https://github.com/stripe/stripe-node/releases/tag/${r.tag_name}`,
    }));
  }
}
