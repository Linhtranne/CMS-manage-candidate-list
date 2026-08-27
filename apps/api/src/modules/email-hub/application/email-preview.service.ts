import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { EmailDomainError, type EmailRecipientInput } from '../domain/email.types.js';
import { normalizeEmailAddress, normalizeRecipients, sanitizeEmailHtml } from '../domain/email.rules.js';

const PREVIEW_TTL_MS = 15 * 60 * 1000;

export interface EmailPreviewAttachment {
  id: string;
  status: 'PENDING' | 'QUARANTINED' | 'SCANNING' | 'SAFE' | 'REJECTED' | 'FAILED';
}

export type EmailTemplateSpecificity = 'JOURNEY' | 'OCCUPATION' | 'SECTOR' | 'VISA_ROUTE' | 'GLOBAL';
export interface EmailTemplateCandidate {
  id: string;
  specificity: EmailTemplateSpecificity;
  active: boolean;
  applicable: boolean;
  checksum: string;
}

export interface EmailPreviewRequest {
  mailboxId: string;
  from: string;
  recipients: readonly EmailRecipientInput[];
  subject: string;
  bodyText: string;
  sanitizedHtml?: string;
  templateId?: string;
  templateChecksum?: string;
  candidateId?: string;
  conversationId?: string;
  applicationId?: string;
  journeyId?: string;
  candidate?: { id: string; contactabilityStatus: 'CONTACTABLE' | 'TEMPORARILY_UNREACHABLE' | 'DO_NOT_CONTACT' };
  template?: { active: boolean; applicable: boolean; ambiguous?: boolean; checksum?: string };
  templateCandidates?: readonly EmailTemplateCandidate[];
  attachments?: readonly EmailPreviewAttachment[];
  manualConfirm?: boolean;
  headers?: Readonly<Record<string, string>>;
}

export interface EmailPreview {
  previewId: string;
  token: string;
  expiresAt: Date;
  requestHash: string;
  mailboxId: string;
  from: string;
  recipients: readonly EmailRecipientInput[];
  subject: string;
  bodyText: string;
  sanitizedHtml?: string;
  templateChecksum?: string;
  sensitivityWarning?: 'MANUAL_CONFIRM_REQUIRED';
}

interface SignedPreviewPayload {
  v: 1;
  previewId: string;
  mailboxId: string;
  requestHash: string;
  expiresAt: number;
  templateChecksum?: string;
}

function base64url(value: string | Buffer): string {
  return Buffer.from(value).toString('base64url');
}

function parseBase64Json<T>(value: string): T {
  try {
    return JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as T;
  } catch {
    throw new EmailDomainError('EMAIL_PREVIEW_TAMPERED', 'errors.emailPreviewTampered', 409);
  }
}

function canonicalInput(input: EmailPreviewRequest): Record<string, unknown> {
  const recipients = normalizeRecipients(input.recipients)
    .map(({ kind, address }) => ({ kind, address }))
    .sort((left, right) => `${left.kind}:${left.address}`.localeCompare(`${right.kind}:${right.address}`));
  return {
    mailboxId: input.mailboxId,
    from: input.from.trim().toLowerCase(),
    recipients,
    subject: input.subject,
    bodyText: input.bodyText,
    sanitizedHtml: input.sanitizedHtml ? sanitizeEmailHtml(input.sanitizedHtml) : null,
    templateId: input.templateId ?? null,
    templateChecksum: input.templateChecksum ?? input.template?.checksum ?? null,
    candidateId: input.candidateId ?? null,
    conversationId: input.conversationId ?? null,
    applicationId: input.applicationId ?? null,
    journeyId: input.journeyId ?? null,
    attachments: (input.attachments ?? []).map(({ id, status }) => ({ id, status })).sort((a, b) => a.id.localeCompare(b.id)),
  };
}

function hashInput(input: EmailPreviewRequest): string {
  return createHash('sha256').update(JSON.stringify(canonicalInput(input))).digest('hex');
}

export function resolveEmailTemplate(candidates: readonly EmailTemplateCandidate[]): EmailTemplateCandidate {
  const rank: Record<EmailTemplateSpecificity, number> = { JOURNEY: 5, OCCUPATION: 4, SECTOR: 3, VISA_ROUTE: 2, GLOBAL: 1 };
  const applicable = candidates.filter((candidate) => candidate.active && candidate.applicable);
  if (!applicable.length) throw new EmailDomainError('EMAIL_TEMPLATE_NOT_APPLICABLE', 'errors.emailTemplateNotApplicable', 422);
  const highest = Math.max(...applicable.map((candidate) => rank[candidate.specificity]));
  const selected = applicable.filter((candidate) => rank[candidate.specificity] === highest);
  if (selected.length !== 1) throw new EmailDomainError('EMAIL_TEMPLATE_AMBIGUOUS', 'errors.emailTemplateAmbiguous', 422);
  return selected[0];
}

export class EmailPreviewService {
  constructor(private readonly secret: string, private readonly now: () => Date = () => new Date()) {
    if (!secret || secret.length < 16) throw new Error('EMAIL_PREVIEW_SECRET_TOO_SHORT');
  }

