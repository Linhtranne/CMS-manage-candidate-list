import { describe, expect, it } from 'vitest';
import { digestFromImageRef } from '../../scripts/image-reference.mjs';

describe('digest-pinned image references', () => {
  it('extracts a normalized digest from a pinned image', () => {
    expect(digestFromImageRef('registry.example/cms/api@sha256:ABCDEF0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF0123456789'))
      .toBe('sha256:abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789');
  });

  it('rejects tags and malformed references', () => {
    expect(digestFromImageRef('registry.example/cms/api:latest')).toBeNull();
    expect(digestFromImageRef('registry.example/cms/api@sha256:short')).toBeNull();
  });
});
