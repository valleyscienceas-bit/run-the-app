import { describe, expect, it } from 'vitest';
import { formatPhoneDisplay } from './PhoneInput';

describe('formatPhoneDisplay', () => {
  it('returns empty string for empty input', () => {
    expect(formatPhoneDisplay('')).toBe('');
  });

  it('formats US numbers with parentheses and dash', () => {
    expect(formatPhoneDisplay('+15551234567')).toBe('+1 (555) 123-4567');
  });

  it('formats partial US national digits as the user types', () => {
    expect(formatPhoneDisplay('+1555')).toBe('+1 (555');
    expect(formatPhoneDisplay('+1555123')).toBe('+1 (555) 123');
  });

  it('formats non-US numbers with spaced groups', () => {
    expect(formatPhoneDisplay('+447911123456')).toBe('+44 791 112 3456');
  });

  it('formats India numbers', () => {
    expect(formatPhoneDisplay('+919876543210')).toBe('+91 987 654 3210');
  });

  it('falls back to US when value has no plus prefix', () => {
    expect(formatPhoneDisplay('5551234567')).toBe('+1');
  });
});
