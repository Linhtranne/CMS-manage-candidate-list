import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Button } from './button';

describe('Button', () => {
  it('requires visible text for primary business actions', () => {
    render(<Button variant="primary">Thêm ứng viên</Button>);

    expect(screen.getByRole('button', { name: 'Thêm ứng viên' })).toBeVisible();
  });
});
