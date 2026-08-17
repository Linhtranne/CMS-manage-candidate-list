import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DetailDrawer } from './detail-drawer';

describe('DetailDrawer motion', () => {
  it('uses bounded enter motion for the backdrop and panel', () => {
    render(<DetailDrawer open title="Chi tiết" onClose={() => undefined}>Nội dung</DetailDrawer>);

    expect(screen.getByRole('dialog')).toHaveClass('cms-drawer-layer');
    expect(screen.getByRole('dialog').querySelector('aside')).toHaveClass('cms-drawer-panel');
    expect(screen.getByRole('dialog').querySelector('button[aria-label="Đóng lớp chi tiết"]')).toHaveClass('cms-drawer-backdrop');
    expect(screen.queryByRole('button', { name: 'Đóng chi tiết' })).not.toBeInTheDocument();
  });

  it('keeps the drawer mounted during its closing animation', async () => {
    const { rerender } = render(<DetailDrawer open title="Chi tiết" onClose={() => undefined}>Nội dung</DetailDrawer>);

    rerender(<DetailDrawer open={false} title="Chi tiết" onClose={() => undefined}>Nội dung</DetailDrawer>);

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('data-state', 'closing');
    fireEvent(dialog, new Event('animationend', { bubbles: true }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });
});
