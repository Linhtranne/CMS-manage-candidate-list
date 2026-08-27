import { createCipheriv, createDecipheriv, createHmac, createHash, randomBytes } from 'node:crypto';

function keyFrom(secret: string): Buffer {
  return createHash('sha256').update(secret).digest();
}

export function encryptCandidateValue(value: string | null | undefined, secret: string): string | null {
  if (!value) return null;
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', keyFrom(secret), iv);
  const ciphertext = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  return [iv.toString('base64url'), ciphertext.toString('base64url'), cipher.getAuthTag().toString('base64url')].join('.');
}

export function decryptCandidateValue(value: string | null | undefined, secret: string): string | null {
  if (!value) return null;
  const [ivPart, ciphertextPart, tagPart] = value.split('.');
  if (!ivPart || !ciphertextPart || !tagPart) throw new Error('invalid candidate ciphertext');
  const decipher = createDecipheriv('aes-256-gcm', keyFrom(secret), Buffer.from(ivPart, 'base64url'));
  decipher.setAuthTag(Buffer.from(tagPart, 'base64url'));
  return Buffer.concat([decipher.update(Buffer.from(ciphertextPart, 'base64url')), decipher.final()]).toString('utf8');
}

export function candidateBlindIndex(value: string | null | undefined, secret: string): string | null {
  if (!value) return null;
  return createHmac('sha256', keyFrom(secret)).update(value).digest('hex');
}
