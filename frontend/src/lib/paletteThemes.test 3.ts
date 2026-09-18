import { describe, expect, it } from 'vitest';
import {
  DEFAULT_PALETTE_ID,
  getPalette,
  isPaletteId,
  PALETTE_ORDER,
  PALETTE_THEMES,
} from './paletteThemes';

describe('paletteThemes', () => {
  it('defines all seven experiment palettes', () => {
    expect(PALETTE_ORDER).toHaveLength(7);
    for (const id of PALETTE_ORDER) {
      expect(PALETTE_THEMES[id].id).toBe(id);
      expect(PALETTE_THEMES[id].cream).toMatch(/^#/);
      expect(PALETTE_THEMES[id].sageGreen).toMatch(/^#/);
    }
  });

  it('validates palette ids', () => {
    expect(isPaletteId('linear')).toBe(true);
    expect(isPaletteId('nope')).toBe(false);
    expect(getPalette(DEFAULT_PALETTE_ID).name).toContain('Linear');
  });
});
