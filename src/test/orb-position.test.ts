import { describe, expect, it } from 'vitest';
import { boundOrbPosition } from '@/lib/orb-position';

describe('floating button position', () => {
  it('keeps the full button inside the phone screen', () => {
    expect(boundOrbPosition(-80, 900, 393, 700)).toEqual({ x: 12, y: 632 });
    expect(boundOrbPosition(900, -80, 393, 700)).toEqual({ x: 325, y: 12 });
  });
  it('preserves a freely chosen position', () => {
    expect(boundOrbPosition(150, 240, 393, 700)).toEqual({ x: 150, y: 240 });
  });
});