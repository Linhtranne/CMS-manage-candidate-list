import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { CandidateListPage } from './candidate-list-page';

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}><CandidateListPage initialView="potential" /></QueryClientProvider>);
}

describe('CandidateListPage', () => {
  it('renders potential candidates and opens the selected candidate drawer', async () => {
    renderPage();
    expect(await screen.findByRole('tab', { name: 'Ứng viên tiềm năng' })).toBeInTheDocument();
    const row = await screen.findByRole('row', { name: /UV-0009/ });
    expect(row).toBeInTheDocument();
    await userEvent.click(row);
    expect(await screen.findByRole('dialog', { name: 'Hồ sơ ứng viên' })).toBeInTheDocument();
    expect(screen.queryByText('Mở hồ sơ đầy đủ')).not.toBeInTheDocument();
  });

  it('switches saved views through the URL state and filters the list', async () => {
    renderPage();
    await userEvent.click(await screen.findByRole('tab', { name: 'Đang ứng tuyển' }));
    expect(await screen.findByRole('row', { name: /UV-0001/ })).toBeInTheDocument();
    expect(screen.queryByRole('row', { name: /UV-0009/ })).not.toBeInTheDocument();
  });

  it('switches views with arrow keys when focus stays on the tablist', async () => {
    const user = userEvent.setup();
    renderPage();

    const activeTab = await screen.findByRole('tab', { name: 'Ứng viên tiềm năng' });
    await user.click(activeTab);
    await user.keyboard('{ArrowRight}');

    expect(screen.getByRole('tab', { name: 'Mới / chưa phân công' })).toHaveAttribute('aria-selected', 'true');
  });
});
