import { db } from '../../db/index.js';
import { CorrelatedMatch } from '../matcher/matching_engine.js';
import { geminiService } from '../ai/gemini_service.js';

export interface ProposedFix {
  matchId: string;
  diff: string;
  rationale: string;
  documentationUrl: string;
  suggestedBranchName: string;
  prTitle: string;
  generatedBy?: 'gemini' | 'ast-rules';
}

export class FixGenerator {
  /**
   * Synthesize a unified diff and explanatory rationale using Gemini AI if available,
   * falling back to the deterministic AST rule engine.
   */
  public async generateFixAsync(match: CorrelatedMatch): Promise<ProposedFix> {
    if (geminiService.isConfigured()) {
      try {
        const geminiResult = await geminiService.generateMigrationFix(match);
        if (geminiResult && geminiResult.diff && geminiResult.diff.trim().length > 0) {
          return {
            matchId: match.matchId,
            diff: geminiResult.diff,
            rationale: geminiResult.rationale,
            documentationUrl: geminiResult.documentationUrl || match.sourceUrl,
            suggestedBranchName: geminiResult.suggestedBranchName,
            prTitle: geminiResult.prTitle,
            generatedBy: 'gemini',
          };
        }
      } catch (err) {
        console.warn('Gemini fix synthesis failed, falling back to AST rule engine:', err);
      }
    }

    const fallbackFix = this.generateFix(match);
    return {
      ...fallbackFix,
      generatedBy: 'ast-rules',
    };
  }

  /**
   * Synthesize a unified diff and explanatory rationale for an affected call site (deterministic AST)
   */
  public generateFix(match: CorrelatedMatch): ProposedFix {
    const symbol = match.stripeSymbol.toLowerCase();
    const affected = match.affectedSymbol.toLowerCase();
    const snippet = match.snippet.trim();
    const branchName = `amulet/fix-${match.affectedSymbol.replace(/[^a-zA-Z0-9]/g, '-')}-${Date.now().toString().slice(-4)}`;
    const prTitle = `fix(stripe): migrate deprecated ${match.affectedSymbol} before breaking production`;

    let diff = '';
    let rationale = '';

    if (symbol.includes('charges.create') || affected.includes('charges.create')) {
      let migrated = snippet.replace(/(?:stripe|paymentsClient|this\.stripe)\.charges\.create\(/g, 'stripe.paymentIntents.create(');
      if (migrated.includes('source:')) {
        migrated = migrated.replace(/source:/g, 'payment_method:');
      } else if (/\bsource\b/.test(migrated)) {
        migrated = migrated.replace(/\bsource\b/g, 'payment_method: source');
      }
      migrated = migrated.replace(/\s*\}\s*\);/, ', confirm: true });');

      diff = `--- a/${match.filePath}
+++ b/${match.filePath}
@@ -${match.lineNumber},1 +${match.lineNumber},1 @@
-${snippet}
+${migrated}`;

      rationale = `Stripe deprecated direct charge creation in modern API versions. The recommended replacement is the PaymentIntents API (\`stripe.paymentIntents.create\`) with \`confirm: true\` and \`payment_method\`. This ensures full support for 3D Secure 2 and SCA authentication without payment failures.`;
    } else if (symbol.includes('sources.create') || affected.includes('sources.create')) {
      diff = `--- a/${match.filePath}
+++ b/${match.filePath}
@@ -${match.lineNumber},1 +${match.lineNumber},1 @@
-${snippet}
+${snippet.replace(/(?:stripe|paymentsClient|this\.stripe)\.sources\.create\(/g, 'stripe.paymentMethods.create(')}`;

      rationale = `Sources API has been superseded by PaymentMethods API. Use \`stripe.paymentMethods.create\` to attach modern payment methods and future-proof payment flows.`;
    } else if (symbol.includes('tokens.create') || affected.includes('tokens.create')) {
      diff = `--- a/${match.filePath}
+++ b/${match.filePath}
@@ -${match.lineNumber},1 +${match.lineNumber},1 @@
-${snippet}
+${snippet.replace(/(?:stripe|paymentsClient|this\.stripe)\.tokens\.create\(/g, 'stripe.paymentMethods.create(')}`;

      rationale = `Tokens are deprecated in favor of PaymentMethods and SetupIntents for PCI compliance and enhanced fraud prevention.`;
    } else {
      // Generic high-precision migration recommendation
      diff = `--- a/${match.filePath}
+++ b/${match.filePath}
@@ -${match.lineNumber},1 +${match.lineNumber},1 @@
-${snippet}
+/* TODO(Amulet): Review Stripe SDK upgrade */
+${snippet}`;

      rationale = `Stripe released a breaking change for \`${match.affectedSymbol}\` (${match.changeType}): "${match.rawText}". Please review the call site parameters to ensure compatibility with modern Stripe API releases.`;
    }

    return {
      matchId: match.matchId,
      diff,
      rationale,
      documentationUrl: match.sourceUrl,
      suggestedBranchName: branchName,
      prTitle,
    };
  }

  /**
   * Save generated fix in the database
   */
  public async saveFix(matchId: string, diff: string): Promise<string> {
    const fixId = `fix_${matchId}_${Date.now()}`;
    await db.query(
      `INSERT INTO fixes (id, match_id, generated_diff, pr_status)
       VALUES ($1, $2, $3, 'open')
       ON CONFLICT (id) DO UPDATE SET generated_diff = EXCLUDED.generated_diff, updated_at = NOW()`,
      [fixId, matchId, diff]
    );
    await db.query(`UPDATE matches SET status = 'fix_generated', updated_at = NOW() WHERE id = $1`, [matchId]);
    return fixId;
  }
}

export const fixGenerator = new FixGenerator();
