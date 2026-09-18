import { describe, expect, it } from 'vitest';
import { parseRosterCsv } from './rosterCsv';

describe('parseRosterCsv', () => {
  it('parses name and email columns', () => {
    const rows = parseRosterCsv(`Name,Email
Jane Doe,jane@school.edu
Bob Smith,bob@school.edu`);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual({ name: 'Jane Doe', email: 'jane@school.edu' });
  });

  it('parses optional grade, username, and parent email columns', () => {
    const rows = parseRosterCsv(`Name,Email,Grade,Username,ParentEmail
Alex M.,alex@school.edu,8,alexm,parent@home.com`);
    expect(rows[0]).toEqual({
      name: 'Alex M.',
      email: 'alex@school.edu',
      grade: '8',
      username: 'alexm',
      parentEmail: 'parent@home.com',
    });
  });

  it('accepts parent email header variants', () => {
    const rows = parseRosterCsv(`Name,Email,Parent Email
Sam,sam@school.edu,sam.parent@home.com`);
    expect(rows[0].parentEmail).toBe('sam.parent@home.com');
  });

  it('handles quoted CSV cells', () => {
    const rows = parseRosterCsv(`Name,Email
"Doe, Jane",jane@school.edu`);
    expect(rows[0].name).toBe('Doe, Jane');
  });

  it('skips rows missing name or email', () => {
    const rows = parseRosterCsv(`Name,Email
,jane@school.edu
Bob,
Bob,bob@school.edu`);
    expect(rows).toHaveLength(1);
    expect(rows[0].email).toBe('bob@school.edu');
  });

  it('returns empty for header-only or invalid CSV', () => {
    expect(parseRosterCsv('Name,Email')).toEqual([]);
    expect(parseRosterCsv('foo,bar\n1,2')).toEqual([]);
  });
});
