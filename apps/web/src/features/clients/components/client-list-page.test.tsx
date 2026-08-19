import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { ClientListPage } from './client-list-page';
import { CreateClientModal } from './create-client-modal';

describe('ClientListPage', () => {
  it('opens the create client modal and validates required fields', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={client}><CreateClientModal open onClose={() => undefined} /></QueryClientProvider>);
    await userEvent.click(screen.getByRole('button', { name: 'Lưu khách hàng' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Vui lòng nhập tên khách hàng.');
    expect(screen.getByLabelText('Tên khách hàng')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText('Tên khách hàng')).toHaveAttribute('aria-describedby', 'create-client-error');
    await waitFor(() => expect(screen.getByLabelText('Tên khách hàng')).toHaveFocus());
  });

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
