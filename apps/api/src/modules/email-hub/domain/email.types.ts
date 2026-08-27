export const EMAIL_MESSAGE_STATUSES = [
  'DRAFT', 'QUEUED', 'SENDING', 'RETRY_WAIT', 'RECONCILING', 'SENT', 'RECEIVED', 'DELIVERED', 'BOUNCED', 'FAILED', 'CANCELLED',
] as const;
export type EmailMessageStatus = (typeof EMAIL_MESSAGE_STATUSES)[number];

export const EMAIL_MESSAGE_DIRECTIONS = ['INBOUND', 'OUTBOUND'] as const;
export type EmailMessageDirection = (typeof EMAIL_MESSAGE_DIRECTIONS)[number];

export const MAILBOX_PROVIDERS = ['DISABLED', 'FAKE', 'MICROSOFT_GRAPH', 'GMAIL_API', 'SMTP_IMAP'] as const;
export type MailboxProvider = (typeof MAILBOX_PROVIDERS)[number];

/** Providers that may cross the public webhook boundary. FAKE is synthetic-only and never accepted here. */
export const EXTERNAL_MAILBOX_PROVIDERS = ['MICROSOFT_GRAPH', 'GMAIL_API', 'SMTP_IMAP'] as const;
export type ExternalMailboxProvider = (typeof EXTERNAL_MAILBOX_PROVIDERS)[number];

export const MAILBOX_HEALTH_STATUSES = ['NOT_CONFIGURED', 'HEALTHY', 'DEGRADED', 'PAUSED_AUTH', 'PAUSED_OPERATOR', 'FAILED'] as const;
export type MailboxHealthStatus = (typeof MAILBOX_HEALTH_STATUSES)[number];

export const EMAIL_CONVERSATION_STATUSES = ['NEEDS_ACTION', 'MATCHED', 'UNMATCHED', 'SENT', 'RECEIVED', 'CLOSED'] as const;
export type EmailConversationStatus = (typeof EMAIL_CONVERSATION_STATUSES)[number];

export interface EmailRecipientInput {
  kind: 'TO' | 'CC' | 'BCC';
  address: string;
}

export interface EmailMessageSnapshot {
  status: EmailMessageStatus;
  fromAddress: string;
  subject: string;
  bodyText: string;
  sanitizedHtml?: string | null;
  recipients: readonly string[];
}

export interface ProviderSendInput {
  from: string;
  to: readonly string[];
  cc?: readonly string[];
  bcc?: readonly string[];
  subject: string;
  bodyText: string;
  sanitizedHtml?: string;
  headers?: Readonly<Record<string, string>>;
}

export interface ProviderSendResult {
  providerMessageId: string;
  internetMessageId?: string;
  acceptedAt: Date;
}

export interface ProviderSendLookup {
  providerMessageId: string;
  internetMessageId?: string;
  acceptedAt: Date;
}

export interface ProviderHealth {
  status: 'not_configured' | 'healthy' | 'degraded' | 'paused_auth' | 'paused_operator' | 'failed';
  provider: MailboxProvider;
  checkedAt: Date;
  detail?: string;
  authExpiresAt?: Date | null;
}

export interface MailCursor {
  value: string;
  issuedAt: Date;
}

export interface ProviderChange {
  providerMessageId: string;
  receivedAt: Date;
}

export interface ProviderAttachment {
  providerAttachmentId: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
}

export interface ProviderChangePage {
  changes: readonly ProviderChange[];
  nextCursor: MailCursor | null;
}

export interface ProviderMessage {
  providerMessageId: string;
  from: string;
  to: readonly string[];
  subject: string;
  bodyText: string;
  bodyHtml?: string;
  receivedAt: Date;
  attachments?: readonly ProviderAttachment[];
  providerThreadId?: string;
  internetMessageId?: string;
  inReplyTo?: string;
  references?: readonly string[];
  headers?: Readonly<Record<string, string>>;
}

export class EmailDomainError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly messageKey: string;

  constructor(code: string, messageKey = 'errors.emailRequestRejected', statusCode = 422) {
    super(code);
    this.name = 'EmailDomainError';
    this.code = code;
    this.messageKey = messageKey;
    this.statusCode = statusCode;
  }
}
