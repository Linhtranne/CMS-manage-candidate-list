import { describe, expect, it } from 'vitest';
import type { paths } from './index';

describe('OpenAPI contract', () => {
  it('exposes the canonical authenticated workspace paths', () => {
    const pathsInContract: (keyof paths)[] = ['/me', '/search', '/auth/session', '/auth/logout', '/saved-views'];
    expect(pathsInContract).toEqual(['/me', '/search', '/auth/session', '/auth/logout', '/saved-views']);
  });
});
