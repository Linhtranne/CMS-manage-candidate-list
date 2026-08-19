import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderWithI18n } from '@/i18n/test-utils';
import { LocalizedSkipLink } from './localized-skip-link';

describe('LocalizedSkipLink', () => {
  it('uses the active locale for its accessible text', () => {
    renderWithI18n(<LocalizedSkipLink />, 'ja');

    expect(screen.getByRole('link', { name: 'メインコンテンツへ移動' })).toHaveAttribute('href', '#main-content');
  });
});
