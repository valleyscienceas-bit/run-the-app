/** Strip Firebase Auth role prefixes so signup forms get the person's name. */
export function personNameFromAuthDisplayName(displayName: string): string {
  const trimmed = displayName.trim();
  if (!trimmed) return "";

  const rolePrefixMatch = trimmed.match(/^(?:Parent|Student|Teacher)\s*[·•]\s*(.+)$/);
  if (rolePrefixMatch) return rolePrefixMatch[1].trim();

  const parentOfMatch = trimmed.match(/^Parent of\s+(.+)$/i);
  if (parentOfMatch) return parentOfMatch[1].trim();

  return trimmed;
}