  create(input: EmailPreviewRequest): EmailPreview {
    if (!input.mailboxId || !input.from.trim() || !input.subject.trim() || !input.bodyText.trim()) {
      throw new EmailDomainError('EMAIL_PREVIEW_INVALID', 'errors.emailPreviewInvalid');
    }
    if (input.candidate?.contactabilityStatus === 'DO_NOT_CONTACT') {
      throw new EmailDomainError('DO_NOT_CONTACT', 'errors.doNotContact', 422);
    }
    if (input.candidate?.contactabilityStatus === 'TEMPORARILY_UNREACHABLE') {
      throw new EmailDomainError('CANDIDATE_NOT_CONTACTABLE', 'errors.candidateNotContactable', 422);
    }
    const sanitizedHtml = input.sanitizedHtml ? sanitizeEmailHtml(input.sanitizedHtml) : undefined;
    const normalizedInput = { ...input, ...(sanitizedHtml !== undefined ? { sanitizedHtml } : {}) };
    const resolvedTemplate = input.templateCandidates ? resolveEmailTemplate(input.templateCandidates) : undefined;
    if (input.template?.ambiguous) {
      throw new EmailDomainError('EMAIL_TEMPLATE_AMBIGUOUS', 'errors.emailTemplateAmbiguous', 422);
    }
    const autoSubmitted = Object.entries(input.headers ?? {}).find(([key]) => key.toLowerCase() === 'auto-submitted')?.[1];
    const autoReplyMarker = Object.keys(input.headers ?? {}).some((key) => /auto-reply|auto-response|x-autoreply/i.test(key));
    if ((autoSubmitted && autoSubmitted.toLowerCase() !== 'no') || autoReplyMarker) {
      throw new EmailDomainError('EMAIL_AUTO_REPLY_LOOP', 'errors.emailAutoReplyLoop', 422);
    }
    if (input.template && (!input.template.active || !input.template.applicable)) {
      throw new EmailDomainError('EMAIL_TEMPLATE_NOT_APPLICABLE', 'errors.emailTemplateNotApplicable', 422);
    }
    for (const attachment of input.attachments ?? []) {
      if (attachment.status !== 'SAFE') throw new EmailDomainError('ATTACHMENT_NOT_SAFE', 'errors.attachmentNotSafe', 422);
    }
    const from = normalizeEmailAddress(input.from);
    const recipients = normalizeRecipients(input.recipients);
    const requestHash = hashInput({ ...normalizedInput, templateChecksum: input.templateChecksum ?? resolvedTemplate?.checksum, templateId: input.templateId ?? resolvedTemplate?.id });
    const expiresAt = new Date(this.now().getTime() + PREVIEW_TTL_MS);
    const previewId = base64url(createHash('sha256').update(`${requestHash}:${expiresAt.toISOString()}`).digest()).slice(0, 24);
    const payload: SignedPreviewPayload = {
      v: 1,
      previewId,
      mailboxId: input.mailboxId,
      requestHash,
      expiresAt: expiresAt.getTime(),
      ...(input.templateChecksum || input.template?.checksum || resolvedTemplate?.checksum ? { templateChecksum: input.templateChecksum ?? input.template?.checksum ?? resolvedTemplate?.checksum } : {}),
    };
    const encoded = base64url(JSON.stringify(payload));
    const signature = base64url(createHmac('sha256', this.secret).update(encoded).digest());
    const sensitivityWarning = /decision|offer|visa|coe|rejection/i.test(`${input.subject} ${input.bodyText}`) ? 'MANUAL_CONFIRM_REQUIRED' as const : undefined;
    return {
      previewId,
      token: `v1.${encoded}.${signature}`,
      expiresAt,
      requestHash,
      mailboxId: input.mailboxId,
      from,
      recipients,
      subject: input.subject,
      bodyText: input.bodyText,
      ...(sanitizedHtml ? { sanitizedHtml } : {}),
      ...(input.templateChecksum || input.template?.checksum || resolvedTemplate?.checksum ? { templateChecksum: input.templateChecksum ?? input.template?.checksum ?? resolvedTemplate?.checksum } : {}),
      ...(sensitivityWarning ? { sensitivityWarning } : {}),
    };
  }

  verify(token: string): SignedPreviewPayload {
    const parts = token.split('.');
    if (parts.length !== 3 || parts[0] !== 'v1') throw new EmailDomainError('EMAIL_PREVIEW_TAMPERED', 'errors.emailPreviewTampered', 409);
    const [, encoded, signature] = parts;
    const expected = createHmac('sha256', this.secret).update(encoded).digest();
    let actual: Buffer;
    try { actual = Buffer.from(signature, 'base64url'); } catch { throw new EmailDomainError('EMAIL_PREVIEW_TAMPERED', 'errors.emailPreviewTampered', 409); }
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
      throw new EmailDomainError('EMAIL_PREVIEW_TAMPERED', 'errors.emailPreviewTampered', 409);
    }
    const payload = parseBase64Json<SignedPreviewPayload>(encoded);
    if (payload.v !== 1 || !payload.previewId || !payload.mailboxId || !payload.requestHash || !Number.isFinite(payload.expiresAt)) {
      throw new EmailDomainError('EMAIL_PREVIEW_TAMPERED', 'errors.emailPreviewTampered', 409);
    }
    if (payload.expiresAt <= this.now().getTime()) throw new EmailDomainError('EMAIL_PREVIEW_EXPIRED', 'errors.emailPreviewExpired', 409);
    return payload;
  }

  assertMatches(token: string, input: EmailPreviewRequest): void {
    const payload = this.verify(token);
    if (payload.mailboxId !== input.mailboxId || payload.requestHash !== hashInput(input)) {
      throw new EmailDomainError('EMAIL_PREVIEW_MISMATCH', 'errors.emailPreviewMismatch', 409);
    }
  }
}

export { hashInput as emailPreviewRequestHash };
