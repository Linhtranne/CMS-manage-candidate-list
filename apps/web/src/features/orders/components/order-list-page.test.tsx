import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { OrderStatusForm } from './order-status-form';
import { OrderListPage } from './order-list-page';
import { orderFixtures } from '@/mocks/fixtures/orders';
import { CreateOrderModal } from './create-order-modal';
import { OrderDetailPage } from './order-detail-page';

describe('OrderStatusForm', () => {
  it('closes a filled order without asking for a reason', async () => {
    const onSaved = vi.fn();
    const originalStatus = orderFixtures[0].status;
    orderFixtures[0].status = 'FILLED';
    const filledOrder = { ...orderFixtures[0], status: 'FILLED' as const };
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    try {
      render(<QueryClientProvider client={client}><OrderStatusForm order={filledOrder} onSaved={onSaved} /></QueryClientProvider>);
      await userEvent.selectOptions(screen.getByLabelText('Trạng thái'), 'CLOSED');
      await userEvent.click(screen.getByRole('button', { name: 'Lưu thay đổi' }));
      expect(screen.queryByLabelText('Lý do đóng đơn')).not.toBeInTheDocument();
      expect(screen.getByText('Hệ thống tự ghi nhận lý do hoàn tất nhu cầu vào lịch sử.')).toBeVisible();
      await waitFor(() => expect(onSaved).toHaveBeenCalledOnce());
    } finally {
      orderFixtures[0].status = originalStatus;
    }
  });
});

describe('CreateOrderModal', () => {
  it('renders the client-backed order form instead of a no-op action', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={client}><CreateOrderModal open onClose={() => undefined} /></QueryClientProvider>);
    expect(await screen.findByLabelText('Khách hàng của đơn tuyển')).toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: 'Lưu đơn tuyển' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Vui lòng điền đủ các trường bắt buộc.');
    expect(screen.getByLabelText('Vị trí tuyển')).toHaveAttribute('name', 'order-position');
    expect(screen.getByLabelText('Vị trí tuyển')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText('Vị trí tuyển')).toHaveAttribute('aria-describedby', 'create-order-error');
    await waitFor(() => expect(screen.getByLabelText('Vị trí tuyển')).toHaveFocus());
  });
});

describe('OrderDetailPage', () => {
  it('uses the order position as the page heading', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={client}><OrderDetailPage orderId="order-01" /></QueryClientProvider>);

    expect(await screen.findByRole('heading', { level: 1, name: 'Kỹ sư phần mềm' })).toBeVisible();
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
