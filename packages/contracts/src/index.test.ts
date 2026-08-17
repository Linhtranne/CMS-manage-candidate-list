import { describe, expect, it } from 'vitest';
import type { paths } from './index';

describe('OpenAPI contract', () => {
  it('contains the core workspace operations', () => {
    const pathsInContract: (keyof paths)[] = ['/me', '/search', '/auth/login', '/auth/logout', '/saved-views'];
    expect(pathsInContract).toHaveLength(5);
  });
});
