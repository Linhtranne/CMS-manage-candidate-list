import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { recruiterFixture } from '@/mocks/fixtures/users';
import { QueryProvider } from '@/providers/query-provider';
import { GlobalSearch } from './global-search';

describe('GlobalSearch', () => {
  it('does not expose results outside the current permission scope', async () => {
    const user = userEvent.setup();
    render(<QueryProvider><GlobalSearch user={recruiterFixture} /></QueryProvider>);

    await user.type(screen.getByRole('combobox', { name: 'Tìm kiếm toàn hệ thống' }), 'Sakura');

    expect(await screen.findByText('Sakura Care Partners')).toBeVisible();
    expect(screen.queryByText('Candidate thuộc đội khác')).not.toBeInTheDocument();
  });
});
