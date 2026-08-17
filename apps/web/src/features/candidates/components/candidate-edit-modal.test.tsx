import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { CandidateDetailPage } from './candidate-detail-page';

describe('candidate edit modal', () => {
  it('updates the candidate profile through the standard modal', async () => {
    const user = userEvent.setup();
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={client}><CandidateDetailPage candidateId="candidate-09" /></QueryClientProvider>);
    await user.click(await screen.findByRole('button', { name: 'Chỉnh sửa hồ sơ' }));
    await user.clear(screen.getByLabelText('Họ và tên'));
    await user.type(screen.getByLabelText('Họ và tên'), 'Phạm Thu Hà cập nhật');
    await user.click(screen.getByRole('button', { name: 'Lưu thay đổi' }));
    expect(await screen.findByRole('heading', { name: 'Phạm Thu Hà cập nhật' })).toBeInTheDocument();
  });
});
