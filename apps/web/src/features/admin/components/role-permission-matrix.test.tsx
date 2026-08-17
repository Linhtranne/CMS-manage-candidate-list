import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';
import { adminRolesFixture } from '@/mocks/fixtures/admin';
import { RolePermissionMatrix } from './role-permission-matrix';

describe('RolePermissionMatrix', () => {
  it('does not infer business-content access from configuration admin role', () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={client}><RolePermissionMatrix role={adminRolesFixture.find((role) => role.id === 'config-admin')!} /></QueryClientProvider>);
    expect(screen.getByRole('checkbox', { name: 'Đọc nội dung email' })).not.toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Quản lý danh mục' })).toBeChecked();
  });

  it('resets draft permissions when the selected role changes', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { rerender } = render(<QueryClientProvider client={client}><RolePermissionMatrix role={adminRolesFixture.find((role) => role.id === 'config-admin')!} /></QueryClientProvider>);
    expect(screen.getByRole('checkbox', { name: 'Quản lý danh mục' })).toBeChecked();
    rerender(<QueryClientProvider client={client}><RolePermissionMatrix role={adminRolesFixture.find((role) => role.id === 'recruiter')!} /></QueryClientProvider>);
    await waitFor(() => expect(screen.getByRole('checkbox', { name: 'Quản lý danh mục' })).not.toBeChecked());
    expect(screen.getByRole('checkbox', { name: 'Xem hồ sơ cơ bản' })).toBeChecked();
    expect(screen.getByLabelText('Xem hồ sơ cơ bản phạm vi')).toHaveValue('TEAM');
  });
});
