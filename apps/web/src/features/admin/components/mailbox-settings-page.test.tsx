import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderWithI18n } from '@/i18n/test-utils';
import { MailboxSettingsPage } from './mailbox-settings-page';

describe('MailboxSettingsPage', () => {
  it('never renders a saved mailbox credential', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    renderWithI18n(<QueryClientProvider client={client}><MailboxSettingsPage /></QueryClientProvider>, 'en');
    expect(await screen.findByText('ungvien@company.vn')).toBeVisible();
    expect(screen.queryByDisplayValue(/secret|token/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Credential:/)).toBeVisible();
  });
});
