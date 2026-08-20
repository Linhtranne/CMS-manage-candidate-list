import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderWithI18n } from '@/i18n/test-utils';
import { recruiterFixture } from '@/mocks/fixtures/users';
import { QueryProvider } from '@/providers/query-provider';
import { ErrorState } from './error-state';
import { Modal } from './modal';
import { SavedViewMenu } from './saved-view-menu';

describe('shared UI localization', () => {
  it('renders default error actions in Japanese', () => {
    renderWithI18n(<ErrorState onRetry={() => undefined} />, 'ja');

    expect(screen.getByRole('alert')).toHaveTextContent('データを読み込めません。もう一度お試しください。');
    expect(screen.getByRole('button', { name: '再試行' })).toBeVisible();
  });

  it('localizes modal controls without translating the supplied title', () => {
    renderWithI18n(<Modal open title="UV-0001 · Nguyễn Minh An" onClose={() => undefined}>Content</Modal>, 'en');

    expect(screen.getByRole('dialog', { name: 'UV-0001 · Nguyễn Minh An' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Close UV-0001 · Nguyễn Minh An' })).toBeVisible();
  });

  it('renders saved-view controls in Japanese', () => {
    renderWithI18n(<QueryProvider><SavedViewMenu resource="candidates" user={recruiterFixture} /></QueryProvider>, 'ja');

    expect(screen.getByRole('option', { name: '個人用' })).toBeVisible();
    expect(screen.queryByRole('option', { name: 'チーム共有' })).not.toBeInTheDocument();
  });
});
