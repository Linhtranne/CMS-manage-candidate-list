import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ComponentProps } from 'react';
import { describe, expect, it } from 'vitest';
import { applicationFixtures, toApplicationDetail } from '@/mocks/fixtures/applications';
import { InterviewForm } from './interview-form';

function renderForm(props: ComponentProps<typeof InterviewForm>) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}><InterviewForm {...props} /></QueryClientProvider>);
}

describe('InterviewForm', () => {
  it('requires timezone and preserves the previous schedule on reschedule', async () => {
    const application = toApplicationDetail(applicationFixtures.find((item) => item.id === 'application-waiting-01')!);
    const interview = application.interviews[0]!;
    renderForm({ application, interview, mode: 'reschedule' });
    await userEvent.selectOptions(screen.getByLabelText('Múi giờ'), '');
    await userEvent.click(screen.getByRole('button', { name: 'Xác nhận đổi lịch' }));
    expect(screen.getByText('Vui lòng chọn múi giờ')).toBeVisible();
    expect(screen.getByText(/Lịch cũ:/)).toBeVisible();
  });

  it('requires a valid online URL', async () => {
    const application = toApplicationDetail(applicationFixtures[0]!);
    renderForm({ application });
    await userEvent.type(screen.getByLabelText('Thời gian phỏng vấn'), '2026-08-20T09:00');
    await userEvent.clear(screen.getByLabelText('Đường dẫn phòng phỏng vấn'));
    await userEvent.type(screen.getByLabelText('Đường dẫn phòng phỏng vấn'), 'not-a-url');
    await userEvent.click(screen.getByRole('button', { name: 'Lưu lịch phỏng vấn' }));
    expect(screen.getByText('Đường dẫn phòng phỏng vấn không hợp lệ')).toBeVisible();
  });
});
