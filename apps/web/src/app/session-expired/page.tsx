import Link from 'next/link';

export default function SessionExpiredPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-surface p-4">
      <section className="max-w-md rounded-xl border border-border bg-panel p-8 text-center shadow-panel">
        <h1 className="text-2xl font-bold text-text">Phiên làm việc đã hết hạn</h1>
        <p className="mt-3 text-sm text-text-muted">Vui lòng đăng nhập lại để tiếp tục quản lý ứng viên.</p>
        <Link href="/login" className="mt-6 inline-flex min-h-10 items-center rounded-control bg-accent px-4 py-2 text-sm font-semibold text-white">Đăng nhập lại</Link>
      </section>
    </main>
  );
}
