import { EmailDomainError, type EmailMessageSnapshot, type EmailMessageStatus, type EmailRecipientInput } from './email.types.js';

const TRANSITIONS: Record<EmailMessageStatus, readonly EmailMessageStatus[]> = {
  DRAFT: ['QUEUED', 'CANCELLED'],
  QUEUED: ['SENDING', 'CANCELLED'],
  SENDING: ['SENT', 'RETRY_WAIT', 'RECONCILING', 'FAILED'],
  RETRY_WAIT: ['SENDING', 'CANCELLED'],
  RECONCILING: ['SENT', 'RETRY_WAIT', 'FAILED'],
  SENT: ['DELIVERED', 'BOUNCED'],
  RECEIVED: [],
  DELIVERED: [],
  BOUNCED: [],
  FAILED: [],
  CANCELLED: [],
};

export function assertEmailMessageTransition(from: EmailMessageStatus, to: EmailMessageStatus): void {
  if (!TRANSITIONS[from]?.includes(to)) {
    throw new EmailDomainError('INVALID_EMAIL_STATUS_TRANSITION', 'errors.invalidEmailStatusTransition');
  }
}

function normalizedAddressList(value: readonly string[] | undefined): string[] {
  return (value ?? []).map((address) => normalizeEmailAddress(address)).sort();
}

export function assertImmutableEmailMessagePatch(
  current: EmailMessageSnapshot,
  patch: Partial<Pick<EmailMessageSnapshot, 'fromAddress' | 'subject' | 'bodyText' | 'sanitizedHtml'>> & { to?: readonly string[] },
): void {
  if (!['SENT', 'RECEIVED'].includes(current.status)) return;
  const recipientsChanged = patch.to !== undefined
    && JSON.stringify(normalizedAddressList(patch.to)) !== JSON.stringify(normalizedAddressList(current.recipients));
  const changed = (patch.fromAddress !== undefined && patch.fromAddress !== current.fromAddress)
    || (patch.subject !== undefined && patch.subject !== current.subject)
    || (patch.bodyText !== undefined && patch.bodyText !== current.bodyText)
    || (patch.sanitizedHtml !== undefined && patch.sanitizedHtml !== current.sanitizedHtml)
    || recipientsChanged;
  if (changed) throw new EmailDomainError('EMAIL_MESSAGE_IMMUTABLE', 'errors.emailMessageImmutable', 409);
}

export function normalizeEmailAddress(value: string): string {
  const address = value.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address) || address.length > 320) {
    throw new EmailDomainError('INVALID_EMAIL_ADDRESS', 'errors.invalidEmailAddress');
  }
  return address;
}

export function normalizeRecipients(input: readonly EmailRecipientInput[]): EmailRecipientInput[] {
  const seen = new Set<string>();
  return input.map((recipient) => {
    if (!['TO', 'CC', 'BCC'].includes(recipient.kind)) {
      throw new EmailDomainError('INVALID_EMAIL_RECIPIENT_KIND', 'errors.invalidEmailRecipientKind');
    }
    const address = normalizeEmailAddress(recipient.address);
    const key = `${recipient.kind}:${address}`;
    if (seen.has(key)) throw new EmailDomainError('DUPLICATE_EMAIL_RECIPIENT', 'errors.duplicateEmailRecipient');
    seen.add(key);
    return { kind: recipient.kind, address };
  });
}
