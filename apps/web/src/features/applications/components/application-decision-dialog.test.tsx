import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { applicationFixtures, toApplicationDetail } from '@/mocks/fixtures/applications';
import { ApplicationDecisionDialog } from './application-decision-dialog';

function renderDialog(applicationId: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const application = toApplicationDetail(applicationFixtures.find((item) => item.id === applicationId)!);
  return render(<QueryClientProvider client={client}><ApplicationDecisionDialog application={application} open onClose={() => undefined} /></QueryClientProvider>);
}

describe('ApplicationDecisionDialog', () => {
  it('blocks Passed until an interview result exists', async () => {
    renderDialog('application-result-01');
    await userEvent.click(screen.getByRole('button', { name: 'Xác nhận trúng tuyển' }));
    expect(screen.getByText('Cần nhập kết quả phỏng vấn trước khi xác nhận trúng tuyển.')).toBeVisible();
  });

  it('requires a reason for a failed decision', async () => {
    renderDialog('application-interviewed-01');
    await userEvent.click(screen.getByRole('button', { name: 'Xác nhận không đạt' }));
    expect(screen.getByText('Cần nhập lý do kết thúc đơn.')).toBeVisible();
  });
});
