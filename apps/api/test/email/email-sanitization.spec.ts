import { describe, expect, it } from 'vitest';
import { sanitizeEmailHtml } from '../../src/modules/email-hub/domain/email.rules.js';
import { EmailPreviewService } from '../../src/modules/email-hub/application/email-preview.service.js';

describe('email HTML sanitization', () => {
  it('keeps formatting allowlist but strips scripts, handlers, forms, images and URL attributes', () => {
    const result = sanitizeEmailHtml('<p>Hello <strong>candidate</strong></p><script>alert(1)</script><img src="https://tracker.invalid/pixel" onerror="alert(2)"><a href="javascript:alert(3)" onclick="alert(4)">link</a><form action="https://evil.invalid"><input value="x"></form>');
    expect(result).toContain('<p>Hello <strong>candidate</strong></p>');
    expect(result).not.toMatch(/script|img|form|input|onerror|onclick|javascript:|tracker\.invalid/i);
  });

  it('removes comments, dangerous schemes and unknown tags without returning raw markup', () => {
    const result = sanitizeEmailHtml('<!--secret--><custom data-x="1">Safe</custom><a href="data:text/html;base64,evil">data</a><div style="background:url(javascript:evil)">Text</div>');
    expect(result).toBe('Safedata<div>Text</div>');
    expect(result).not.toMatch(/secret|custom|data:|style|javascript/i);
  });

  it('binds the sanitized representation into the signed preview request', () => {
    const service = new EmailPreviewService('preview-secret-123456789');
    const input = {
      mailboxId: 'mailbox-1', from: 'ops@example.test', recipients: [{ kind: 'TO' as const, address: 'candidate@example.test' }],
      subject: 'Hello', bodyText: 'Body', sanitizedHtml: '<p>Safe</p><script>bad()</script>',
    };
    const preview = service.create(input);
    expect(preview.sanitizedHtml).toBe('<p>Safe</p>');
    expect(() => service.assertMatches(preview.token, input)).not.toThrow();
  });
});
