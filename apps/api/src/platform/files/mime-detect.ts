export function detectMagicContentType(prefix: Uint8Array, claimed: string): string {
  if (prefix.length >= 5 && prefix[0] === 0x25 && prefix[1] === 0x50 && prefix[2] === 0x44 && prefix[3] === 0x46 && prefix[4] === 0x2d) return 'application/pdf';
  if (prefix.length >= 8 && prefix[0] === 0x89 && prefix[1] === 0x50 && prefix[2] === 0x4e && prefix[3] === 0x47) return 'image/png';
  if (prefix.length >= 3 && prefix[0] === 0xff && prefix[1] === 0xd8 && prefix[2] === 0xff) return 'image/jpeg';
  if (prefix.length >= 4 && prefix[0] === 0x50 && prefix[1] === 0x4b && prefix[2] === 0x03 && prefix[3] === 0x04) return 'application/zip';
  return claimed.trim().toLowerCase() || 'application/octet-stream';
}
