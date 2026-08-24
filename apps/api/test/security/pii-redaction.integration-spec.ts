import { describe, expect, it } from 'vitest';
import { redactStructuredValue } from '../../src/platform/security/redaction.js';
describe('PII redaction sentinel', () => {
  it('redacts known secret keys recursively', () => { expect(redactStructuredValue({ password: 'x', nested: { token: 'y' }, safe: 'ok' })).toEqual({ nested: {}, safe: 'ok' }); });
});
