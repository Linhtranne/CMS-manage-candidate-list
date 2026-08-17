import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { AddCandidatesDialog } from './add-candidates-dialog';

describe('AddCandidatesDialog', () => {
  it('disables a candidate who already has an active application in the order', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={client}><AddCandidatesDialog orderId="order-01" open onClose={() => undefined} /></QueryClientProvider>);
    const row = await screen.findByRole('row', { name: /Nguyễn Minh An.*Đã trong đơn/ });
    expect(within(row).getByRole('checkbox')).toBeDisabled();
  });

  it('toggles an available candidate when any part of the row is clicked', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={client}><AddCandidatesDialog orderId="order-01" open onClose={() => undefined} /></QueryClientProvider>);
    const row = await screen.findByRole('row', { name: /Võ Thanh Tùng.*Đang có lộ trình cung ứng/ });
    const checkbox = within(row).getByRole('checkbox');

    expect(checkbox).not.toBeChecked();
    await userEvent.click(within(row).getByText(/Võ Thanh Tùng/));
    expect(checkbox).toBeChecked();
  });
});
