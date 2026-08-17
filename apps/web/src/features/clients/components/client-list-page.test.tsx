import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { ClientListPage } from './client-list-page';

describe('ClientListPage', () => {
  it('opens the full client profile sheet without losing list filters', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    window.history.replaceState({}, '', '/clients?query=sakura');
    render(<QueryClientProvider client={client}><ClientListPage /></QueryClientProvider>);
    await userEvent.click(await screen.findByText('Sakura Care Partners'));
    expect(screen.getByRole('dialog', { name: 'Hồ sơ khách hàng' })).toBeVisible();
    expect(screen.getByRole('tab', { name: 'Tổng quan' })).toBeVisible();
    expect(window.location.search).toContain('selectedId=client-02');
    expect(window.location.search).toContain('query=sakura');
  });
});
