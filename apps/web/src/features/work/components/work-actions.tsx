import { Button } from '@/components/ui/button';

export function WorkActions({ onComplete, disabled = false }: { onComplete: () => void; disabled?: boolean }) {
  return (
    <div className="flex flex-wrap gap-2 border-t border-border pt-4">
      <Button variant="primary" onClick={onComplete} disabled={disabled}>Đánh dấu hoàn thành</Button>
      <Button variant="secondary" disabled={disabled}>Gửi email</Button>
      <Button variant="secondary" disabled={disabled}>Đổi hạn xử lý</Button>
      <Button variant="secondary" disabled={disabled}>Chuyển người phụ trách</Button>
    </div>
  );
}

