import { describe, expect, it } from 'vitest';
import {
  DEFAULT_PALETTE_ID,
  getPalette,
  isPaletteId,
  PALETTE_ORDER,
  PALETTE_THEMES,
} from './paletteThemes';

describe('paletteThemes', () => {
  it('defines all experiment palettes', () => {
    expect(PALETTE_ORDER).toHaveLength(8);
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

  it('defines Sleek Salmon Scroll as flat editorial geometry', () => {
    const salmon = getPalette('salmon');
    expect(salmon.name).toBe('Sleek Salmon Scroll');
    expect(salmon.cream).toBe('#FFF5F2');
    expect(salmon.surface).toBe('#FDE8E3');
    expect(salmon.sageGreen).toBe('#FF7A59');
    expect(salmon.softPink).toBe('#E05A47');
    expect(salmon.text).toBe('#2D221E');
    expect(salmon.mutedText).toBe('#555555');
    expect(salmon.border).toBe('#F8D8D0');
    expect(salmon.radiusCard).toBe('0px');
    expect(salmon.radiusButton).toBe('0px');
    expect(salmon.shadow).toBe('none');
  });
});
