import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { renderWithI18n } from '@/i18n/test-utils';
import { AccountPage } from './account-page';

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return renderWithI18n(<QueryClientProvider client={client}><AccountPage /></QueryClientProvider>);
}

describe('AccountPage', () => {
  it('shows the signed-in user and saves a display name', async () => {
    renderPage();
    expect(await screen.findByRole('heading', { name: 'Tài khoản của tôi' })).toBeVisible();
    const displayName = await screen.findByLabelText('Tên hiển thị');
    await userEvent.setup().clear(displayName);
    await userEvent.setup().type(displayName, 'Nguyễn Minh Anh mới');
    await userEvent.setup().click(screen.getByRole('button', { name: 'Lưu thông tin' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Đã lưu thông tin tài khoản.');
  });

  it('blocks a mismatched password confirmation before sending', async () => {
    renderPage();
    const user = userEvent.setup();
    await screen.findByRole('heading', { name: 'Tài khoản của tôi' });
    await user.type(screen.getByLabelText('Mật khẩu hiện tại'), 'Current-Password-1');
    await user.type(screen.getByLabelText('Mật khẩu mới'), 'New-Password-1');
    await user.type(screen.getByLabelText('Nhập lại mật khẩu mới'), 'Different-Password-1');
    await user.click(screen.getByRole('button', { name: 'Đổi mật khẩu' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Hai mật khẩu mới không trùng khớp.');
  });
});
