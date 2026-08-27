export interface CandidateCursor { updatedAt: string; id: string }

export function encodeCandidateCursor(cursor: CandidateCursor): string {
  return Buffer.from(JSON.stringify(cursor), 'utf8').toString('base64url');
}

export function decodeCandidateCursor(value: string | undefined): CandidateCursor | undefined {
  if (!value) return undefined;
  try {
    const parsed = JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as Partial<CandidateCursor>;
    if (typeof parsed.updatedAt !== 'string' || typeof parsed.id !== 'string') throw new Error('invalid cursor');
    if (Number.isNaN(new Date(parsed.updatedAt).getTime())) throw new Error('invalid cursor');
    return { updatedAt: parsed.updatedAt, id: parsed.id };
  } catch {
    const error = new Error('INVALID_CURSOR');
    Object.assign(error, { code: 'INVALID_CURSOR', statusCode: 422 });
    throw error;
  }
}

export function candidateLimit(value?: number): number {
  if (value === undefined) return 25;
  if (!Number.isInteger(value) || value < 1 || value > 100) {
    const error = new Error('INVALID_LIMIT');
    Object.assign(error, { code: 'INVALID_LIMIT', statusCode: 422 });
    throw error;
  }
  return value;
}
