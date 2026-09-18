export type AuthRole = "parent" | "student" | "teacher";

const ROLE_LABELS: Record<AuthRole, string> = {
  parent: "Parent",
  student: "Student",
  teacher: "Teacher",
};

const ROLE_PREFIX_RE = /^(Parent|Student|Teacher)\s*[·•]\s*/;
const PARENT_OF_RE = /^Parent of\s+(.+)$/i;

export function normalizeAuthRole(role: string | undefined | null): AuthRole {
  if (role === "parent" || role === "student" || role === "teacher") return role;
  return "student";
}

/** Person name for Auth displayName / Google signup prefill (strips role prefixes). */
export function extractPersonNameFromAuthDisplayName(displayName: string): string {
  const trimmed = displayName.trim();
  if (!trimmed) return "";

  const rolePrefixMatch = trimmed.match(/^(?:Parent|Student|Teacher)\s*[·•]\s*(.+)$/);
  if (rolePrefixMatch) return rolePrefixMatch[1].trim();

  const parentOfMatch = trimmed.match(PARENT_OF_RE);
  if (parentOfMatch) return parentOfMatch[1].trim();

  return trimmed;
}

/** Firebase Console–friendly label, e.g. "Student · Jane" or "Parent · Ankan". */
export function formatAuthDisplayName(role: string | undefined | null, name: string): string {
  const authRole = normalizeAuthRole(role);
  const label = ROLE_LABELS[authRole];
  let personName = (name || "").trim();

  if (!personName) return label;

  if (ROLE_PREFIX_RE.test(personName)) {
    return personName.replace(ROLE_PREFIX_RE, `${label} · `);
  }

  if (authRole === "parent") {
    const parentOfMatch = personName.match(PARENT_OF_RE);
    if (parentOfMatch) {
      personName = parentOfMatch[1].trim();
    }
  }

  if (!personName) return label;
  return `${label} · ${personName}`;
}

export function isAuthDisplayNameFormatted(displayName: string, role: string): boolean {
  const authRole = normalizeAuthRole(role);
  const expectedPrefix = `${ROLE_LABELS[authRole]} · `;
  return displayName.startsWith(expectedPrefix);
}
