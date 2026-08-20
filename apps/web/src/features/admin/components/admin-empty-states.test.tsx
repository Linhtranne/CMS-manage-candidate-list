import { render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuditLogPage } from './audit-log-page';
import { TemplatesPage } from './templates-page';

const mocks = vi.hoisted(() => ({
  useAdminTemplates: vi.fn(),
  useCreateAdminTemplate: vi.fn(),
  useRetireAdminTemplate: vi.fn(),
  useAdminAudit: vi.fn()
}));

vi.mock('../services/admin-queries', () => mocks);

describe('admin empty states', () => {
  beforeEach(() => {
    mocks.useAdminTemplates.mockReturnValue({ isPending: false, error: null, data: { items: [] } });
    mocks.useCreateAdminTemplate.mockReturnValue({ isPending: false, mutate: vi.fn() });
    mocks.useRetireAdminTemplate.mockReturnValue({ isPending: false, mutate: vi.fn() });
    mocks.useAdminAudit.mockReturnValue({ isPending: false, error: null, data: { items: [] } });
  });

  it('explains how to start when no templates exist', () => {
    render(<TemplatesPage />);

    expect(screen.getByRole('region', { name: 'Chưa có mẫu' })).toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: 'Chưa có mẫu' })).getByRole('button', { name: 'Tạo mẫu' })).toBeInTheDocument();
  });

  it('explains when the audit filter has no matching entries', () => {
    render(<AuditLogPage />);

    expect(screen.getByRole('region', { name: 'Không có bản ghi audit' })).toBeInTheDocument();
  });
});
