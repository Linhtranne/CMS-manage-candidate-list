'use client';

import { useEffect, useRef, useState } from 'react';
import { Bell } from 'lucide-react';

export function NotificationMenu() {
  const [open, setOpen] = useState(false);
  const [read, setRead] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const notifications = [
    { id: 'n1', title: 'Ứng viên cần xác nhận lịch', detail: 'Nguyễn Minh An · trong 15 phút', tone: 'warning' },
    { id: 'n2', title: 'Email mới chưa ghép', detail: '1 thư trong hộp thư chung · hôm nay', tone: 'info' },
    { id: 'n3', title: 'Lộ trình có mốc sắp quá hạn', detail: 'Võ Thanh Tùng · ngày mai', tone: 'danger' }
  ];
  useEffect(() => { setRead(window.localStorage.getItem('cms-notifications-read') === 'true'); }, []);
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false); };
    const handlePointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !containerRef.current?.contains(event.target)) setOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('pointerdown', handlePointerDown);
    return () => { window.removeEventListener('keydown', handleKeyDown); document.removeEventListener('pointerdown', handlePointerDown); };
  }, [open]);
  const markRead = () => { setRead(true); window.localStorage.setItem('cms-notifications-read', 'true'); };
  return <div ref={containerRef} className="relative"><button type="button" className="relative inline-flex h-11 w-11 items-center justify-center rounded-control border border-border bg-panel text-text-muted transition-colors hover:bg-surface hover:text-text" aria-label="Thông báo" title="Thông báo" aria-expanded={open} aria-controls="notification-popover" onClick={() => setOpen((value) => !value)}><Bell size={18} strokeWidth={2} aria-hidden="true" />{!read ? <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-danger" role="status" aria-label="Có thông báo mới" /> : null}</button>{open ? <section id="notification-popover" role="region" aria-label="Danh sách thông báo" className="absolute right-0 top-12 z-50 w-[min(22rem,calc(100vw-2rem))] rounded-xl border border-border bg-panel p-4 shadow-panel"><div className="flex items-center justify-between"><h2 className="font-bold text-text">Thông báo</h2><button type="button" className="min-h-10 rounded-control px-2 text-xs font-semibold text-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2" onClick={markRead}>Đánh dấu đã xem</button></div><ul className="mt-3 divide-y divide-border">{notifications.map((notification) => <li key={notification.id} className="py-3 first:pt-0 last:pb-0"><p className="text-sm font-semibold text-text">{notification.title}</p><p className="mt-1 text-xs text-text-muted">{notification.detail}</p><span className={`mt-2 inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${notification.tone === 'danger' ? 'bg-[#fff0ef] text-danger' : notification.tone === 'warning' ? 'bg-[#fff8e8] text-[#93620b]' : 'bg-[#eef6ff] text-accent'}`}>{notification.tone === 'danger' ? 'Cần chú ý' : notification.tone === 'warning' ? 'Sắp đến hạn' : 'Mới'}</span></li>)}</ul></section> : null}</div>;
}
