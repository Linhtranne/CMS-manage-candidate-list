import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { managerFixture } from '@/mocks/fixtures/users';
import { renderWithI18n } from '@/i18n/test-utils';
import { Sidebar } from './sidebar';

vi.mock('next/navigation', () => ({
  usePathname: () => '/admin/users'
}));

describe('Sidebar', () => {
  it('marks the admin section active on admin detail routes', () => {
    renderWithI18n(<Sidebar user={managerFixture} />);

    const adminLink = screen.getByRole('link', { name: 'Quản trị' });
    expect(adminLink).toHaveAttribute('href', '/admin');
    expect(adminLink).toHaveAttribute('aria-current', 'page');
    expect(adminLink).toHaveClass('bg-[#e8f1fb]', 'text-accent');
  });

  it('resolves navigation labels from the active locale', () => {
    renderWithI18n(<Sidebar user={managerFixture} />, 'ja');

    expect(screen.getByRole('link', { name: '候補者' })).toHaveAttribute('href', '/candidates');
    expect(screen.getByRole('link', { name: '管理' })).toHaveAttribute('href', '/admin');
  });
});
