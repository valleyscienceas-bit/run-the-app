import { describe, expect, it } from 'vitest';
import { parseISOToParts, partsToISO } from './dueDateTime';

describe('parseISOToParts', () => {
  it('returns null for empty or invalid input', () => {
    expect(parseISOToParts('')).toBeNull();
    expect(parseISOToParts('not-a-date')).toBeNull();
  });

  it('parses morning times as AM', () => {
    const local = new Date(2026, 5, 15, 9, 5, 0, 0);
    const parts = parseISOToParts(local.toISOString());
    expect(parts).toMatchObject({
      date: '2026-06-15',
      hour: '9',
      minute: '05',
      period: 'AM',
    });
  });

  it('parses afternoon times as PM and uses 12-hour clock', () => {
    const local = new Date(2026, 0, 1, 15, 30, 0, 0);
    const parts = parseISOToParts(local.toISOString());
    expect(parts).toMatchObject({
      hour: '3',
      minute: '30',
      period: 'PM',
    });
  });

  it('maps midnight to 12 AM and noon to 12 PM', () => {
    const midnight = parseISOToParts(new Date(2026, 2, 10, 0, 0, 0, 0).toISOString());
    const noon = parseISOToParts(new Date(2026, 2, 10, 12, 0, 0, 0).toISOString());
    expect(midnight).toMatchObject({ hour: '12', period: 'AM' });
    expect(noon).toMatchObject({ hour: '12', period: 'PM' });
  });
});

describe('partsToISO', () => {
  it('returns null when date or time is incomplete', () => {
    expect(partsToISO({ date: '', hour: '3', minute: '00', period: 'PM' })).toBeNull();
    expect(partsToISO({ date: '2026-06-15', hour: '', minute: '00', period: 'PM' })).toBeNull();
    expect(partsToISO({ date: '2026-06-15', hour: '3', minute: '', period: 'PM' })).toBeNull();
  });

  it('rejects invalid hours and minutes', () => {
    expect(partsToISO({ date: '2026-06-15', hour: '0', minute: '00', period: 'AM' })).toBeNull();
    expect(partsToISO({ date: '2026-06-15', hour: '13', minute: '00', period: 'AM' })).toBeNull();
    expect(partsToISO({ date: '2026-06-15', hour: '3', minute: '60', period: 'AM' })).toBeNull();
  });

  it('round-trips a valid local datetime', () => {
    const parts = { date: '2026-06-15', hour: '3', minute: '30', period: 'PM' as const };
    const iso = partsToISO(parts);
    expect(iso).toBeTruthy();
    const back = parseISOToParts(iso!);
    expect(back).toMatchObject(parts);
  });

  it('converts 12 AM to midnight and 12 PM to noon', () => {
    const am = partsToISO({ date: '2026-03-10', hour: '12', minute: '00', period: 'AM' });
    const pm = partsToISO({ date: '2026-03-10', hour: '12', minute: '00', period: 'PM' });
    expect(parseISOToParts(am!)).toMatchObject({ hour: '12', period: 'AM' });
    expect(parseISOToParts(pm!)).toMatchObject({ hour: '12', period: 'PM' });
  });
});
