import { describe, expect, it } from 'vitest';
import { createLocalizedMetadata } from './metadata';

describe('createLocalizedMetadata', () => {
  it('returns application metadata in the requested locale', () => {
    expect(createLocalizedMetadata('en')).toEqual({
      title: 'Candidate Supply CMS',
      description: 'Internal CMS for recruitment and workforce supply to Japan'
    });
  });
});
