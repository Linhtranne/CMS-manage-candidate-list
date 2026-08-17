import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { OrderStatusForm } from './order-status-form';
import { OrderListPage } from './order-list-page';
import { orderFixtures } from '@/mocks/fixtures/orders';

describe('OrderStatusForm', () => {
  it('closes a filled order without asking for a reason', async () => {
    const onSaved = vi.fn();
    const filledOrder = { ...orderFixtures[0], status: 'FILLED' as const };
    render(<OrderStatusForm order={filledOrder} onSaved={onSaved} />);
    await userEvent.selectOptions(screen.getByLabelText('Trạng thái'), 'CLOSED');
    await userEvent.click(screen.getByRole('button', { name: 'Lưu thay đổi' }));
    expect(screen.queryByLabelText('Lý do đóng đơn')).not.toBeInTheDocument();
    expect(screen.getByText('Hệ thống tự ghi nhận lý do hoàn tất nhu cầu vào lịch sử.')).toBeVisible();
    expect(onSaved).toHaveBeenCalledOnce();
  });
});

describe('OrderListPage', () => {
  it('opens the full order profile sheet without losing list filters', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    window.history.replaceState({}, '', '/orders?query=ORD-IT');

    render(<QueryClientProvider client={client}><OrderListPage /></QueryClientProvider>);

    await userEvent.click(await screen.findByText('Kỹ sư phần mềm'));
    expect(screen.getByRole('dialog', { name: 'Hồ sơ đơn tuyển' })).toBeVisible();
    expect(screen.getByRole('tab', { name: 'Tổng quan' })).toBeVisible();
    expect(window.location.search).toContain('selectedId=order-01');
    expect(window.location.search).toContain('query=ORD-IT');
  });
});
