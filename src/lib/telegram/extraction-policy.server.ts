import { APICallError } from 'ai';

export const lovableCreditPause = 'lovable:402 — Créditos de IA do Lovable esgotados.';

export class ExtractionProviderError extends Error {
  constructor(public readonly provider: 'lovable' | 'gemini', public readonly statusCode: number | undefined, message: string) {
    super(message);
    this.name = 'ExtractionProviderError';
  }
}

// Streaming SDK errors can wrap the original HTTP failure in cause.
export function extractionHttpStatus(error: unknown): number | undefined {
  const seen = new Set<unknown>();
  for (let depth = 0; depth < 6 && error && typeof error === 'object' && !seen.has(error); depth++) {
    seen.add(error);
    if (error instanceof ExtractionProviderError || APICallError.isInstance(error)) return error.statusCode;
    error = 'cause' in error ? error.cause : undefined;
  }
  return undefined;
}

export function isLovableCreditPause(reason: string | null | undefined) {
  return Boolean(reason && (/^lovable:402\b/.test(reason) || /\b402\b|not enough credits|créditos.*esgotad/i.test(reason)));
}

export async function withCreditFallback<T>(primary: () => Promise<T>, fallback: () => Promise<T>, options: {
  geminiAvailable: boolean; geminiOnly?: boolean; onLovableCreditsExhausted?: () => Promise<void>;
}): Promise<T> {
  if (options.geminiOnly) {
    if (!options.geminiAvailable) throw new Error('Gemini não configurado. Confira o documento manualmente.');
    return fallback();
  }
  try { return await primary(); }
  catch (error) {
    if (extractionHttpStatus(error) !== 402) throw error;
    await options.onLovableCreditsExhausted?.();
    if (!options.geminiAvailable) throw new ExtractionProviderError('lovable', 402, 'Créditos de IA do Lovable esgotados. Confira o documento manualmente.');
    return fallback();
  }
}
