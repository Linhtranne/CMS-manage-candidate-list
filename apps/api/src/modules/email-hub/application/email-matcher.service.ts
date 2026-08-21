import { createHmac, timingSafeEqual } from 'node:crypto';
import { EmailDomainError } from '../domain/email.types.js';

export interface MatchCandidate {
  conversationId: string;
  candidateId?: string | null;
  sender?: string | null;
  providerThreadId?: string | null;
  internetMessageIds?: readonly string[];
}

export interface EmailMatchInput {
  replyToken?: string;
  inReplyTo?: string | null;
  references?: readonly string[];
  providerThreadId?: string | null;
  sender?: string | null;
  candidates: readonly MatchCandidate[];
}

export type EmailMatchResult =
  | { state: 'MATCHED'; conversationId: string; candidateId?: string | null; reason: string }
  | { state: 'UNMATCHED' | 'AMBIGUOUS'; reason: string };

interface ReplyTokenPayload {
  v: 1;
  conversationId: string;
  candidateId?: string;
  expiresAt: number;
}

function normalize(value: string | null | undefined): string | undefined {
  return value?.trim().toLowerCase() || undefined;
}

export class EmailMatcherService {
  constructor(private readonly secret: string, private readonly now: () => Date = () => new Date()) {}

  createReplyToken(input: { conversationId: string; candidateId?: string; ttlMs?: number }): string {
    const payload: ReplyTokenPayload = {
      v: 1,
      conversationId: input.conversationId,
      ...(input.candidateId ? { candidateId: input.candidateId } : {}),
      expiresAt: this.now().getTime() + (input.ttlMs ?? 30 * 24 * 60 * 60 * 1000),
    };
    const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signature = createHmac('sha256', this.secret).update(encoded).digest('base64url');
    return `r1.${encoded}.${signature}`;
  }

  match(input: EmailMatchInput): EmailMatchResult {
    if (input.replyToken) {
      const token = this.verifyReplyToken(input.replyToken);
      if (token) return { state: 'MATCHED', conversationId: token.conversationId, candidateId: token.candidateId, reason: 'VERIFIED_REPLY_TOKEN' };
    }

    const references = new Set([input.inReplyTo, ...(input.references ?? [])].filter((value): value is string => Boolean(value)));
    if (references.size) {
      const byHeader = input.candidates.filter((candidate) => (candidate.internetMessageIds ?? []).some((id) => references.has(id)));
      const headerResult = this.resolveSingle(byHeader, 'IN_REPLY_TO_OR_REFERENCES');
      if (headerResult) return headerResult;
      if (byHeader.length > 1) return { state: 'AMBIGUOUS', reason: 'HEADER_MULTIPLE_CONVERSATIONS' };
    }

    if (input.providerThreadId) {
      const byThread = input.candidates.filter((candidate) => candidate.providerThreadId === input.providerThreadId);
      const threadResult = this.resolveSingle(byThread, 'PROVIDER_THREAD');
      if (threadResult) return threadResult;
      if (byThread.length > 1) return { state: 'AMBIGUOUS', reason: 'THREAD_MULTIPLE_CONVERSATIONS' };
    }

    const sender = normalize(input.sender);
    if (sender) {
      const bySender = input.candidates.filter((candidate) => normalize(candidate.sender) === sender);
      const senderResult = this.resolveSingle(bySender, 'UNIQUE_SENDER');
      if (senderResult) return senderResult;
      if (bySender.length > 1) return { state: 'AMBIGUOUS', reason: 'SENDER_MULTIPLE_ACTIVE_CONVERSATIONS' };
    }
    return { state: 'UNMATCHED', reason: 'NO_VERIFIED_CORRELATION' };
  }

  private resolveSingle(candidates: readonly MatchCandidate[], reason: string): EmailMatchResult | undefined {
    if (candidates.length !== 1) return undefined;
    const match = candidates[0];
    return { state: 'MATCHED', conversationId: match.conversationId, candidateId: match.candidateId, reason };
  }

  private verifyReplyToken(token: string): ReplyTokenPayload | undefined {
    const parts = token.split('.');
    if (parts.length !== 3 || parts[0] !== 'r1') return undefined;
    const [, encoded, signature] = parts;
    const expected = createHmac('sha256', this.secret).update(encoded).digest();
    let actual: Buffer;
    try { actual = Buffer.from(signature, 'base64url'); } catch { return undefined; }
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return undefined;
    try {
      const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as ReplyTokenPayload;
      if (payload.v !== 1 || !payload.conversationId || payload.expiresAt <= this.now().getTime()) return undefined;
      return payload;
    } catch {
      return undefined;
    }
  }
}

export function assertWebhookSignature(secret: string, signingValue: string, signature: string): void {
  const expected = createHmac('sha256', secret).update(signingValue).digest();
  const actual = Buffer.from(signature, 'hex');
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) throw new EmailDomainError('MAIL_WEBHOOK_INVALID', 'errors.mailWebhookInvalid', 401);
}
