import crypto from 'node:crypto';
import { db } from '../../db/index.js';
import { ChangelogClassifier } from './classifier.js';
import { ChangelogFetcher } from './fetcher.js';
import { ChangelogParser } from './parser.js';
import { ChangelogEntryRecord, ClassifiedChange, ParsedChangeItem } from './types.js';

export interface WatcherRunResult {
  releasesParsed: number;
  totalItems: number;
  breakingItemsFound: number;
  entriesSaved: number;
  breakingEntries: ChangelogEntryRecord[];
}

export class ChangelogWatcher {
  private fetcher: ChangelogFetcher;
  private parser: ChangelogParser;
  private classifier: ChangelogClassifier;

  constructor(options?: {
    fetcher?: ChangelogFetcher;
    parser?: ChangelogParser;
    classifier?: ChangelogClassifier;
  }) {
    this.fetcher = options?.fetcher || new ChangelogFetcher();
    this.parser = options?.parser || new ChangelogParser();
    this.classifier = options?.classifier || new ChangelogClassifier();
  }

  /**
   * Main execution loop: fetches changelog, parses items, classifies changes,
   * and persists breaking changes to the database.
   */
  async run(options?: { force?: boolean; markdownOverride?: string }): Promise<WatcherRunResult> {
    await db.initializeSchema();

    let rawMarkdown = options?.markdownOverride;
    if (!rawMarkdown) {
      rawMarkdown = await this.fetcher.fetchStripeNodeChangelog(options?.force);
    }

    const releases = this.parser.parseChangelogMarkdown(rawMarkdown);
    const breakingEntries: ChangelogEntryRecord[] = [];
    let totalItems = 0;
    let breakingItemsFound = 0;
    let entriesSaved = 0;

    for (const release of releases) {
      const items = this.parser.extractChangeItems(release);
      totalItems += items.length;

      for (const item of items) {
        const classification = await this.classifier.classify(item);

        if (classification.is_breaking) {
          breakingItemsFound++;

          const entry: ChangelogEntryRecord = {
            id: crypto.randomUUID(),
            source_url: item.source_url,
            published_at: new Date(item.published_at),
            raw_text: item.raw_text,
            change_type: classification.change_type,
            affected_symbol: classification.affected_symbol,
            is_breaking: true,
          };

          breakingEntries.push(entry);
        }
      }
    }

    if (breakingEntries.length > 0) {
      const { dataStore } = await import('../../db/repo.js');
      entriesSaved = await dataStore.upsertChangelogEntries(breakingEntries);
    }

    return {
      releasesParsed: releases.length,
      totalItems,
      breakingItemsFound,
      entriesSaved,
      breakingEntries,
    };
  }

  /**
   * Upserts a changelog entry into Postgres/Supabase
   */
  async saveEntry(entry: ChangelogEntryRecord): Promise<boolean> {
    const { dataStore } = await import('../../db/repo.js');
    const saved = await dataStore.upsertChangelogEntries([entry]);
    return saved > 0;
  }

  /**
   * Retrieves all breaking entries from the database
   */
  async getBreakingEntries(): Promise<ChangelogEntryRecord[]> {
    const { dataStore } = await import('../../db/repo.js');
    return dataStore.getBreakingEntries();
  }
}
