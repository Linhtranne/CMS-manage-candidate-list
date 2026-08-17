import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { WorkDrawer } from './work-drawer';

describe('WorkDrawer', () => {
  it('shows why the task exists and completes with optimistic concurrency', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={client}><WorkDrawer workItemId="work-overdue-01" open onClose={() => undefined} /></QueryClientProvider>);
    expect(await screen.findByText('Chưa nhập kết quả phỏng vấn')).toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: 'Đánh dấu hoàn thành' }));
    expect(await screen.findByText('Đã hoàn thành công việc')).toBeVisible();
  });
});
