import { GoogleGenAI } from '@google/genai';
import { CorrelatedMatch } from '../matcher/matching_engine.js';

export interface GeminiFixResult {
  diff: string;
  rationale: string;
  documentationUrl: string;
  suggestedBranchName: string;
  prTitle: string;
}

export class GeminiService {
  private client: GoogleGenAI | null = null;

  constructor() {
    this.reloadClient();
  }

  public reloadClient(): void {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey && apiKey.trim().length > 0) {
      try {
        this.client = new GoogleGenAI({ apiKey: apiKey.trim() });
      } catch (err) {
        console.warn('Failed to initialize GoogleGenAI client:', err);
        this.client = null;
      }
    } else {
      this.client = null;
    }
  }

  public isConfigured(): boolean {
    const key = process.env.GEMINI_API_KEY;
    return Boolean(key && key.trim().length > 0);
  }

  /**
   * Synthesize a precision migration diff and engineering rationale using Gemini
   */
  public async generateMigrationFix(match: CorrelatedMatch): Promise<GeminiFixResult | null> {
    if (!this.client && this.isConfigured()) {
      this.reloadClient();
    }

    if (!this.client) {
      return null;
    }

    const prompt = `You are Amulet's Principal Stripe SDK Migration Engineer.
A breaking change has been detected in a user's TypeScript codebase. Analyze the upstream Stripe changelog and the affected code snippet, then generate a production-ready unified diff and a concise, high-value technical rationale.

UPSTREAM STRIPE CHANGELOG:
- Symbol: ${match.affectedSymbol}
- Change Type: ${match.changeType}
- Changelog Description: ${match.rawText}
- Official Spec URL: ${match.sourceUrl}

USER CODEBASE CALL SITE:
- File Path: ${match.filePath}
- Line Number: ${match.lineNumber}
- AST Matched Symbol: ${match.stripeSymbol}
- Code Snippet:
\`\`\`typescript
${match.snippet}
\`\`\`

INSTRUCTIONS:
1. Provide a unified git diff (patch format with --- a/... and +++ b/...) that migrates this deprecated/breaking call site to the official modern Stripe Node SDK equivalent.
   - For direct charges.create -> paymentIntents.create with confirm: true and payment_method.
   - For sources/tokens -> paymentMethods/setupIntents.
   - For method signature changes -> update options/parameters according to Stripe spec.
2. Provide a clear, professional technical rationale explaining WHY this change is required and HOW it protects production checkout and customer billing from outage.
3. Suggest a git branch name (e.g. amulet/migrate-stripe-...) and a clear GitHub PR title.

Return your response strictly as valid JSON matching this schema:
{
  "diff": "string (unified git diff)",
  "rationale": "string (2-3 sentences)",
  "suggestedBranchName": "string",
  "prTitle": "string"
}`;

    try {
      const response = await this.client.models.generateContent({
        model: process.env.GEMINI_FIX_MODEL || 'gemini-3.6-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.2,
        },
      });

      const text = response.text;
      if (!text) return null;

      const parsed = JSON.parse(text);
      return {
        diff: parsed.diff || '',
        rationale: parsed.rationale || '',
        documentationUrl: match.sourceUrl,
        suggestedBranchName: parsed.suggestedBranchName || `amulet/fix-${match.affectedSymbol.replace(/[^a-zA-Z0-9]/g, '-')}`,
        prTitle: parsed.prTitle || `fix(stripe): migrate deprecated ${match.affectedSymbol}`,
      };
    } catch (err) {
      console.warn('Gemini generateMigrationFix error, falling back to AST rule engine:', err);
      return null;
    }
  }
}

export const geminiService = new GeminiService();
