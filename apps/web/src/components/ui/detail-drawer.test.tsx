import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { DetailDrawer } from './detail-drawer';

describe('DetailDrawer motion', () => {
  it('uses bounded enter motion for the backdrop and panel', () => {
    render(<DetailDrawer open title="Chi tiết" onClose={() => undefined}>Nội dung</DetailDrawer>);

    expect(screen.getByRole('dialog')).toHaveClass('cms-drawer-layer');
    expect(screen.getByRole('dialog').querySelector('aside')).toHaveClass('cms-drawer-panel');
    expect(screen.getByRole('dialog').querySelector('button.cms-drawer-backdrop')).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getByRole('dialog').querySelector('button.cms-drawer-backdrop')).toHaveAttribute('tabindex', '-1');
    expect(screen.getByRole('button', { name: 'Đóng Chi tiết' })).toHaveClass('min-w-11');
  });

  it('keeps the drawer mounted during its closing animation', async () => {
    const { rerender } = render(<DetailDrawer open title="Chi tiết" onClose={() => undefined}>Nội dung</DetailDrawer>);

    rerender(<DetailDrawer open={false} title="Chi tiết" onClose={() => undefined}>Nội dung</DetailDrawer>);

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('data-state', 'closing');
    fireEvent(dialog, new Event('animationend', { bubbles: true }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('locks page scrolling while the drawer is open', () => {
    render(<DetailDrawer open title="Chi tiết" onClose={() => undefined}>Nội dung</DetailDrawer>);

    expect(document.body.style.overflow).toBe('hidden');
  });

  it('restores focus to the trigger after closing', async () => {
    const user = userEvent.setup();
    function Harness() {
      const [open, setOpen] = useState(false);
      return <><button type="button" onClick={() => setOpen(true)}>Mở drawer</button><DetailDrawer open={open} title="Chi tiết" onClose={() => setOpen(false)}>Nội dung</DetailDrawer></>;
    }

    render(<Harness />);
    const trigger = screen.getByRole('button', { name: 'Mở drawer' });
    await user.click(trigger);
    const dialog = screen.getByRole('dialog', { name: 'Chi tiết' });
    await waitFor(() => expect(dialog.querySelector('aside')).toHaveFocus());

    await user.keyboard('{Escape}');
    fireEvent(dialog, new Event('animationend', { bubbles: true }));
    await waitFor(() => expect(trigger).toHaveFocus());
  });
});
