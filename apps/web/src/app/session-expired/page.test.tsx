import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderWithI18n } from '@/i18n/test-utils';
import SessionExpiredPage from './page';

describe('SessionExpiredPage', () => {
  it('renders an explicit recovery action', () => {
    renderWithI18n(<SessionExpiredPage />);

    expect(screen.getByRole('link', { name: 'Đăng nhập lại' })).toHaveAttribute('href', '/login');
  });

  it('renders the recovery action in Japanese', () => {
    renderWithI18n(<SessionExpiredPage />, 'ja');

    expect(screen.getByRole('link', { name: '再ログイン' })).toHaveAttribute('href', '/login');
  });
});
