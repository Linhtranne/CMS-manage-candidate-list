import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import type { Locale } from './config';
import { I18nProvider } from './provider';
import { useI18n } from './use-i18n';

function Probe() {
  const { locale, setLocale, t, formatNumber, formatPercent } = useI18n();
  return (
    <div>
      <p>{t('common.actions.save')}</p>
      <p data-testid="locale">{locale}</p>
      <p data-testid="number">{formatNumber(1234.5)}</p>
      <p data-testid="percent">{formatPercent(0.25)}</p>
      {(['vi', 'en', 'ja'] as Locale[]).map((value) => (
        <button key={value} type="button" onClick={() => setLocale(value)}>{value}</button>
      ))}
    </div>
  );
}

describe('I18nProvider', () => {
  beforeEach(() => {
    document.cookie = 'cms_locale=; Max-Age=0; Path=/';
    document.documentElement.lang = 'vi';
  });

  it('renders translations and Intl values with the initial locale', () => {
    render(<I18nProvider initialLocale="en"><Probe /></I18nProvider>);

    expect(screen.getByText('Save')).toBeInTheDocument();
    expect(screen.getByTestId('locale')).toHaveTextContent('en');
    expect(screen.getByTestId('number')).toHaveTextContent('1,234.5');
    expect(screen.getByTestId('percent')).toHaveTextContent('25%');
  });

  it('changes language without remounting and persists the preference', async () => {
    const user = userEvent.setup();
    render(<I18nProvider initialLocale="vi"><Probe /></I18nProvider>);

    await user.click(screen.getByRole('button', { name: 'ja' }));

    expect(screen.getByText('保存')).toBeInTheDocument();
    expect(screen.getByTestId('locale')).toHaveTextContent('ja');
    expect(document.documentElement.lang).toBe('ja');
    expect(document.cookie).toContain('cms_locale=ja');
  });
});
