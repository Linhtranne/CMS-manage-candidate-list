'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [feedback, setFeedback] = useState<{ tone: 'error' | 'success'; text: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback(null);
    setIsSubmitting(true);

    try {
      const response = await apiClient.POST('/auth/login', { body: { email, password } });
      if (response.error) {
        setFeedback({ tone: 'error', text: response.error.message });
        return;
      }

      router.replace('/work');
    } catch {
      setFeedback({ tone: 'error', text: 'Không thể kết nối hệ thống. Vui lòng thử lại.' });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface p-4">
      <section className="w-full max-w-md rounded-xl border border-border bg-panel p-8 shadow-panel">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">Candidate Supply</p>
        <h1 className="mt-3 text-2xl font-bold text-text">Đăng nhập CMS</h1>
        <p className="mt-2 text-sm text-text-muted">Chỉ dành cho nhân viên nội bộ.</p>
        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium text-text">Email công việc</label>
            <input id="email" name="email" type="email" autoComplete="email" spellCheck={false} required value={email} onChange={(event) => setEmail(event.target.value)} className="min-h-11 w-full rounded-control border border-border px-3 text-sm" />
          </div>
          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium text-text">Mật khẩu</label>
            <input id="password" name="password" type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} className="min-h-11 w-full rounded-control border border-border px-3 text-sm" />
          </div>
          <Button type="submit" variant="primary" className="w-full" disabled={isSubmitting} aria-busy={isSubmitting}>{isSubmitting ? 'Đang đăng nhập…' : 'Đăng nhập'}</Button>
          {feedback ? <p className={feedback.tone === 'error' ? 'text-sm text-danger' : 'text-sm text-text-muted'} role={feedback.tone === 'error' ? 'alert' : 'status'}>{feedback.text}</p> : null}
        </form>
      </section>
    </main>
  );
}
