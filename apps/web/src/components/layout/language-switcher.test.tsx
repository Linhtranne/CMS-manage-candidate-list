import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { renderWithI18n } from '@/i18n/test-utils';
import { LanguageSwitcher } from './language-switcher';

describe('LanguageSwitcher', () => {
  it('changes visible language without replacing the current document', async () => {
    const user = userEvent.setup();
    renderWithI18n(<LanguageSwitcher />, 'en');

    const select = screen.getByRole('combobox', { name: 'Language' });
    expect(select).toHaveValue('en');

    await user.selectOptions(select, 'ja');

    expect(screen.getByRole('combobox', { name: '言語' })).toHaveValue('ja');
    expect(document.documentElement.lang).toBe('ja');
  });
});
