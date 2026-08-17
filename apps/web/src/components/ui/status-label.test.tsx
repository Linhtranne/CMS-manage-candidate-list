import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StatusLabel } from './status-label';

describe('StatusLabel', () => {
  it('renders status text independently from color', () => {
    render(<StatusLabel tone="danger">Quá hạn</StatusLabel>);

    expect(screen.getByText('Quá hạn')).toBeVisible();
  });
});
