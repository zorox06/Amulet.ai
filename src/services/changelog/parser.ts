import { ParsedChangeItem, RawRelease } from './types.js';

export class ChangelogParser {
  /**
   * Parses raw CHANGELOG.md markdown into an array of RawRelease structures
   */
  parseChangelogMarkdown(markdown: string): RawRelease[] {
    const releases: RawRelease[] = [];
    const lines = markdown.split('\n');

    let currentVersion: string | null = null;
    let currentDate: string | null = null;
    let currentBodyLines: string[] = [];

    const versionHeaderRegex = /^##\s+\[?v?(\d+\.\d+\.\d+(?:-[\w.]+)?)]?(?:\s*-\s*(\d{4}-\d{2}-\d{2}))?/;

    for (const line of lines) {
      const match = line.match(versionHeaderRegex);
      if (match) {
        if (currentVersion) {
          releases.push({
            version: currentVersion,
            published_at: currentDate ? `${currentDate}T00:00:00Z` : new Date().toISOString(),
            raw_body: currentBodyLines.join('\n').trim(),
            source_url: `https://github.com/stripe/stripe-node/releases/tag/v${currentVersion}`,
          });
        }
        currentVersion = match[1];
        currentDate = match[2] || null;
        currentBodyLines = [];
      } else if (currentVersion) {
        currentBodyLines.push(line);
      }
    }

    if (currentVersion) {
      releases.push({
        version: currentVersion,
        published_at: currentDate ? `${currentDate}T00:00:00Z` : new Date().toISOString(),
        raw_body: currentBodyLines.join('\n').trim(),
        source_url: `https://github.com/stripe/stripe-node/releases/tag/v${currentVersion}`,
      });
    }

    return releases;
  }

  /**
   * Deconstructs a release body into granular individual change items.
   * Flattens nested bullets so that specific API modifications (e.g. within "Update generated code")
   * are extracted as atomic items for precise classification and symbol matching.
   */
  extractChangeItems(release: RawRelease): ParsedChangeItem[] {
    const items: ParsedChangeItem[] = [];
    const lines = release.raw_body.split('\n');

    let currentItemText = '';
    let currentPrNumber: string | undefined;
    let currentPrUrl: string | undefined;

    const prRegex = /\[#(\d+)\]\((https:\/\/github\.com\/[^)]+)\)/;

    const flushItem = () => {
      const trimmed = currentItemText.trim();
      if (trimmed.length > 0) {
        items.push({
          version: release.version,
          published_at: release.published_at,
          source_url: release.source_url,
          raw_text: trimmed,
          pr_number: currentPrNumber,
          pr_url: currentPrUrl,
        });
      }
      currentItemText = '';
    };

    for (const line of lines) {
      const trimmedLine = line.trim();

      // Check if line is a bullet item (e.g. "* ...", "- ...", "  * ...", etc.)
      const isBullet = /^\s*[*+-]\s+/.test(line);

      if (isBullet) {
        flushItem();

        // Extract any PR link in this bullet
        const prMatch = trimmedLine.match(prRegex);
        if (prMatch) {
          currentPrNumber = prMatch[1];
          currentPrUrl = prMatch[2];
        }

        // Clean out the leading bullet marker
        const content = trimmedLine.replace(/^[*+-]\s+/, '');
        currentItemText = content;
      } else if (currentItemText.length > 0 && trimmedLine.length > 0) {
        // Continuation of current item
        currentItemText += ' ' + trimmedLine;
      }
    }

    flushItem();
    return items;
  }
}
