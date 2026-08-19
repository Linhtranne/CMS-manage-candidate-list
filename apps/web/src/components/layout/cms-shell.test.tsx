import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { managerFixture, recruiterFixture } from '@/mocks/fixtures/users';
import { QueryProvider } from '@/providers/query-provider';
import { CmsShell } from './cms-shell';

describe('CmsShell', () => {
  it('shows eight CMS areas and hides Admin without permission', () => {
    render(<QueryProvider><CmsShell user={recruiterFixture}><div>Nội dung công việc</div></CmsShell></QueryProvider>);

    expect(screen.getByRole('link', { name: 'Việc của tôi' })).toBeVisible();
    expect(screen.getByRole('link', { name: 'Hộp thư chung' })).toBeVisible();
    expect(screen.getAllByRole('link')).toHaveLength(8);
    expect(screen.queryByText('Quản trị')).not.toBeInTheDocument();
  });

  it('exposes clients and orders as separate navigation entries', () => {
    render(<QueryProvider><CmsShell user={recruiterFixture}><div>Nội dung công việc</div></CmsShell></QueryProvider>);

    expect(screen.getByRole('link', { name: 'Khách hàng' })).toHaveAttribute('href', '/clients');
    expect(screen.getByRole('link', { name: 'Đơn tuyển' })).toHaveAttribute('href', '/orders');
  });

  it('exposes admin entry and logout for users with admin access', () => {
    render(<QueryProvider><CmsShell user={managerFixture}><div>Nội dung công việc</div></CmsShell></QueryProvider>);

    expect(screen.getAllByRole('link', { name: 'Quản trị' }).every((link) => link.getAttribute('href') === '/admin')).toBe(true);
    expect(screen.getByRole('button', { name: 'Đăng xuất' })).toBeVisible();
  });

  it('keeps the mobile navigation inside the viewport and closes with Escape', async () => {
    const user = userEvent.setup();
    render(<QueryProvider><CmsShell user={recruiterFixture}><div>Nội dung công việc</div></CmsShell></QueryProvider>);

    const openButtons = screen.getAllByRole('button', { name: 'Mở điều hướng' });
    await user.click(openButtons[openButtons.length - 1]!);

    const navigation = screen.getByRole('dialog', { name: 'Điều hướng CMS' });
    expect(navigation.querySelector('button.cms-mobile-navigation-backdrop')).toHaveAttribute('aria-hidden', 'true');
    expect(navigation.querySelector('button.cms-mobile-navigation-backdrop')).toHaveAttribute('tabindex', '-1');
    expect(document.activeElement).toBe(navigation);
    const sidebars = screen.getAllByRole('complementary', { name: 'Điều hướng CMS' });
    expect(sidebars[sidebars.length - 1]).toHaveClass('cms-sidebar-mobile');
    expect(sidebars[sidebars.length - 1]?.querySelector('button[aria-label="Đóng điều hướng"]')).toBeNull();
    expect(document.body.style.overflow).toBe('hidden');

    await user.keyboard('{Escape}');

    expect(navigation).toHaveAttribute('data-state', 'closing');
    fireEvent(navigation, new Event('animationend', { bubbles: true }));
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Điều hướng CMS' })).not.toBeInTheDocument());
    expect(document.body.style.overflow).toBe('');
    expect(document.activeElement).toBe(openButtons[openButtons.length - 1]);
  });
});
