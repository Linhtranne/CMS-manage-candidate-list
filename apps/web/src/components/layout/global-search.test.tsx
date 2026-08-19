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

  it('shows a visible focus ring for keyboard users', () => {
    render(<QueryProvider><GlobalSearch user={recruiterFixture} /></QueryProvider>);

    expect(screen.getByRole('combobox', { name: 'Tìm kiếm toàn hệ thống' })).toHaveClass('focus-visible:ring-2');
  });

  it('exposes results as a keyboard-operable listbox', async () => {
    const user = userEvent.setup();
    render(<QueryProvider><GlobalSearch user={recruiterFixture} /></QueryProvider>);

    const search = screen.getByRole('combobox', { name: 'Tìm kiếm toàn hệ thống' });
    await user.type(search, 'Sakura');

    const listbox = await screen.findByRole('listbox', { name: 'Kết quả tìm kiếm' });
    const option = await screen.findByRole('option', { name: /Sakura Care Partners/ });
    expect(search).toHaveAttribute('aria-controls', listbox.id);
    expect(search).toHaveAttribute('aria-autocomplete', 'list');

    await user.keyboard('{ArrowDown}');
    expect(option).toHaveAttribute('aria-selected', 'true');
    expect(search).toHaveAttribute('aria-activedescendant', option.id);

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('listbox', { name: 'Kết quả tìm kiếm' })).not.toBeInTheDocument();
    expect(search).toHaveAttribute('aria-expanded', 'false');
  });

  it('provides stable form metadata for autofill and automation', () => {
    render(<QueryProvider><GlobalSearch user={recruiterFixture} /></QueryProvider>);

    expect(screen.getByRole('combobox', { name: 'Tìm kiếm toàn hệ thống' }))
      .toHaveAttribute('name', 'global-search');
    expect(screen.getByRole('combobox', { name: 'Tìm kiếm toàn hệ thống' }))
      .toHaveAttribute('autocomplete', 'off');
  });
});
