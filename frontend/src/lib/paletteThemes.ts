/** Experiment palettes for the color-palette branch (60/30/10 mapped onto app tokens). */

export type PaletteId =
  | 'valley-classic'
  | 'linear'
  | 'brilliant'
  | 'pro-dev'
  | 'salmon'
  | 'constructivism'
  | 'cozy-earth'
  | 'neubrutalism';

export type PaletteTheme = {
  id: PaletteId;
  name: string;
  vibe: string;
  /** 60% page background → --color-cream */
  cream: string;
  /** Secondary / highlight accent → --color-soft-pink */
  softPink: string;
  /** 10% primary accent → --color-sage-green */
  sageGreen: string;
  surface: string;
  text: string;
  mutedText: string;
  border: string;
  font: string;
  radiusCard: string;
  radiusButton: string;
  shadow: string;
  chartHigh: string;
  chartHighDark: string;
  chartMid: string;
  chartMidDark: string;
  darkCanvas?: boolean;
};

export const PALETTE_THEMES: Record<PaletteId, PaletteTheme> = {
  'valley-classic': {
    id: 'valley-classic',
    name: '0. Valley Science (current)',
    vibe: 'Original brand — cream, soft pink, sage',
    cream: '#FFFDD0',
    softPink: '#FADADD',
    sageGreen: '#87A96B',
    surface: '#FFFFFF',
    text: '#111827',
    mutedText: '#6B7280',
    border: '#FADADD',
    font: '"Inter", -apple-system, BlinkMacSystemFont, ui-sans-serif, system-ui, sans-serif',
    radiusCard: '16px',
    radiusButton: '12px',
    shadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
    chartHigh: '#87A96B',
    chartHighDark: '#a3c97a',
    chartMid: '#FADADD',
    chartMidDark: '#f5b8c0',
  },
  linear: {
    id: 'linear',
    name: '1. Authentic Linear / Notion',
    vibe: 'Hyper-minimalist, fiercely professional',
    cream: '#F7F8FA',
    softPink: '#E4E5E7',
    sageGreen: '#5E6AD2',
    surface: '#FFFFFF',
    text: '#111827',
    mutedText: '#6B7280',
    border: '#E4E5E7',
    font: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
    radiusCard: '8px',
    radiusButton: '6px',
    shadow: '0 4px 12px rgba(0,0,0,0.03), 0 1px 2px rgba(0,0,0,0.02)',
    chartHigh: '#5E6AD2',
    chartHighDark: '#8B93E6',
    chartMid: '#9CA3AF',
    chartMidDark: '#D1D5DB',
  },
  brilliant: {
    id: 'brilliant',
    name: '2. Authentic Brilliant.org',
    vibe: 'Optimistic, accessible EdTech',
    cream: '#F4F5F7',
    softPink: '#00B27A',
    sageGreen: '#0066FF',
    surface: '#FFFFFF',
    text: '#0F172A',
    mutedText: '#64748B',
    border: 'transparent',
    font: '"Nunito", system-ui, sans-serif',
    radiusCard: '20px',
    radiusButton: '999px',
    shadow: '0 4px 14px rgba(0,0,0,0.05), 0 12px 32px rgba(0,0,0,0.02)',
    chartHigh: '#0066FF',
    chartHighDark: '#60A5FA',
    chartMid: '#00B27A',
    chartMidDark: '#34D399',
  },
  'pro-dev': {
    id: 'pro-dev',
    name: '3. Authentic Pro Developer',
    vibe: 'GitHub / VS Code dark',
    cream: '#0D1117',
    softPink: '#58A6FF',
    sageGreen: '#238636',
    surface: '#161B22',
    text: '#E6EDF3',
    mutedText: '#8B949E',
    border: '#30363D',
    font: '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
    radiusCard: '6px',
    radiusButton: '6px',
    shadow: 'none',
    chartHigh: '#238636',
    chartHighDark: '#3FB950',
    chartMid: '#58A6FF',
    chartMidDark: '#79C0FF',
    darkCanvas: true,
  },
  salmon: {
    id: 'salmon',
    name: 'Sleek Salmon Scroll',
    vibe: 'Editorial elegance',
    cream: '#FFF5F2',
    softPink: '#E05A47',
    sageGreen: '#FF7A59',
    surface: '#FDE8E3',
    text: '#2D221E',
    mutedText: '#555555',
    border: '#F8D8D0',
    font: '"Inter", ui-sans-serif, system-ui, sans-serif',
    radiusCard: '0px',
    radiusButton: '0px',
    shadow: 'none',
    chartHigh: '#FF7A59',
    chartHighDark: '#E05A47',
    chartMid: '#F8A090',
    chartMidDark: '#FBC4B8',
  },
  constructivism: {
    id: 'constructivism',
    name: 'Constructivism',
    vibe: 'Industrial avant-garde',
    cream: '#F0F0F0',
    softPink: '#111111',
    sageGreen: '#E32636',
    surface: '#FFFFFF',
    text: '#111111',
    mutedText: '#333333',
    border: '#111111',
    font: 'Impact, "Arial Black", sans-serif',
    radiusCard: '0px',
    radiusButton: '0px',
    shadow: 'none',
    chartHigh: '#E32636',
    chartHighDark: '#FF4D5A',
    chartMid: '#111111',
    chartMidDark: '#444444',
  },
  'cozy-earth': {
    id: 'cozy-earth',
    name: 'Usable Cozy Earth',
    vibe: 'Warm organic software',
    cream: '#FDFBF7',
    softPink: '#D7C4B7',
    sageGreen: '#8C5A3C',
    surface: '#FFFFFF',
    text: '#4A3B32',
    mutedText: '#6B5E55',
    border: '#D7C4B7',
    font: '"Nunito", system-ui, sans-serif',
    radiusCard: '16px',
    radiusButton: '12px',
    shadow: '0 4px 12px rgba(140, 90, 60, 0.08)',
    chartHigh: '#8C5A3C',
    chartHighDark: '#A67C5C',
    chartMid: '#D7C4B7',
    chartMidDark: '#E8DDD5',
  },
  neubrutalism: {
    id: 'neubrutalism',
    name: 'Harmonized Neubrutalism',
    vibe: 'Gumroad-style anti-design',
    cream: '#EAEAEA',
    softPink: '#FF90E8',
    sageGreen: '#B4A0FF',
    surface: '#FFFFFF',
    text: '#000000',
    mutedText: '#333333',
    border: '#000000',
    font: '-apple-system, BlinkMacSystemFont, Arial, Helvetica, sans-serif',
    radiusCard: '8px',
    radiusButton: '6px',
    shadow: '6px 6px 0 #000000',
    chartHigh: '#B4A0FF',
    chartHighDark: '#C4B5FF',
    chartMid: '#FF90E8',
    chartMidDark: '#FFB3F0',
  },
};

