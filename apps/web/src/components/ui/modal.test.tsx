import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
});
