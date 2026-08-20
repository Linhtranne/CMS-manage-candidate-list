import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { ReportPage } from './report-page';
import { renderWithI18n } from '@/i18n/test-utils';

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}><ReportPage /></QueryClientProvider>);
}

describe('ReportPage', () => {
  beforeEach(() => window.history.replaceState({}, '', '/reports'));

  it('shows denominator and navigates to the underlying records', async () => {
    renderPage();
    const metric = await screen.findByRole('link', { name: 'Trúng tuyển 18/60 — 30%' });
    expect(metric).toHaveAttribute('href', '/applications?view=passed');
    expect(screen.getByText(/Dữ liệu cập nhật lúc/)).toBeVisible();
  });

  it('keeps report filters in the URL and opens the queued export flow', async () => {
    renderPage();
    const user = userEvent.setup();
    await screen.findByRole('link', { name: 'Trúng tuyển 18/60 — 30%' });
    await user.selectOptions(screen.getByLabelText('Ngành báo cáo'), 'IT');
    expect(window.location.search).toContain('industryId=IT');
    await user.click(screen.getByRole('button', { name: 'Xuất báo cáo' }));
    expect(screen.getByRole('dialog', { name: 'Xuất báo cáo' })).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Tạo tệp xuất' }));
    expect(await screen.findByText('Đang chờ xử lý')).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Hủy' }));
  });

  it('localizes report metric labels in English', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    renderWithI18n(<QueryClientProvider client={client}><ReportPage /></QueryClientProvider>, 'en');

    expect(await screen.findByRole('link', { name: 'Open job orders 11' })).toBeVisible();
    expect(screen.getByRole('link', { name: 'Completed supply 6/12 — 50%' })).toBeVisible();
  });

  it('localizes report funnel labels in Japanese', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    renderWithI18n(<QueryClientProvider client={client}><ReportPage /></QueryClientProvider>, 'ja');

    expect(await screen.findByRole('link', { name: '供給完了 6/12 — 50%' })).toBeVisible();
    expect(screen.getByText('面接済み')).toBeVisible();
  });
});
