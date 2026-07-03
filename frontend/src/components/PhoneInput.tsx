import React, { useEffect, useMemo, useState } from 'react';

export const COMMON_COUNTRY_CODES = [
  { code: '+1', label: 'US/CA (+1)' },
  { code: '+44', label: 'UK (+44)' },
  { code: '+91', label: 'India (+91)' },
  { code: '+61', label: 'Australia (+61)' },
  { code: '+49', label: 'Germany (+49)' },
  { code: '+33', label: 'France (+33)' },
  { code: '+81', label: 'Japan (+81)' },
  { code: '+86', label: 'China (+86)' },
  { code: '+52', label: 'Mexico (+52)' },
  { code: '+55', label: 'Brazil (+55)' },
] as const;

const US_CODE = '+1';

function digitsOnly(value: string): string {
  return value.replace(/\D/g, '');
}

function formatUsNational(digits: string): string {
  const d = digits.slice(0, 10);
  if (d.length === 0) return '';
  if (d.length <= 3) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}

function formatGenericNational(digits: string): string {
  const d = digits.slice(0, 15);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)} ${d.slice(3)}`;
  if (d.length <= 10) return `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}`;
  return `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6, 10)} ${d.slice(10)}`;
}

function parseE164(value: string): { countryCode: string; nationalDigits: string } {
  if (!value || !value.startsWith('+')) {
    return { countryCode: US_CODE, nationalDigits: '' };
  }
  const known = [...COMMON_COUNTRY_CODES]
    .map((c) => c.code)
    .sort((a, b) => b.length - a.length)
    .find((code) => value.startsWith(code));
  if (known) {
    return { countryCode: known, nationalDigits: digitsOnly(value.slice(known.length)) };
  }
  const match = value.match(/^(\+\d{1,4})(\d*)$/);
  if (match) {
    return { countryCode: match[1], nationalDigits: match[2] };
  }
  return { countryCode: US_CODE, nationalDigits: digitsOnly(value) };
}

function toE164(countryCode: string, nationalDigits: string): string {
  if (!nationalDigits) return '';
  const code = countryCode.startsWith('+') ? countryCode : `+${countryCode}`;
  return `${code}${nationalDigits}`;
}

export interface PhoneInputProps {
  value: string;
  onChange: (e164: string) => void;
  label?: string;
  optional?: boolean;
  focusColor?: 'sage-green' | 'soft-pink';
  className?: string;
}

export function PhoneInput({
  value,
  onChange,
  label = 'Phone #',
  optional = true,
  focusColor = 'sage-green',
  className = '',
}: PhoneInputProps) {
  const parsed = useMemo(() => parseE164(value), [value]);
  const [countryCode, setCountryCode] = useState(parsed.countryCode);
  const [customCode, setCustomCode] = useState('');
  const [nationalDigits, setNationalDigits] = useState(parsed.nationalDigits);

  const isCustomCode = !COMMON_COUNTRY_CODES.some((c) => c.code === countryCode);
  const focusClass =
    focusColor === 'soft-pink' ? 'focus:border-soft-pink' : 'focus:border-sage-green';

  useEffect(() => {
    const next = parseE164(value);
    setCountryCode(next.countryCode);
    setNationalDigits(next.nationalDigits);
    if (!COMMON_COUNTRY_CODES.some((c) => c.code === next.countryCode)) {
      setCustomCode(next.countryCode);
    }
  }, [value]);

  const emitChange = (code: string, digits: string) => {
    onChange(toE164(code, digits));
  };

  const handleCountrySelect = (selected: string) => {
    if (selected === 'custom') {
      setCountryCode(customCode || '+');
      emitChange(customCode || '+', nationalDigits);
      return;
    }
    setCountryCode(selected);
    setCustomCode('');
    emitChange(selected, nationalDigits);
  };

  const handleCustomCodeChange = (raw: string) => {
    let next = raw.replace(/[^\d+]/g, '');
    if (!next.startsWith('+')) next = `+${next.replace(/\+/g, '')}`;
    setCustomCode(next);
    setCountryCode(next);
    emitChange(next, nationalDigits);
  };

  const handleNationalChange = (raw: string) => {
    const digits = digitsOnly(raw);
    setNationalDigits(digits);
    emitChange(countryCode, digits);
  };

  const displayNational =
    countryCode === US_CODE ? formatUsNational(nationalDigits) : formatGenericNational(nationalDigits);

  const selectValue = isCustomCode ? 'custom' : countryCode;

  return (
    <div className={`space-y-2 ${className}`}>
      <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">
        {label}
        {optional ? ' (Optional)' : ''}
      </label>
      <div className="flex gap-2">
        <div className="flex-shrink-0 w-36">
          <select
            value={selectValue}
            onChange={(e) => handleCountrySelect(e.target.value)}
            className={`w-full bg-slate-50 border-2 border-transparent ${focusClass} rounded-2xl px-3 py-4 font-bold outline-none transition-all appearance-none text-sm`}
            aria-label="Country code"
          >
            {COMMON_COUNTRY_CODES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.label}
              </option>
            ))}
            <option value="custom">Other…</option>
          </select>
        </div>
        {selectValue === 'custom' && (
          <input
            type="text"
            value={customCode}
            onChange={(e) => handleCustomCodeChange(e.target.value)}
            placeholder="+XX"
            className={`w-20 flex-shrink-0 bg-slate-50 border-2 border-transparent ${focusClass} rounded-2xl px-3 py-4 font-bold outline-none transition-all text-sm`}
            aria-label="Custom country code"
          />
        )}
        <input
          type="tel"
          value={displayNational}
          onChange={(e) => handleNationalChange(e.target.value)}
          className={`flex-1 min-w-0 bg-slate-50 border-2 border-transparent ${focusClass} rounded-2xl px-6 py-4 font-bold outline-none transition-all`}
          placeholder={countryCode === US_CODE ? '(650) 469-3821' : 'Phone number'}
          autoComplete="tel-national"
        />
      </div>
    </div>
  );
}

export function formatPhoneDisplay(e164: string): string {
  if (!e164) return '';
  const { countryCode, nationalDigits } = parseE164(e164);
  const national =
    countryCode === US_CODE ? formatUsNational(nationalDigits) : formatGenericNational(nationalDigits);
  return national ? `${countryCode} ${national}` : countryCode;
}
