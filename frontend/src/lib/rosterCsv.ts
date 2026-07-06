export type RosterCsvRow = {
  name: string;
  email: string;
  grade?: string;
  username?: string;
  parentEmail?: string;
};

function splitCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      cells.push(current);
      current = '';
    } else {
      current += ch;
    }
  }

  cells.push(current);
  return cells.map(c => c.trim().replace(/^"|"$/g, '').replace(/""/g, '"'));
}

export function parseRosterCsv(text: string): RosterCsvRow[] {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];

  const header = splitCsvLine(lines[0]).map(h => h.toLowerCase());
  const nameIdx = header.findIndex(h => h === 'name');
  const emailIdx = header.findIndex(h => h === 'email');
  const gradeIdx = header.findIndex(h => h === 'grade');
  const usernameIdx = header.findIndex(h => h === 'username');
  const parentEmailIdx = header.findIndex(
    h => h === 'parentemail' || h === 'parent email' || h === 'parent_email'
  );
  if (nameIdx < 0 || emailIdx < 0) return [];

  return lines
    .slice(1)
    .map(line => {
      const cells = splitCsvLine(line);
      return {
        name: cells[nameIdx] || '',
        email: cells[emailIdx] || '',
        grade: gradeIdx >= 0 ? cells[gradeIdx] : undefined,
        username: usernameIdx >= 0 ? cells[usernameIdx] : undefined,
        parentEmail: parentEmailIdx >= 0 ? cells[parentEmailIdx] : undefined,
      };
    })
    .filter(r => r.name && r.email);
}
