/** Recharts tooltip styles that work in light and dark mode */
export function chartTooltipStyle(isDark: boolean) {
  return {
    contentStyle: {
      borderRadius: '16px',
      border: isDark ? '1px solid rgb(100 116 139)' : 'none',
      backgroundColor: isDark ? 'rgb(51 65 85)' : 'rgb(255 255 255)',
      color: isDark ? 'rgb(248 250 252)' : 'rgb(15 23 42)',
      boxShadow: isDark ? '0 10px 25px rgb(0 0 0 / 0.5)' : '0 20px 25px -5px rgb(0 0 0 / 0.1)',
      fontWeight: 700,
    },
    cursor: { fill: isDark ? 'rgb(100 116 139 / 0.35)' : '#f8fafc' },
    labelStyle: { color: isDark ? 'rgb(226 232 240)' : 'rgb(100 116 139)', fontWeight: 800 },
    itemStyle: { color: isDark ? 'rgb(248 250 252)' : 'rgb(15 23 42)' },
  };
}

export function chartAxisColors(isDark: boolean) {
  return isDark ? '#cbd5e1' : '#64748b';
}

export function chartGridColor(isDark: boolean) {
  return isDark ? '#475569' : '#f1f5f9';
}

export function chartBarFill(score: number, isDark: boolean): string {
  if (score >= 80) return isDark ? '#a3c97a' : '#87A96B';
  if (score >= 60) return isDark ? '#f5b8c0' : '#FADADD';
  return isDark ? '#fb923c' : '#fca5a5';
}

export { useDarkMode as useIsDarkMode } from './theme';
