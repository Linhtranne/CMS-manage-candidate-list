import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { ApplicationListPage } from './application-list-page';

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}><ApplicationListPage /></QueryClientProvider>);
}

describe('ApplicationListPage', () => {
  beforeEach(() => window.history.replaceState({}, '', '/applications'));

  it('keeps a multi-round application in both interviewed and waiting-interview views', async () => {
    renderPage();
    await userEvent.click(screen.getByRole('tab', { name: 'Đã phỏng vấn' }));
    expect(await screen.findByText('Phạm Hoàng Nam')).toBeVisible();
    await userEvent.click(screen.getByRole('tab', { name: 'Chờ phỏng vấn' }));
    expect(await screen.findByText('Phạm Hoàng Nam')).toBeVisible();
  });

  it('opens a direct large profile sheet and preserves URL view state', async () => {
    window.history.replaceState({}, '', '/applications?view=waiting-interview&query=UV-0001');
    renderPage();
    await userEvent.click(await screen.findByText('Nguyễn Minh An'));
    expect(screen.getByRole('dialog', { name: 'Hồ sơ ứng tuyển' })).toBeVisible();
    expect(screen.getByRole('tab', { name: 'Lịch phỏng vấn' })).toBeVisible();
    expect(window.location.search).toContain('selectedId=application-waiting-01');
    expect(window.location.search).toContain('view=waiting-interview');
    expect(window.location.search).toContain('query=UV-0001');
  });

  it('opens interview operations in a focused modal instead of below the fold', async () => {
    window.history.replaceState({}, '', '/applications?view=waiting-interview');
    renderPage();

    await userEvent.click(await screen.findByText('Nguyễn Minh An'));
    await userEvent.click(screen.getByRole('button', { name: 'Lên lịch phỏng vấn' }));

    const dialog = screen.getByRole('dialog', { name: 'Lên lịch vòng 2' });
    expect(dialog).toBeVisible();
    expect(dialog).toHaveFocus();
    expect(dialog).toContainElement(screen.getByLabelText('Thời gian phỏng vấn'));
  });
});
