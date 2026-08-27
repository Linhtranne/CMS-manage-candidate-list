import userEvent from '@testing-library/user-event';
import { screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';
import { renderWithI18n } from '@/i18n/test-utils';
import { NotificationMenu } from './notification-menu';

describe('NotificationMenu', () => {
  const renderMenu = () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return renderWithI18n(<QueryClientProvider client={client}><NotificationMenu /></QueryClientProvider>);
  };

  it('uses a bell icon while keeping an accessible name', () => {
    renderMenu();

    const button = screen.getByRole('button', { name: 'Thông báo' });
    expect(button.querySelector('svg')).toBeInTheDocument();
    expect(button).toHaveAttribute('title', 'Thông báo');
  });

  it('closes the notification popover with Escape', async () => {
    const user = userEvent.setup();
    renderMenu();

    await user.click(screen.getByRole('button', { name: 'Thông báo' }));
    expect(screen.getByRole('region', { name: 'Danh sách thông báo' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Thông báo' })).toHaveFocus();

    await user.keyboard('{Escape}');

    expect(screen.queryByRole('region', { name: 'Danh sách thông báo' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Thông báo' })).toHaveAttribute('aria-expanded', 'false');
  });
});
