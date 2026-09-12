import { Vendor } from '../detector/exa_detector.js';
import { GoogleGenAI } from '@google/genai';

export interface GeminiFix { oldText: string; newText: string; rationale: string; }

function extractJson(text: string): any {
  if (!text) return null;
  const cleaned = text
    .replace(/```json\s*/gi, '')
    .replace(/```\s*$/g, '')
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start !== -1 && end > start) {
      try {
        return JSON.parse(cleaned.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

/** Gemini-backed minimal patch generation and conversational revision. */
export class GeminiFixGenerator {
  private readonly model = process.env.GEMINI_FIX_MODEL || 'gemini-3.6-flash';

  async generate(input: { vendor: Vendor; symbol: string; summary: string; filePath: string; line: string }): Promise<GeminiFix | null> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return null;
    try {
      const client = new GoogleGenAI({ apiKey });
      const response = await client.models.generateContent({
        model: this.model,
        contents: `You are a senior TypeScript migration engineer. Return ONLY JSON with oldText, newText, rationale. Replace exactly one source line.\nVendor: ${input.vendor}\nAffected symbol: ${input.symbol}\nUpstream signal: ${input.summary}\nFile: ${input.filePath}\nLine: ${input.line}`,
        config: { responseMimeType: 'application/json', temperature: 0.1 },
      });
      const parsed = extractJson(response.text || '');
      if (!parsed || typeof parsed.oldText !== 'string' || typeof parsed.newText !== 'string') return null;
      return { oldText: parsed.oldText, newText: parsed.newText, rationale: parsed.rationale || 'Gemini-generated migration.' };
    } catch (err) {
      console.warn('Gemini generate failed:', err);
      return null;
    }
  }

  async revise(input: { vendor: Vendor; symbol: string; sourceLine: string; currentLine: string; instruction: string }): Promise<{ newText: string; rationale: string; reply: string } | null> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return null;
    try {
      const client = new GoogleGenAI({ apiKey });
      const response = await client.models.generateContent({
        model: this.model,
        contents: `You are reviewing a minimal TypeScript migration. Return ONLY JSON with newText, rationale, reply. Preserve the intent and return one complete line of code.\nVendor: ${input.vendor}\nAffected API: ${input.symbol}\nOriginal source line: ${input.sourceLine}\nCurrent proposed line: ${input.currentLine}\nReviewer instruction: ${input.instruction}`,
        config: { responseMimeType: 'application/json', temperature: 0.15 },
      });
      const parsed = extractJson(response.text || '');
      if (!parsed || typeof parsed.newText !== 'string') return null;
      return { newText: parsed.newText, rationale: parsed.rationale || 'Updated after reviewer feedback.', reply: parsed.reply || 'I updated the proposed patch.' };
    } catch (err) {
      console.warn('Gemini revise failed:', err);
      return null;
    }
  }
}
