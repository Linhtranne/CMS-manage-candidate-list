import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { applicationFixtures, toApplicationDetail } from '@/mocks/fixtures/applications';
import { StartJourneyDialog } from './start-journey-dialog';

describe('StartJourneyDialog', () => {
  it('blocks an active journey conflict instead of creating silently', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const application = toApplicationDetail(applicationFixtures.find((item) => item.id === 'application-journey-blocked')!);
    render(<QueryClientProvider client={client}><StartJourneyDialog application={application} open onClose={() => undefined} /></QueryClientProvider>);
    expect(await screen.findByText('Ứng viên đang có lộ trình cung ứng hiệu lực.')).toBeVisible();
    expect(screen.getByText('Chưa đủ điều kiện khởi tạo lộ trình.')).toBeVisible();
  });
});
