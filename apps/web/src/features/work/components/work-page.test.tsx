import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { WorkPage } from './work-page';

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}><WorkPage /></QueryClientProvider>);
}

describe('WorkPage', () => {
  it('filters overdue work from the summary label', async () => {
    renderPage();
    await userEvent.click(await screen.findByRole('button', { name: /Quá hạn 3/ }));
    expect(window.location.search).toContain('view=overdue');
    expect(screen.getByRole('columnheader', { name: 'Hạn xử lý' })).toBeVisible();
  });
});
