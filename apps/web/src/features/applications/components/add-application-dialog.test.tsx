import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AddApplicationDialog } from './add-application-dialog';

describe('AddApplicationDialog', () => {
  it('loads all recruiting orders from the API-compatible status filter', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={client}><AddApplicationDialog open onClose={() => undefined} /></QueryClientProvider>);

    const select = await screen.findByRole('combobox', { name: 'Đơn tuyển để tạo ứng tuyển' });
    expect(select).toHaveDisplayValue('Chọn đơn tuyển đang tuyển');
    expect(screen.getByRole('option', { name: 'ORD-IT-01 · Kỹ sư phần mềm' })).toBeVisible();
    expect(screen.getByRole('option', { name: 'ORD-MECH-01 · Kỹ thuật viên cơ khí' })).toBeVisible();
    expect(screen.getByRole('option', { name: 'ORD-CARE-01 · Điều dưỡng' })).toBeVisible();
  });
});
