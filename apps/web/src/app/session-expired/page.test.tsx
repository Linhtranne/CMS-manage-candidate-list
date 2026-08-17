import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import SessionExpiredPage from './page';

describe('SessionExpiredPage', () => {
  it('renders an explicit recovery action', () => {
    render(<SessionExpiredPage />);

    expect(screen.getByRole('link', { name: 'Đăng nhập lại' })).toHaveAttribute('href', '/login');
  });
});
