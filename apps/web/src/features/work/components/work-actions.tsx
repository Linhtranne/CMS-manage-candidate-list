import { Button, ButtonLink } from '@/components/ui/button';

export function WorkActions({ onComplete, sendEmailHref, onChangeDue, onChangeAssignee, disabled = false }: { onComplete: () => void; sendEmailHref: string; onChangeDue: () => void; onChangeAssignee: () => void; disabled?: boolean }) {
  return (
    <div className="flex flex-wrap gap-2 border-t border-border pt-4">
      <Button variant="primary" onClick={onComplete} disabled={disabled}>Đánh dấu hoàn thành</Button>
      <ButtonLink variant="secondary" href={sendEmailHref} className={disabled ? 'pointer-events-none opacity-50' : undefined} aria-disabled={disabled} tabIndex={disabled ? -1 : undefined} onClick={(event) => { if (disabled) event.preventDefault(); }}>Gửi email</ButtonLink>
      <Button variant="secondary" onClick={onChangeDue} disabled={disabled}>Đổi hạn xử lý</Button>
      <Button variant="secondary" onClick={onChangeAssignee} disabled={disabled}>Chuyển người phụ trách</Button>
    </div>
  );
}

