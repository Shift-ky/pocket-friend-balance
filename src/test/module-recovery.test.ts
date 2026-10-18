import { describe, expect, it } from 'vitest';
import { isModuleLoadError } from '@/lib/module-recovery';

describe('Temporary module loading failures', () => {
  it('recognizes Firefox dynamic import failures', () => {
    expect(isModuleLoadError(new Error('error loading dynamically imported module: https://example.test/src/lib/precos-feira.ts'))).toBe(true);
  });
  it('recognizes Chromium dynamic import failures', () => {
    expect(isModuleLoadError(new TypeError('Failed to fetch dynamically imported module: https://example.test/module.js'))).toBe(true);
  });
  it('does not reload for unrelated application errors', () => {
    expect(isModuleLoadError(new Error('Sem acesso ao estoque'))).toBe(false);
  });
});