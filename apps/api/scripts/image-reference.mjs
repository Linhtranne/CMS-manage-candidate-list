const pinnedDigestPattern = /@sha256:([0-9a-f]{64})$/i;

export function digestFromImageRef(value) {
  const match = typeof value === 'string' ? value.trim().match(pinnedDigestPattern) : null;
  return match ? `sha256:${match[1].toLowerCase()}` : null;
}
