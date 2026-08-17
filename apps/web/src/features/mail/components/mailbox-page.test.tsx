import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { MailboxPage } from './mailbox-page';

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}><MailboxPage /></QueryClientProvider>);
}

describe('MailboxPage', () => {
  beforeEach(() => window.history.replaceState({}, '', '/mailbox'));

  it('separates internal notes and supports an audited queued reply', async () => {
    renderPage();
    await userEvent.click(screen.getByRole('tab', { name: 'Cần xử lý' }));
    await userEvent.click(await screen.findByText('Xác nhận lịch phỏng vấn'));
    expect(await screen.findByText('Ghi chú nội bộ')).toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: 'Trả lời' }));
    expect(await screen.findByRole('dialog', { name: 'Soạn email trả lời' })).toBeVisible();
    await userEvent.type(screen.getByLabelText('Nội dung'), 'Cảm ơn bạn đã phản hồi.');
    await userEvent.click(screen.getByRole('button', { name: 'Gửi email' }));
    expect((await screen.findAllByText('Đang chờ gửi')).length).toBeGreaterThan(0);
  });

  it('opens conversation details in an animated modal and closes with Escape', async () => {
    renderPage();
    await userEvent.click(await screen.findByText('Xác nhận lịch phỏng vấn'));
    const modal = await screen.findByRole('dialog', { name: 'Chi tiết hộp thư chung' });
    expect(modal).toBeVisible();
    expect(modal.parentElement).toHaveAttribute('data-state', 'open');
    await userEvent.keyboard('{Escape}');
    expect(modal.parentElement).toHaveAttribute('data-state', 'closing');
  });
});
