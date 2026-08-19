import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { Modal } from './modal';

describe('Modal', () => {
  it('opens with a labelled dialog and closes from Escape or backdrop', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<Modal open title="Thêm ứng viên" onClose={onClose}><p>Nội dung form</p></Modal>);
    expect(screen.getByRole('dialog', { name: 'Thêm ứng viên' })).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole('button', { name: 'Đóng Thêm ứng viên' }));
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('moves focus into the dialog when it opens after the trigger click', async () => {
    const user = userEvent.setup();
    function Harness() {
      const [open, setOpen] = useState(false);
      return <><button type="button" onClick={() => setOpen(true)}>Mở modal</button><Modal open={open} title="Thêm ứng viên" onClose={() => setOpen(false)}><p>Nội dung form</p></Modal></>;
    }

    render(<Harness />);
    await user.click(screen.getByRole('button', { name: 'Mở modal' }));

    await waitFor(() => expect(screen.getByRole('dialog', { name: 'Thêm ứng viên' })).toHaveFocus());
  });

  it('restores focus to the trigger after closing', async () => {
    const user = userEvent.setup();
    function Harness() {
      const [open, setOpen] = useState(false);
      return <><button type="button" onClick={() => setOpen(true)}>Mở modal</button><Modal open={open} title="Thêm ứng viên" onClose={() => setOpen(false)}><p>Nội dung form</p></Modal></>;
    }

    render(<Harness />);
    const trigger = screen.getByRole('button', { name: 'Mở modal' });
    await user.click(trigger);
    const dialog = screen.getByRole('dialog', { name: 'Thêm ứng viên' });
    await waitFor(() => expect(dialog).toHaveFocus());

    await user.keyboard('{Escape}');
    fireEvent(dialog.parentElement as HTMLElement, new Event('animationend', { bubbles: true }));
    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it('keeps keyboard focus inside the dialog', async () => {
    const user = userEvent.setup();
    render(<Modal open title="Thêm ứng viên" onClose={() => undefined} footer={<button type="button">Lưu</button>}><button type="button">Trường đầu tiên</button></Modal>);

    const dialog = screen.getByRole('dialog', { name: 'Thêm ứng viên' });
    await waitFor(() => expect(dialog).toHaveFocus());
    await user.tab();
    expect(screen.getByRole('button', { name: 'Đóng Thêm ứng viên' })).toHaveFocus();
    await user.tab({ shift: true });
    expect(screen.getByRole('button', { name: 'Lưu' })).toHaveFocus();
  });

  it('protects dirty modal content before closing', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<Modal open title="Thêm ứng viên" onClose={onClose} confirmOnClose><p>Nội dung form</p></Modal>);

    await user.keyboard('{Escape}');

    expect(screen.getByRole('alertdialog', { name: 'Có thay đổi chưa lưu' })).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Tiếp tục chỉnh sửa' }));
    expect(screen.queryByRole('alertdialog', { name: 'Có thay đổi chưa lưu' })).not.toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Đóng Thêm ứng viên' }));
    await user.click(screen.getByRole('button', { name: 'Bỏ thay đổi' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
