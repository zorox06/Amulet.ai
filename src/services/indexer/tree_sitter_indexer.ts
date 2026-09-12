let ParserClass: any = null;
let TypeScript: any = null;
let TSX: any = null;
let treeSitterAvailable = false;

try {
  ParserClass = require('tree-sitter');
  const tsModule = require('tree-sitter-typescript');
  TypeScript = (tsModule as any).typescript;
  TSX = (tsModule as any).tsx;
  treeSitterAvailable = Boolean(ParserClass && TypeScript);
} catch {
  treeSitterAvailable = false;
}

export interface ExtractedCallSite {
  filePath: string;
  lineNumber: number;
  stripeSymbol: string;
  snippet: string;
  nodeType: string;
}

export class TreeSitterStripeIndexer {
  private tsParser?: any;
  private tsxParser?: any;

  constructor() {
    if (treeSitterAvailable && ParserClass) {
      try {
        this.tsParser = new ParserClass();
        this.tsParser.setLanguage(TypeScript);

        this.tsxParser = new ParserClass();
        this.tsxParser.setLanguage(TSX);
      } catch {
        treeSitterAvailable = false;
      }
    }
  }

  /**
   * Parses TypeScript/TSX code and extracts all Stripe call sites and type usages.
   */
  indexSourceCode(code: string, filePath = 'file.ts'): ExtractedCallSite[] {
    if (!treeSitterAvailable || !this.tsParser) {
      return this.fallbackRegexIndex(code, filePath);
    }

    const isTsx = filePath.endsWith('.tsx');
    const parser = isTsx ? this.tsxParser : this.tsParser;
    const tree = parser.parse(code);

    const callSites: ExtractedCallSite[] = [];
    const lines = code.split('\n');

    // 1. First Pass: Identify Stripe import identifiers (default, named, or aliased)
    // E.g. import Stripe from 'stripe' => 'Stripe'
    // E.g. import MyStripe from 'stripe' => 'MyStripe'
    // E.g. const Stripe = require('stripe') => 'Stripe'
    const stripeImportNames = new Set<string>();
    const stripeInstanceNames = new Set<string>();

    this.findStripeImportsAndInstances(tree.rootNode, stripeImportNames, stripeInstanceNames);

    // If no Stripe import found, also check if common naming like `stripe` or `stripeClient`
    // is used with known Stripe namespaces (to handle wrapped helper modules)
    if (stripeInstanceNames.size === 0) {
      stripeInstanceNames.add('stripe');
      stripeInstanceNames.add('stripeClient');
    }

    // 2. Second Pass: Walk AST to find call expressions and property accesses
    const visit = (node: any) => {
      // Check Call Expressions: e.g. stripe.charges.create(...) or this.stripe.refunds.create(...)
      if (node.type === 'call_expression') {
        const functionNode = node.childForFieldName('function');
        if (functionNode) {
          const fullPath = this.resolveMemberExpressionPath(functionNode);
          if (fullPath) {
            let parts = fullPath.split('.');
            let isThisCall = false;

            if (parts[0] === 'this' && parts.length > 1) {
              isThisCall = true;
              parts = parts.slice(1); // ['stripe', 'refunds', 'create']
            }

            // A Stripe SDK API call is always a member expression (e.g. stripe.charges.create or client.customers.list)
            if (parts.length < 2) {
              return;
            }

            const rootIdentifier = parts[0];

            // Match if root is a known Stripe instance or constructor or common Stripe name
            const isStripeInstance =
              stripeInstanceNames.has(rootIdentifier) ||
              stripeInstanceNames.has(`this.${rootIdentifier}`) ||
              rootIdentifier === 'stripe' ||
              rootIdentifier === 'stripeClient';

            const isStripeImport = stripeImportNames.has(rootIdentifier);

            if (isStripeInstance || isStripeImport) {
              // Normalize canonical symbol: e.g. "customClient.customers.create" or "this.stripe.refunds.create" -> "stripe.refunds.create"
              const normalizedSymbol = isStripeImport && !isStripeInstance
                ? fullPath
                : `stripe.${parts.slice(1).join('.')}`;

              const lineNumber = node.startPosition.row + 1;
              const snippet = lines[node.startPosition.row]?.trim() || node.text;

              callSites.push({
                filePath,
                lineNumber,
                stripeSymbol: normalizedSymbol,
                snippet,
                nodeType: 'call_expression',
              });
            }
          }
        }
      }

      // Check Type References: e.g. Stripe.PaymentIntentCreateParams, Stripe.Checkout.Session
      if (node.type === 'type_identifier' || node.type === 'nested_type_identifier') {
        const typeText = node.text;
        for (const importName of stripeImportNames) {
          if (typeText.startsWith(`${importName}.`)) {
            const lineNumber = node.startPosition.row + 1;
            const snippet = lines[node.startPosition.row]?.trim() || node.text;
            callSites.push({
              filePath,
              lineNumber,
              stripeSymbol: typeText,
              snippet,
              nodeType: 'type_reference',
            });
          }
        }
      }

      for (let i = 0; i < node.childCount; i++) {
        const child = node.child(i);
        if (child) visit(child);
      }
    };

    visit(tree.rootNode);

    // Deduplicate by line number and symbol
    const seen = new Set<string>();
    return callSites.filter((cs) => {
      const key = `${cs.lineNumber}::${cs.stripeSymbol}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  /**
   * Traverses AST to find identifiers imported from 'stripe' or constructed with `new Stripe(...)`
   */
  private findStripeImportsAndInstances(
    rootNode: any,
    importNames: Set<string>,
    instanceNames: Set<string>
  ) {
    const walk = (node: any) => {
      // ES Import: import Stripe from 'stripe' or import MyStripe from 'stripe'
      if (node.type === 'import_statement') {
        const source = node.childForFieldName('source');
        if (source && (source.text === "'stripe'" || source.text === '"stripe"')) {
          // Find default import or namespace
          for (let i = 0; i < node.childCount; i++) {
            const child = node.child(i);
            if (child?.type === 'identifier') {
              importNames.add(child.text);
            } else if (child?.type === 'import_clause') {
              for (let j = 0; j < child.childCount; j++) {
                const sub = child.child(j);
                if (sub?.type === 'identifier') {
                  importNames.add(sub.text);
                }
              }
            }
          }
        }
      }

      // CommonJS Require: const stripe = require('stripe')('key') or const Stripe = require('stripe')
      if (node.type === 'variable_declarator') {
        const nameNode = node.childForFieldName('name');
        const valueNode = node.childForFieldName('value');

        if (nameNode && valueNode) {
          const valText = valueNode.text;
          if (valText.includes("require('stripe')") || valText.includes('require("stripe")')) {
            if (valueNode.type === 'call_expression' && valText.includes("require('stripe')(")) {
              // Direct instantiation: const stripe = require('stripe')(key)
              instanceNames.add(nameNode.text);
            } else {
              importNames.add(nameNode.text);
            }
          }

          // New expression: const stripe = new Stripe(key) or new MyStripe(key)
          if (valueNode.type === 'new_expression') {
            const constructor = valueNode.childForFieldName('constructor');
            if (constructor && (constructor.text === 'Stripe' || importNames.has(constructor.text))) {
              instanceNames.add(nameNode.text);
            }
          }

          // Simple alias: const paymentsClient = stripe. This keeps one-layer wrapper
          // patterns visible to the static demo without treating arbitrary variables as SDKs.
          if (valueNode.type === 'identifier' && instanceNames.has(valueNode.text)) {
            instanceNames.add(nameNode.text);
          }
        }
      }

      // Class property instantiation: private stripe = new Stripe(key)
      if (node.type === 'public_field_definition' || node.type === 'field_definition') {
        const propName = node.childForFieldName('property');
        const value = node.childForFieldName('value');
        if (propName && value && value.type === 'new_expression') {
          const constructor = value.childForFieldName('constructor');
          if (constructor && (constructor.text === 'Stripe' || importNames.has(constructor.text))) {
            instanceNames.add(propName.text);
            instanceNames.add(`this.${propName.text}`);
          }
        }
      }

      for (let i = 0; i < node.childCount; i++) {
        const child = node.child(i);
        if (child) walk(child);
      }
    };

    walk(rootNode);
  }

  /**
   * Helper to recursively reconstruct dotted member expression paths
   * e.g. `stripe.charges.create` from member_expression nodes
   */
  private resolveMemberExpressionPath(node: any): string | null {
    if (node.type === 'identifier' || node.type === 'this') {
      return node.text;
    }
    if (node.type === 'member_expression') {
      const objectNode = node.childForFieldName('object');
      const propertyNode = node.childForFieldName('property');
      if (objectNode && propertyNode) {
        const objPath = this.resolveMemberExpressionPath(objectNode);
        if (objPath) {
          return `${objPath}.${propertyNode.text}`;
        }
      }
    }
    return null;
  }

  /**
   * High-precision regex pattern fallback for environments where native Tree-sitter bindings are not loaded.
   */
  private fallbackRegexIndex(code: string, filePath: string): ExtractedCallSite[] {
    const callSites: ExtractedCallSite[] = [];
    const lines = code.split('\n');
    const pattern = /(?:(?:\bthis\.)?(?:stripe|paymentsClient|paymentGateway|client|stripeClient)\.([a-zA-Z0-9_$]+)\.([a-zA-Z0-9_$]+)\s*\()/g;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      pattern.lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = pattern.exec(line)) !== null) {
        const fullCall = match[0].replace(/\s*\($/, '');
        const normalized = fullCall.replace(/^this\./, '');
        callSites.push({
          filePath,
          lineNumber: i + 1,
          stripeSymbol: normalized.startsWith('stripe.') ? normalized : `stripe.${match[1]}.${match[2]}`,
          snippet: line.trim(),
          nodeType: 'call_expression',
        });
      }
    }
    return callSites;
  }
}
