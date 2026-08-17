import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { QueryProvider } from '@/providers/query-provider';
import { AuthenticatedCms } from './authenticated-cms';

describe('AuthenticatedCms', () => {
  it('loads the current internal session before rendering the shell', async () => {
    render(<QueryProvider><AuthenticatedCms><div>Protected content</div></AuthenticatedCms></QueryProvider>);

    expect(await screen.findByText('Protected content')).toBeVisible();
  });
});
