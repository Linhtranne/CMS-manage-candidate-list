import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { CandidateListPage } from './candidate-list-page';

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}><CandidateListPage initialView="potential" /></QueryClientProvider>);
}

describe('candidate form modals', () => {
  it('validates and creates a candidate from the standard modal', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole('button', { name: 'Thêm ứng viên' }));
    expect(screen.getByRole('dialog', { name: 'Thêm ứng viên' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Lưu ứng viên' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Vui lòng nhập họ tên');
    expect(screen.getByLabelText('Họ và tên')).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByLabelText('Họ và tên')).toHaveAttribute('aria-describedby', 'create-candidate-error');
    await waitFor(() => expect(screen.getByLabelText('Họ và tên')).toHaveFocus());
    await user.type(screen.getByLabelText('Họ và tên'), 'Nguyễn Form Mới');
    await user.selectOptions(screen.getByLabelText('Ngành nghề'), 'Điều dưỡng');
    await user.type(screen.getByLabelText('Nghề nghiệp chính'), 'Nhân viên chăm sóc');
    await user.click(screen.getByRole('button', { name: 'Lưu ứng viên' }));
    expect(await screen.findByText('Đã tạo hồ sơ ứng viên UV-0012')).toBeInTheDocument();
  });

  it('shows import preview and records the import result in a modal', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole('button', { name: 'Import ứng viên' }));
    const input = screen.getByLabelText('Tệp ứng viên');
    await user.upload(input, new File(['name,industry\nA,IT\nB,Care'], 'candidates.csv', { type: 'text/csv' }));
    expect(await screen.findByText('2 dòng hợp lệ')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Xác nhận import' }));
    expect(await screen.findByText('Đã import 2 hồ sơ ứng viên')).toBeInTheDocument();
  });

  it('opens duplicate review and records an explicit review action', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole('button', { name: 'Rà soát nghi trùng' }));
    expect(screen.getByRole('dialog', { name: 'Rà soát ứng viên nghi trùng' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Đánh dấu đã rà soát' }));
    expect(await screen.findByText('Đã ghi nhận kết quả rà soát trùng')).toBeInTheDocument();
  });
});
