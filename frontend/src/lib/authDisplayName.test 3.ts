import { describe, expect, it } from 'vitest';
import { personNameFromAuthDisplayName } from './authDisplayName';

describe('personNameFromAuthDisplayName', () => {
  it('strips Student role prefix', () => {
    expect(personNameFromAuthDisplayName('Student · Jane')).toBe('Jane');
  });

  it('strips Parent role prefix', () => {
    expect(personNameFromAuthDisplayName('Parent · Ankan')).toBe('Ankan');
  });

  it('strips Teacher role prefix with bullet variant', () => {
    expect(personNameFromAuthDisplayName('Teacher • Ms. Lee')).toBe('Ms. Lee');
  });

  it('strips Parent of prefix for legacy display names', () => {
    expect(personNameFromAuthDisplayName('Parent of Alex')).toBe('Alex');
  });

  it('returns plain names unchanged', () => {
    expect(personNameFromAuthDisplayName('Jane Doe')).toBe('Jane Doe');
  });

  it('returns empty for blank input', () => {
    expect(personNameFromAuthDisplayName('   ')).toBe('');
  });
});
