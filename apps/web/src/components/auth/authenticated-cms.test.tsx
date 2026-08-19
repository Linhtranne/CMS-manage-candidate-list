import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryProvider } from '@/providers/query-provider';
import { AuthenticatedCms } from './authenticated-cms';

vi.mock('next/navigation', () => ({
  usePathname: () => window.location.pathname
}));

describe('AuthenticatedCms', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/work');
  });

  it('loads the current internal session before rendering the shell', async () => {
    render(<QueryProvider><AuthenticatedCms><div>Protected content</div></AuthenticatedCms></QueryProvider>);

    expect(await screen.findByText('Protected content')).toBeVisible();
  });

  it('blocks the admin route when the current user lacks admin permission', async () => {
    window.history.replaceState({}, '', '/admin');
    render(<QueryProvider><AuthenticatedCms><div>Protected admin content</div></AuthenticatedCms></QueryProvider>);

    expect(await screen.findByRole('heading', { name: 'Bạn không có quyền truy cập' })).toBeVisible();
    expect(screen.queryByText('Protected admin content')).not.toBeInTheDocument();
  });
});
