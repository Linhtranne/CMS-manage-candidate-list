import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { MailboxPage } from './mailbox-page';
import { renderWithI18n } from '@/i18n/test-utils';

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
    const conversationDialog = screen.getByRole('dialog', { name: 'Chi tiết hộp thư chung' });
    await userEvent.click(screen.getByRole('button', { name: 'Trả lời' }));
    expect(await screen.findByRole('dialog', { name: 'Soạn email trả lời' })).toBeVisible();
    expect(conversationDialog).toHaveAttribute('aria-hidden', 'true');
    expect(conversationDialog).toHaveAttribute('inert');
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

  it('localizes conversation statuses with the active locale', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    renderWithI18n(<QueryClientProvider client={client}><MailboxPage /></QueryClientProvider>, 'ja');

    expect(await screen.findByText('対応が必要')).toBeVisible();
    expect(screen.getByText('未紐付け')).toBeVisible();
    expect(screen.getByText('送信済み')).toBeVisible();
  });
});
