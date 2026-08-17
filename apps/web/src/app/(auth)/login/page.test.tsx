import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import LoginPage from './page';

describe('LoginPage', () => {
  it('renders an internal staff login form', () => {
    render(<LoginPage />);

    expect(screen.getByRole('heading', { name: 'Đăng nhập CMS' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Đăng nhập' })).toBeVisible();
  });
});
