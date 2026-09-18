import { describe, expect, it } from 'vitest';
import { getSubmitErrorMessage, parseApiError } from './formSubmit';

describe('getSubmitErrorMessage', () => {
  it('maps network failures to a backend hint', () => {
    expect(getSubmitErrorMessage(new Error('Failed to fetch'))).toMatch(/backend is running/i);
    expect(getSubmitErrorMessage(new Error('NetworkError'))).toMatch(/backend is running/i);
    expect(getSubmitErrorMessage({})).toMatch(/backend is running/i);
  });

  it('passes through explicit API errors', () => {
    expect(getSubmitErrorMessage(new Error('Invalid code'))).toBe('Invalid code');
  });
});

describe('parseApiError', () => {
  it('reads error from JSON body', async () => {
    const res = {
      json: async () => ({ error: 'Nope' }),
    } as unknown as Response;
    expect(await parseApiError(res, 'fallback')).toBe('Nope');
  });

  it('uses fallback when body is not JSON', async () => {
    const res = {
      json: async () => { throw new Error('bad'); },
    } as unknown as Response;
    expect(await parseApiError(res, 'fallback')).toBe('fallback');
  });
});
