import crypto from 'node:crypto';

export type Vendor = 'stripe';
export type ChangeType = 'deprecation' | 'removal' | 'signature_change';

export interface BreakingSignal {
  id: string;
  vendor: Vendor;
  affectedSymbol: string;
  changeType: ChangeType;
  summary: string;
  sourceUrl: string;
  confidence: number;
  live: boolean;
}

const SEEDED: Record<Vendor, BreakingSignal> = {
  stripe: {
    id: 'seed-stripe-sources', vendor: 'stripe', affectedSymbol: 'stripe.sources.create',
    changeType: 'deprecation',
    summary: 'Stripe Sources is a legacy integration. Stripe recommends PaymentMethods and SetupIntents for new integrations.',
    sourceUrl: 'https://docs.stripe.com/sources', confidence: 0.96, live: false,
  },
};

export class ExaDetector {
  constructor(private readonly apiKey = process.env.EXA_API_KEY) {}

  async detect(vendor: Vendor, live = true): Promise<BreakingSignal> {
    const seed = { ...SEEDED[vendor] };
    if (!live || !this.apiKey) return seed;
    try {
      const response = await fetch('https://api.exa.ai/search', {
        method: 'POST', headers: { 'content-type': 'application/json', 'x-api-key': this.apiKey },
        body: JSON.stringify({
          query: `${vendor} deprecated OR "breaking change" Node.js SDK`,
          type: 'auto', numResults: 10, contents: { highlights: { maxCharacters: 1200 } },
        }),
      });
      if (!response.ok) throw new Error(`Exa HTTP ${response.status}`);
      const data: any = await response.json();
      const result = (data.results || []).find((r: any) => {
        const text = `${r.title || ''} ${r.highlight || ''} ${r.text || ''}`.toLowerCase();
        return text.includes(vendor) && /(deprecat|breaking|remove|migration)/.test(text);
      });
      if (!result) return seed;
      return {
        ...seed, id: crypto.createHash('sha1').update(result.url || seed.id).digest('hex').slice(0, 16),
        summary: result.highlight || result.text || seed.summary,
        sourceUrl: result.url || seed.sourceUrl, confidence: 0.82, live: true,
      };
    } catch (error) {
      console.warn('Exa unavailable; using the deterministic demo signal:', error);
      return seed;
    }
  }
}

export const seededSignals = SEEDED;
