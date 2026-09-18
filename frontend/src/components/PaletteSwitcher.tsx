import { useEffect, useState } from 'react';
import { Palette } from 'lucide-react';
import {
  applyPalette,
  getActivePaletteId,
  loadPalettePreference,
  PALETTE_ORDER,
  PALETTE_THEMES,
  type PaletteId,
} from '../lib/paletteThemes';

export function PaletteSwitcher() {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<PaletteId>(() => loadPalettePreference());

  useEffect(() => {
    applyPalette(active);
    const onChange = (event: Event) => {
      const id = (event as CustomEvent<PaletteId>).detail;
      if (id) setActive(id);
    };
    window.addEventListener('vs-palette-change', onChange);
    return () => window.removeEventListener('vs-palette-change', onChange);
  }, [active]);

  useEffect(() => {
    setActive(getActivePaletteId());
  }, []);

  const select = (id: PaletteId) => {
    setActive(id);
    applyPalette(id);
  };

  return (
    <div className="fixed bottom-4 right-4 z-[9999] flex flex-col items-end gap-2 font-sans">
      {open && (
        <div
          className="w-[min(22rem,calc(100vw-2rem))] max-h-[70vh] overflow-y-auto rounded-xl border p-3 shadow-xl"
          style={{
            background: 'var(--vs-surface, #fff)',
            borderColor: 'var(--vs-border, #e5e7eb)',
            color: 'var(--vs-text, #111827)',
            boxShadow: 'var(--vs-shadow, 0 10px 30px rgba(0,0,0,0.12))',
          }}
        >
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider opacity-60">
            Experiment palettes
          </p>
          <div className="flex flex-col gap-2">
            {PALETTE_ORDER.map((id) => {
              const theme = PALETTE_THEMES[id];
              const selected = id === active;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => select(id)}
                  className="flex items-start gap-3 rounded-lg border p-2.5 text-left transition-opacity hover:opacity-90"
                  style={{
                    borderColor: selected ? theme.sageGreen : theme.border,
                    background: selected ? `${theme.sageGreen}14` : 'transparent',
                    borderRadius: theme.radiusCard,
                  }}
                >
                  <span className="mt-0.5 flex shrink-0 gap-0.5">
                    {[theme.cream, theme.surface, theme.sageGreen, theme.softPink].map((c) => (
                      <span
                        key={c}
                        className="h-4 w-4 rounded-sm border border-black/10"
                        style={{ background: c }}
                        title={c}
                      />
                    ))}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold leading-tight">{theme.name}</span>
                    <span className="block text-xs opacity-60">{theme.vibe}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold text-white shadow-lg"
        style={{ background: 'var(--color-sage-green, #5E6AD2)' }}
        aria-expanded={open}
        aria-label="Toggle palette switcher"
      >
        <Palette size={16} />
        {open ? 'Close' : PALETTE_THEMES[active].name}
      </button>
    </div>
  );
}
