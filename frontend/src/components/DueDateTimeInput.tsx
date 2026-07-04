import React from 'react';
import { INPUT_CLASS_PX } from '../lib/formStyles';
import { EMPTY_TIME_PARTS, parseISOToParts, partsToISO, type TimeParts } from '../lib/dueDateTime';

interface DueDateTimeInputProps {
  value: string;
  onChange: (iso: string) => void;
  required?: boolean;
}

export function DueDateTimeInput({ value, onChange, required }: DueDateTimeInputProps) {
  const [parts, setParts] = React.useState<TimeParts>(() => parseISOToParts(value) || EMPTY_TIME_PARTS);

  React.useEffect(() => {
    const parsed = parseISOToParts(value);
    if (parsed) setParts(parsed);
    else if (!value) setParts(EMPTY_TIME_PARTS);
  }, [value]);

  const update = (next: Partial<TimeParts>) => {
    const merged = { ...parts, ...next };
    setParts(merged);
    const iso = partsToISO(merged);
    if (iso) onChange(iso);
    else if (!merged.date) onChange('');
  };

  const handlePeriodKey = (e: React.KeyboardEvent) => {
    const key = e.key;
    if (key === 'a' || key === 'A') {
      e.preventDefault();
      update({ period: 'AM' });
    } else if (key === 'p' || key === 'P') {
      e.preventDefault();
      update({ period: 'PM' });
    }
  };

  const togglePeriod = () => update({ period: parts.period === 'AM' ? 'PM' : 'AM' });

  return (
    <div className="flex flex-wrap items-center gap-3">
      <input
        type="date"
        required={required}
        value={parts.date}
        onChange={e => update({ date: e.target.value })}
        className={`${INPUT_CLASS_PX} flex-1 min-w-[140px]`}
      />
      <div className="flex items-center gap-2">
        <input
          type="number"
          min={1}
          max={12}
          required={required}
          value={parts.hour}
          onChange={e => update({ hour: e.target.value })}
          onKeyDown={handlePeriodKey}
          className={`${INPUT_CLASS_PX} w-16 text-center`}
          aria-label="Hour"
        />
        <span className="font-black text-slate-400">:</span>
        <input
          type="number"
          min={0}
          max={59}
          required={required}
          value={parts.minute}
          onChange={e => {
            const raw = e.target.value;
            update({ minute: raw === '' ? '' : String(Math.min(59, Math.max(0, parseInt(raw, 10) || 0))).padStart(2, '0') });
          }}
          onKeyDown={handlePeriodKey}
          className={`${INPUT_CLASS_PX} w-16 text-center`}
          aria-label="Minute"
        />
        <button
          type="button"
          onClick={togglePeriod}
          className={`${INPUT_CLASS_PX} w-16 text-center cursor-pointer select-none hover:border-soft-pink`}
          aria-label="Toggle AM/PM"
        >
          {parts.period}
        </button>
      </div>
    </div>
  );
}
