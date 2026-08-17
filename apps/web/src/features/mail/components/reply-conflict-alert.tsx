export function ReplyConflictAlert({ message = 'Có phản hồi mới — tải lại chuỗi email trước khi gửi.' }: { message?: string }) {
  return <p role="alert" className="rounded-control border border-[#f4d6a3] bg-[#fff8e8] px-3 py-2 text-sm font-semibold text-warning">{message}</p>;
}
