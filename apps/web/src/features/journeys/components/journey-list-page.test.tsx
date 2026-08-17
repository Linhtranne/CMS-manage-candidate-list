import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { JourneyListPage } from './journey-list-page';

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}><JourneyListPage /></QueryClientProvider>);
}

describe('JourneyListPage', () => {
  beforeEach(() => window.history.replaceState({}, '', '/supply-journeys'));

  it('derives waiting-candidate from a blocked milestone', async () => {
    renderPage();
    await userEvent.click(screen.getByRole('tab', { name: 'Chờ ứng viên' }));
    const row = await screen.findByRole('row', { name: /Võ Thanh Tùng/ });
    expect(row).toHaveTextContent('Hồ sơ COE');
    expect(row).toHaveTextContent('Có rủi ro');
  });
});
