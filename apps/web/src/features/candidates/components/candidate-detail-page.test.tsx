import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CandidateDetailPage } from './candidate-detail-page';

describe('CandidateDetailPage', () => {
  it('renders the candidate identity and operational tabs', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={client}><CandidateDetailPage candidateId="candidate-09" /></QueryClientProvider>);
    expect(await screen.findByRole('heading', { name: 'Phạm Thu Hà' })).toBeInTheDocument();
    expect(screen.getByText('Ứng viên tiềm năng')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Lộ trình cung ứng' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Tệp & ghi chú' })).toBeInTheDocument();
  });
});
