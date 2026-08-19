import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import LoginPage from './page';

const { replace } = vi.hoisted(() => ({ replace: vi.fn() }));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace })
}));

describe('LoginPage', () => {
  it('renders an internal staff login form', () => {
    render(<LoginPage />);

    expect(screen.getByRole('heading', { name: 'Đăng nhập CMS' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Đăng nhập' })).toBeVisible();
  });

  it('redirects to the work queue after a successful login', async () => {
    const user = userEvent.setup();
    render(<LoginPage />);

    await user.type(screen.getByLabelText('Email công việc'), 'staff@example.com');
    await user.type(screen.getByLabelText('Mật khẩu'), 'secret');
    await user.click(screen.getByRole('button', { name: 'Đăng nhập' }));

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/work'));
  });
});
