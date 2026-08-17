import Link from 'next/link';

export default function ForbiddenPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-surface p-4">
      <section className="max-w-md rounded-xl border border-border bg-panel p-8 text-center shadow-panel">
        <h1 className="text-2xl font-bold text-text">Bạn không có quyền truy cập</h1>
        <p className="mt-3 text-sm text-text-muted">Nếu cần quyền bổ sung, hãy liên hệ quản trị hệ thống.</p>
        <Link href="/work" className="mt-6 inline-flex min-h-10 items-center rounded-control border border-border px-4 py-2 text-sm font-semibold text-text">Về việc của tôi</Link>
      </section>
    </main>
  );
}
