import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { ReportPage } from './report-page';

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
});
