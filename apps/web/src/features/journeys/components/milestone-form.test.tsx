import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { journeyDetails } from '@/mocks/fixtures/journeys';
import { MilestoneForm } from './milestone-form';

describe('MilestoneForm', () => {
  const renderForm = (journey: typeof journeyDetails[number], milestone: typeof journeyDetails[number]['milestones'][number]) => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(<QueryClientProvider client={client}><MilestoneForm journey={journey} milestone={milestone} onCancel={() => undefined} /></QueryClientProvider>);
  };

  it('requires evidence before completing a milestone', async () => {
    const journey = journeyDetails[0];
    const milestone = journey.milestones[1];
    renderForm(journey, { ...milestone, evidenceIds: [], requiredEvidenceCount: 2, completedEvidenceCount: 0 });
    await userEvent.selectOptions(screen.getByLabelText('Trạng thái mốc'), 'COMPLETED');
    await userEvent.click(screen.getByRole('button', { name: 'Lưu mốc' }));
    expect(screen.getByText('Mốc chưa đủ bằng chứng bắt buộc.')).toBeVisible();
  });

  it('does not show departure fields for a journey without departure context', () => {
    const journey = journeyDetails[1];
    const milestone = journey.milestones[1];
    renderForm(journey, milestone);
    expect(screen.queryByLabelText('Ngày dự kiến xuất cảnh')).not.toBeInTheDocument();
  });
});