export const PALETTE_ORDER: PaletteId[] = [
  'valley-classic',
  'linear',
  'brilliant',
  'pro-dev',
  'salmon',
  'constructivism',
  'cozy-earth',
  'neubrutalism',
];

export const DEFAULT_PALETTE_ID: PaletteId = 'linear';
export const PALETTE_STORAGE_KEY = 'vs-experiment-palette';

export function isPaletteId(value: string | null | undefined): value is PaletteId {
  return !!value && value in PALETTE_THEMES;
}

export function getPalette(id: PaletteId = DEFAULT_PALETTE_ID): PaletteTheme {
  return PALETTE_THEMES[id] ?? PALETTE_THEMES[DEFAULT_PALETTE_ID];
}

export function loadPalettePreference(): PaletteId {
  if (typeof localStorage === 'undefined') return DEFAULT_PALETTE_ID;
  const stored = localStorage.getItem(PALETTE_STORAGE_KEY);
  return isPaletteId(stored) ? stored : DEFAULT_PALETTE_ID;
}

export function applyPalette(id: PaletteId) {
  const theme = getPalette(id);
  const root = document.documentElement;
  root.setAttribute('data-palette', theme.id);
  root.style.setProperty('--color-cream', theme.cream);
  root.style.setProperty('--color-soft-pink', theme.softPink);
  root.style.setProperty('--color-sage-green', theme.sageGreen);
  root.style.setProperty('--vs-surface', theme.surface);
  root.style.setProperty('--vs-text', theme.text);
  root.style.setProperty('--vs-muted-text', theme.mutedText);
  root.style.setProperty('--vs-border', theme.border);
  root.style.setProperty('--vs-radius-card', theme.radiusCard);
  root.style.setProperty('--vs-radius-button', theme.radiusButton);
  root.style.setProperty('--vs-shadow', theme.shadow);
  root.style.setProperty('--font-sans', theme.font);
  localStorage.setItem(PALETTE_STORAGE_KEY, theme.id);
  window.dispatchEvent(new CustomEvent('vs-palette-change', { detail: theme.id }));
}

export function getActivePaletteId(): PaletteId {
  if (typeof document === 'undefined') return DEFAULT_PALETTE_ID;
  const attr = document.documentElement.getAttribute('data-palette');
  return isPaletteId(attr) ? attr : loadPalettePreference();
}
