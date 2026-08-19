import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { managerFixture } from '@/mocks/fixtures/users';
import { Sidebar } from './sidebar';

vi.mock('next/navigation', () => ({
  usePathname: () => '/admin/users'
}));

describe('Sidebar', () => {
  it('marks the admin section active on admin detail routes', () => {
    render(<Sidebar user={managerFixture} />);

    const adminLink = screen.getByRole('link', { name: 'Quản trị' });
    expect(adminLink).toHaveAttribute('href', '/admin');
    expect(adminLink).toHaveAttribute('aria-current', 'page');
    expect(adminLink).toHaveClass('bg-[#e8f1fb]', 'text-accent');
  });
});
