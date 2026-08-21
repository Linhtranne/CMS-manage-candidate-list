import { describe, expect, it } from 'vitest';
import { redactDatabaseErrorMessage } from '../../src/platform/database/prisma.service.js';

describe('database error handling', () => {
  it('redacts connection credentials from readiness failures', () => {
    const message = redactDatabaseErrorMessage(
      new Error('connect failed for postgresql://cms:super-secret@db.example.com:5432/cms?schema=public'),
    );

    expect(message).not.toContain('super-secret');
    expect(message).toContain('postgresql://[redacted]');
  });
});
