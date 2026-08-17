import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

const navigation = vi.hoisted(() => ({
  router: { back: vi.fn(), replace: vi.fn() }
}));

vi.mock('next/navigation', () => ({
  useRouter: () => navigation.router,
  useSearchParams: () => new URLSearchParams(window.location.search)
}));

import { ClientDetailPage } from './client-detail-page';

describe('ClientDetailPage', () => {
  it('shows the full profile hierarchy and keeps tab navigation in the URL', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    window.history.replaceState({}, '', '/clients/client-02?tab=overview');

    render(<QueryClientProvider client={client}><ClientDetailPage clientId="client-02" /></QueryClientProvider>);

    expect(await screen.findByRole('heading', { name: 'Sakura Care Partners' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Quay lại danh sách' })).toBeVisible();
    expect(screen.getAllByText('Đơn đang tuyển')[0]).toBeVisible();

    await userEvent.click(screen.getByRole('tab', { name: 'Đơn tuyển' }));

    expect(navigation.router.replace).toHaveBeenCalledWith('/clients/client-02?tab=orders', { scroll: false });
  });
});
