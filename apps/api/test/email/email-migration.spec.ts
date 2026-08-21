import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(new URL('../../prisma/migrations/20260820020100_email_hub/migration.sql', import.meta.url), 'utf8');
const inboundMigration = readFileSync(new URL('../../prisma/migrations/20260821000100_email_inbound/migration.sql', import.meta.url), 'utf8');
const attachmentMigration = readFileSync(new URL('../../prisma/migrations/20260821000200_email_attachment_quarantine/migration.sql', import.meta.url), 'utf8');

describe('email hub migration contract', () => {
  it('creates provider/message dedupe constraints and the immutable message trigger', () => {
    expect(migration).toMatch(/email_messages_provider_dedupe_idx/);
    expect(migration).toMatch(/email_messages_idempotency_idx/);
    expect(migration).toMatch(/CREATE TRIGGER email_messages_immutable_trigger/);
    expect(migration).toMatch(/EMAIL_MESSAGE_IMMUTABLE/);
  });

  it('keeps the application role from deleting email evidence', () => {
    expect(migration).toMatch(/GRANT SELECT, INSERT, UPDATE ON mailboxes, email_conversations, email_messages, email_recipients, email_attachments, email_match_decisions TO cms_api/);
    expect(migration).toMatch(/REVOKE DELETE ON mailboxes, email_conversations, email_messages, email_recipients, email_attachments, email_match_decisions FROM cms_api/);
  });

  it('adds inbound webhook replay protection and header/thread correlation fields', () => {
    expect(inboundMigration).toMatch(/email_webhook_notifications_dedupe_idx/);
    expect(inboundMigration).toMatch(/REVOKE DELETE ON email_webhook_notifications FROM cms_api/);
    expect(inboundMigration).toMatch(/provider_thread_id/);
    expect(inboundMigration).toMatch(/references_json/);
  });

  it('keeps attachment quarantine states and delete protection explicit', () => {
    expect(attachmentMigration).toMatch(/email_attachments_provider_unique_idx/);
    expect(attachmentMigration).toMatch(/provider_attachment_id/);
    expect(attachmentMigration).toMatch(/REVOKE DELETE ON email_attachments FROM cms_api/);
    expect(attachmentMigration).toMatch(/SCANNING/);
    expect(attachmentMigration).toMatch(/SAFE/);
    expect(attachmentMigration).toMatch(/REJECTED/);
  });
});
