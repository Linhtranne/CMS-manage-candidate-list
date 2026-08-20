import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { WorkPage } from './work-page';
import { renderWithI18n } from '@/i18n/test-utils';

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return renderWithI18n(<QueryClientProvider client={client}><WorkPage /></QueryClientProvider>);
}

describe('WorkPage', () => {
  it('filters overdue work from the summary label', async () => {
    renderPage();
    await userEvent.click(await screen.findByRole('button', { name: /Quá hạn 3/ }));
    expect(window.location.search).toContain('view=overdue');
    expect(screen.getByRole('columnheader', { name: 'Hạn xử lý' })).toBeVisible();
  });

  it('renders the work queue in English', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    renderWithI18n(<QueryClientProvider client={client}><WorkPage /></QueryClientProvider>, 'en');

    expect(await screen.findByRole('heading', { name: 'My work' })).toBeVisible();
    expect(await screen.findByRole('columnheader', { name: 'Due' })).toBeVisible();
  });
});
