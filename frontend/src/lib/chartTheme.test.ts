import { describe, expect, it } from 'vitest';
import { chartAxisColors, chartBarFill, chartGridColor, chartTooltipStyle } from './chartTheme';

describe('chartBarFill', () => {
  it('uses green for strong scores', () => {
    expect(chartBarFill(80, false)).toBe('#87A96B');
    expect(chartBarFill(100, true)).toBe('#a3c97a');
  });

  it('uses pink for mid scores', () => {
    expect(chartBarFill(60, false)).toBe('#FADADD');
    expect(chartBarFill(79, true)).toBe('#f5b8c0');
  });

  it('uses orange/red for low scores', () => {
    expect(chartBarFill(59, false)).toBe('#fca5a5');
    expect(chartBarFill(0, true)).toBe('#fb923c');
  });
});

describe('chart theme helpers', () => {
  it('returns distinct axis and grid colors for light and dark', () => {
    expect(chartAxisColors(true)).not.toBe(chartAxisColors(false));
    expect(chartGridColor(true)).not.toBe(chartGridColor(false));
  });

  it('builds tooltip styles for both modes', () => {
    const light = chartTooltipStyle(false);
    const dark = chartTooltipStyle(true);
    expect(light.contentStyle.backgroundColor).toContain('255');
    expect(dark.contentStyle.backgroundColor).toContain('51');
    expect(light.labelStyle.fontWeight).toBe(800);
  });
});
