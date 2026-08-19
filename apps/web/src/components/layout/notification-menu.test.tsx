import userEvent from '@testing-library/user-event';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { NotificationMenu } from './notification-menu';

describe('NotificationMenu', () => {
  it('uses a bell icon while keeping an accessible name', () => {
    render(<NotificationMenu />);

    const button = screen.getByRole('button', { name: 'Thông báo' });
    expect(button.querySelector('svg')).toBeInTheDocument();
    expect(button).toHaveAttribute('title', 'Thông báo');
  });

  it('closes the notification popover with Escape', async () => {
    const user = userEvent.setup();
    render(<NotificationMenu />);

    await user.click(screen.getByRole('button', { name: 'Thông báo' }));
    expect(screen.getByRole('region', { name: 'Danh sách thông báo' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Thông báo' })).toHaveFocus();

    await user.keyboard('{Escape}');

    expect(screen.queryByRole('region', { name: 'Danh sách thông báo' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Thông báo' })).toHaveAttribute('aria-expanded', 'false');
  });
});
