export type Period = 'AM' | 'PM';

export interface TimeParts {
  date: string;
  hour: string;
  minute: string;
  period: Period;
}

export const EMPTY_TIME_PARTS: TimeParts = { date: '', hour: '12', minute: '00', period: 'PM' };

export function parseISOToParts(iso: string): TimeParts | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours24 = d.getHours();
  const period: Period = hours24 >= 12 ? 'PM' : 'AM';
  const hour12 = hours24 % 12 || 12;
  return {
    date: `${year}-${month}-${day}`,
    hour: String(hour12),
    minute: String(d.getMinutes()).padStart(2, '0'),
    period,
  };
}

export function partsToISO(parts: TimeParts): string | null {
  if (!parts.date || !parts.hour || parts.minute === '') return null;
  const hourNum = parseInt(parts.hour, 10);
  const minuteNum = parseInt(parts.minute, 10);
  if (isNaN(hourNum) || hourNum < 1 || hourNum > 12) return null;
  if (isNaN(minuteNum) || minuteNum < 0 || minuteNum > 59) return null;
  let h24 = hourNum % 12;
  if (parts.period === 'PM') h24 += 12;
  const [y, m, d] = parts.date.split('-').map(Number);
  const local = new Date(y, m - 1, d, h24, minuteNum, 0, 0);
  if (isNaN(local.getTime())) return null;
  return local.toISOString();
}
