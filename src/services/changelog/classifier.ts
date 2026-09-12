import { ChangeType, ClassifiedChange, ParsedChangeItem } from './types.js';

export class ChangelogClassifier {
  private anthropicApiKey?: string;

  constructor(options?: { anthropicApiKey?: string }) {
    this.anthropicApiKey = options?.anthropicApiKey || process.env.ANTHROPIC_API_KEY;
  }

  /**
   * Classifies a parsed changelog item into breaking vs non-breaking,
   * categorizes the change type, and extracts the affected Stripe symbol.
   */
  async classify(item: ParsedChangeItem): Promise<ClassifiedChange> {
    // 1. Try deterministic AST/rule classification first (fast, reliable, zero latency)
    const ruleResult = this.classifyByRules(item.raw_text);

    // 2. If ambiguous or if high precision is requested and LLM key is configured,
    // we can invoke Claude API for edge cases
    if (this.anthropicApiKey && ruleResult.confidence < 0.8) {
      try {
        const llmResult = await this.classifyWithLLM(item.raw_text);
        if (llmResult) {
          return llmResult;
        }
      } catch (err) {
        console.warn('LLM classification failed, falling back to rule classifier:', err);
      }
    }

    return ruleResult;
  }

  /**
   * Deterministic rule-based classification based on Stripe's changelog syntax patterns
   */
  classifyByRules(text: string): ClassifiedChange {
    const clean = text.replace(/`([^`]+)`/g, '$1');

    // --- 1. Removals ---
    // Example: "Remove support for cryptogram on PaymentAttemptRecord..."
    // Example: "⚠️ Remove support for `proof_of_registration` on `AccountCreateParams.documents`"
    const removeMatch = clean.match(/(?:⚠️\s*)?Remove support for\s+([a-zA-Z0-9_]+)\s+on\s+([a-zA-Z0-9_.\[\]]+)/i);
    if (removeMatch) {
      const field = removeMatch[1].replace(/\.+$/, '');
      const rawTarget = removeMatch[2].split(/\s+and\s+/)[0].replace(/\[\]/g, '').replace(/\.+$/, '');
      const symbol = rawTarget.endsWith(`.${field}`) ? rawTarget : `${rawTarget}.${field}`;
      return {
        is_breaking: true,
        change_type: 'removal',
        affected_symbol: symbol,
        reason: `Removed support for field '${field}' on '${rawTarget}'`,
        confidence: 0.98,
      };
    }

    // Generic removal
    const genericRemoveMatch = clean.match(/Remove unused\s+([a-zA-Z0-9_.\-]+)/i);
    if (genericRemoveMatch) {
      const sym = genericRemoveMatch[1].replace(/\.+$/, '');
      return {
        is_breaking: true,
        change_type: 'removal',
        affected_symbol: sym,
        reason: `Removed unused feature '${sym}'`,
        confidence: 0.95,
      };
    }

    const dropSupportMatch = clean.match(/Drop support for\s+([a-zA-Z0-9_.\s]+)/i);
    if (dropSupportMatch) {
      const sym = dropSupportMatch[1].trim().replace(/\.+$/, '');
      return {
        is_breaking: true,
        change_type: 'removal',
        affected_symbol: sym,
        reason: `Dropped runtime support: ${sym}`,
        confidence: 0.95,
      };
    }

    // --- 2. Deprecations ---
    // Example: "...is being deprecated"
    if (/is being deprecated|deprecated/i.test(clean) && !/Add support for/i.test(clean)) {
      const symbol = this.extractFirstSymbol(clean) || 'Stripe';
      return {
        is_breaking: true,
        change_type: 'deprecation',
        affected_symbol: symbol,
        reason: 'Feature or parameter is deprecated',
        confidence: 0.90,
      };
    }

    // --- 3. Signature & Type Changes (Breaking) ---
    // Example: "Change PaymentIntent.allowed_payment_method_types to be required"
    const requiredMatch = clean.match(/Change\s+([a-zA-Z0-9_.\[\]]+)(?:\s+and\s+[a-zA-Z0-9_.\[\]]+)*\s+to be required/i);
    if (requiredMatch) {
      const symbol = requiredMatch[1].replace(/\[\]/g, '').replace(/\.+$/, '');
      return {
        is_breaking: true,
        change_type: 'signature_change',
        affected_symbol: symbol,
        reason: `Field '${symbol}' changed from optional to required`,
        confidence: 0.99,
      };
    }

    // Example: "Change type of Checkout.SessionCreateParams.payment_method_options.twint.setup_future_usage... from literal('none') to enum"
    const typeChangeMatch = clean.match(/Change type of\s+([a-zA-Z0-9_.\[\]]+)/i);
    if (typeChangeMatch) {
      const symbol = typeChangeMatch[1].replace(/\[\]/g, '').replace(/\.+$/, '');
      return {
        is_breaking: true,
        change_type: 'signature_change',
        affected_symbol: symbol,
        reason: `Type definition changed for '${symbol}'`,
        confidence: 0.95,
      };
    }

    // Example: "Export HttpClient types as interfaces instead of classes"
    const exportInterfaceMatch = clean.match(/Export\s+([a-zA-Z0-9_.]+)\s+types as interfaces instead of classes/i);
    if (exportInterfaceMatch) {
      const sym = exportInterfaceMatch[1].replace(/\.+$/, '');
      return {
        is_breaking: true,
        change_type: 'signature_change',
        affected_symbol: sym,
        reason: `Types exported as interfaces instead of classes for ${sym}`,
        confidence: 0.92,
      };
    }

    // Example: "Throw an error when using the wrong webhook parsing method"
    if (/Throw an error when|Throws when/i.test(clean)) {
      const symbol = clean.includes('webhook') ? 'stripe.webhooks.constructEvent' : this.extractFirstSymbol(clean) || 'Stripe';
      return {
        is_breaking: true,
        change_type: 'signature_change',
        affected_symbol: symbol,
        reason: 'Throws error under conditions previously permitted or unhandled',
        confidence: 0.88,
      };
    }

    // Explicit breaking change prefix: "⚠️ **Breaking change:**"
    if (/⚠️\s*\*\*Breaking change:\*\*/i.test(text) || /Breaking change/i.test(clean)) {
      const symbol = this.extractFirstSymbol(clean) || 'Stripe';
      return {
        is_breaking: true,
        change_type: 'signature_change',
        affected_symbol: symbol,
        reason: 'Explicitly flagged as a breaking change in release notes',
        confidence: 0.92,
      };
    }

    // --- 4. Non-breaking features & updates ---
    // Example: "Change X to be optional" (Relaxing constraint is backwards compatible!)
    if (/to be optional/i.test(clean)) {
      const symbol = this.extractFirstSymbol(clean) || 'Stripe';
      return {
        is_breaking: false,
        change_type: 'signature_change',
        affected_symbol: symbol,
        reason: 'Parameter or field changed to optional (backwards compatible)',
        confidence: 0.95,
      };
    }

    // Example: "Add support for new resource Billing.FeedbackOption"
    // Example: "Add support for `xyz` on `Account.company`"
    // Example: "Add support for 'create', 'retrieve' methods on resource..."
    if (/^Add support for/i.test(clean) || /Add support for new/i.test(clean)) {
      const symbol = this.extractFirstSymbol(clean) || 'Stripe';
      return {
        is_breaking: false,
        change_type: 'signature_change',
        affected_symbol: symbol,
        reason: 'Additive feature or new field support (backwards compatible)',
        confidence: 0.98,
      };
    }

    // Fixes, patches, docstrings, security hardening
    if (/^Fix |^Fixes |^Harden |^Bump |^Emit |docstring/i.test(clean)) {
      const symbol = this.extractFirstSymbol(clean) || 'Stripe';
      return {
        is_breaking: false,
        change_type: 'signature_change',
        affected_symbol: symbol,
        reason: 'Bugfix, maintenance, or internal patch',
        confidence: 0.95,
      };
    }

    // Default fallback
    const symbol = this.extractFirstSymbol(clean) || 'Stripe';
    return {
      is_breaking: false,
      change_type: 'signature_change',
      affected_symbol: symbol,
      reason: 'General non-breaking change or update',
      confidence: 0.70,
    };
  }

  /**
   * Helper to extract the most qualified Stripe symbol (PascalCase or dotted path) from text
   */
  private extractFirstSymbol(text: string): string | null {
    // Look for dotted identifiers like Billing.FeedbackOption, stripe.charges.create, PaymentIntentCreateParams
    const matches = text.match(/\b([A-Z][a-zA-Z0-9]+(?:\.[a-zA-Z0-9_]+)+)\b/) ||
                    text.match(/\b(stripe\.[a-zA-Z0-9_.]+)\b/) ||
                    text.match(/\b([A-Z][a-zA-Z0-9]+(?:Params|Session|Intent|Item|Record))\b/);
    if (matches) {
      return matches[1].replace(/\[\]/g, '');
    }
    return null;
  }

  /**
   * Optional LLM classifier via Claude API for complex or ambiguous release items
   */
  private async classifyWithLLM(text: string): Promise<ClassifiedChange | null> {
    if (!this.anthropicApiKey) return null;

    const prompt = `You are a static analysis breaking change classifier for the Stripe Node.js/TypeScript SDK.
Analyze the following changelog item:
"""${text}"""

Determine:
1. is_breaking: boolean (true if existing customer TypeScript code or runtime execution will fail or change behavior unexpectedly; false if it's backwards-compatible, additive, or internal fix)
2. change_type: "deprecation" | "removal" | "signature_change"
3. affected_symbol: the exact Stripe SDK method, class, interface, or parameter path (e.g. "PaymentIntent.allowed_payment_method_types", "stripe.charges.create", "Stripe.HttpClient")
4. reason: brief explanation (1 sentence)

Respond with ONLY raw valid JSON:
{
  "is_breaking": boolean,
  "change_type": "deprecation" | "removal" | "signature_change",
  "affected_symbol": string,
  "reason": string
}`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.anthropicApiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 300,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      throw new Error(`Claude API returned status ${response.status}`);
    }

    const data: any = await response.json();
    const content = data.content?.[0]?.text;
    if (content) {
      const parsed = JSON.parse(content.trim());
      return {
        is_breaking: !!parsed.is_breaking,
        change_type: parsed.change_type || 'signature_change',
        affected_symbol: parsed.affected_symbol || 'Stripe',
        reason: parsed.reason || 'Classified by Claude LLM',
        confidence: 0.95,
      };
    }
    return null;
  }
}
