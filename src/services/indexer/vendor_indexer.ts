import fs from 'node:fs';
import path from 'node:path';
import { TreeSitterStripeIndexer, ExtractedCallSite } from './tree_sitter_indexer.js';

export interface VendorCallSite extends ExtractedCallSite { vendor: 'stripe'; symbol: string; }

export class VendorIndexer {
  private stripe = new TreeSitterStripeIndexer();

  findFiles(root: string): string[] {
    if (!fs.existsSync(root)) return [];
    return fs.readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
      if (['node_modules', '.git', 'dist', '.next'].includes(entry.name)) return [];
      const full = path.join(root, entry.name);
      if (entry.isDirectory()) return this.findFiles(full);
      return /\.(ts|tsx)$/.test(entry.name) ? [full] : [];
    });
  }

  index(root: string): VendorCallSite[] {
    const sites: VendorCallSite[] = [];
    for (const file of this.findFiles(root)) {
      const relative = path.relative(root, file).replace(/\\/g, '/');
      const code = fs.readFileSync(file, 'utf8');
      const stripeSites = this.stripe.indexSourceCode(code, relative).map((s) => ({ ...s, vendor: 'stripe' as const, symbol: s.stripeSymbol }));
      sites.push(...stripeSites);
    }
    return sites;
  }
}
