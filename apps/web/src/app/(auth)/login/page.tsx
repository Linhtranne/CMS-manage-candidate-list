'use client';

import { useState } from 'react';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const response = await apiClient.POST('/auth/login', { body: { email, password } });
    if (response.error) {
      setMessage(response.error.message);
      return;
    }
    setMessage('Đăng nhập thành công');
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
            <input id="email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} className="min-h-11 w-full rounded-control border border-border px-3 text-sm" />
          </div>
          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium text-text">Mật khẩu</label>
            <input id="password" type="password" required value={password} onChange={(event) => setPassword(event.target.value)} className="min-h-11 w-full rounded-control border border-border px-3 text-sm" />
          </div>
          <Button type="submit" variant="primary" className="w-full">Đăng nhập</Button>
          {message ? <p className="text-sm text-text-muted" role="status">{message}</p> : null}
        </form>
      </section>
    </main>
  );
}
