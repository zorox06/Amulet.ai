export type ChangeType = 'deprecation' | 'removal' | 'signature_change';

export interface RawRelease {
  version: string;
  published_at: string;
  raw_body: string;
  source_url: string;
}

export interface ParsedChangeItem {
  version: string;
  published_at: string;
  source_url: string;
  raw_text: string;
  pr_number?: string;
  pr_url?: string;
}

export interface ClassifiedChange {
  is_breaking: boolean;
  change_type: ChangeType;
  affected_symbol: string;
  reason: string;
  confidence: number;
}

export interface ChangelogEntryRecord {
  id: string;
  source_url: string;
  published_at: Date;
  raw_text: string;
  change_type: ChangeType;
  affected_symbol: string;
  is_breaking: boolean;
  created_at?: Date;
}
