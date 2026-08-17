import { Button } from './button';

export function ErrorState({ onRetry, message = 'Không thể tải dữ liệu. Vui lòng thử lại.' }: { onRetry?: () => void; message?: string }) {
  return (
    <div className="rounded-lg border border-[#efc3bf] bg-[#fff8f7] p-6 text-center" role="alert">
      <p className="text-sm text-danger">{message}</p>
      {onRetry ? <Button className="mt-4" variant="secondary" onClick={onRetry}>Thử lại</Button> : null}
    </div>
  );
}
