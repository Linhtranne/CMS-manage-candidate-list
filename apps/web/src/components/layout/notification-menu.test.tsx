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
});
