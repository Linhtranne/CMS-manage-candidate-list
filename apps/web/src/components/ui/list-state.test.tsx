import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { configAdminFixture, recruiterFixture } from '@/mocks/fixtures/users';
import { useListParams } from '@/hooks/use-list-params';
import { QueryProvider } from '@/providers/query-provider';
import { SavedViewMenu } from './saved-view-menu';

function ListHarness() {
  const { params, setSelectedId } = useListParams({ defaultView: 'potential' });
  return (
    <div>
      <span data-testid="view">{params.view}</span>
      <button type="button" onClick={() => setSelectedId('candidate-01')}>Nguyễn Minh An</button>
    </div>
  );
}

describe('list foundation', () => {
  it('keeps view, sort and selected record in the URL', async () => {
    window.history.replaceState({}, '', '/candidates?view=potential&sort=-updatedAt');
    const user = userEvent.setup();
    render(<ListHarness />);

    await user.click(screen.getByRole('button', { name: 'Nguyễn Minh An' }));

    expect(window.location.search).toContain('view=potential');
    expect(window.location.search).toContain('sort=-updatedAt');
    expect(window.location.search).toContain('selectedId=candidate-01');
  });

  it('saves a private view and only lets managers publish team views', () => {
    render(<QueryProvider><SavedViewMenu resource="candidates" user={recruiterFixture} /></QueryProvider>);

    expect(screen.getByRole('option', { name: 'Dùng riêng' })).toBeVisible();
    expect(screen.queryByRole('option', { name: 'Chia sẻ cho đội' })).not.toBeInTheDocument();
  });

  it('lets config admins publish team views using the canonical permission', () => {
    const configAdminWithoutLegacyPermission = {
      ...configAdminFixture,
      permissions: configAdminFixture.permissions.filter((permission) => permission !== 'admin.read'),
    };
    render(<QueryProvider><SavedViewMenu resource="candidates" user={configAdminWithoutLegacyPermission} /></QueryProvider>);

    expect(screen.getByRole('option', { name: 'Chia sẻ cho đội' })).toBeVisible();
  });
});
