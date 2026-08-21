import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(new URL('../../prisma/migrations/20260820020100_email_hub/migration.sql', import.meta.url), 'utf8');

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
});
