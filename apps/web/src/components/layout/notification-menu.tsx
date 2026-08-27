'use client';

import { useEffect, useRef, useState } from 'react';
import { Bell } from 'lucide-react';
import { useI18n } from '@/i18n/use-i18n';
import type { Translate } from '@/i18n/types';
import { useMarkAllNotificationsRead, useMarkNotificationRead, useNotifications, type Notification } from '@/services/notification-service';

function notificationCopy(notification: Notification, t: Translate) {
  const params = notification.params as Record<string, unknown>;
  const name = typeof params.name === 'string' ? params.name : '';
  const title = typeof params.title === 'string' ? params.title : '';
  switch (notification.kind) {
    case 'INTERVIEW_SCHEDULED': return { title: t('common.notifications.items.scheduleTitle'), detail: t('common.notifications.items.scheduleDetail', { name }) };
    case 'MAIL_NEEDS_ACTION': return { title: t('common.notifications.items.emailTitle'), detail: t('common.notifications.items.emailDetail') };
    case 'JOURNEY_AT_RISK': return { title: t('common.notifications.items.journeyTitle'), detail: t('common.notifications.items.journeyDetail', { name }) };
    case 'TASK_ASSIGNED': return { title: t('common.notifications.items.taskTitle'), detail: t('common.notifications.items.taskDetail', { title }) };
    case 'APPLICATION_DECISION': return { title: t('common.notifications.items.applicationTitle'), detail: t('common.notifications.items.applicationDetail', { name }) };
  }
}

function severityClass(severity: Notification['severity']) {
  if (severity === 'DANGER') return 'bg-[#fff0ef] text-danger';
  if (severity === 'WARNING') return 'bg-[#fff8e8] text-[#93620b]';
  return 'bg-[#eef6ff] text-accent';
}

export function NotificationMenu() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const notificationsQuery = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const notifications = notificationsQuery.data?.items ?? [];
  const unreadCount = notificationsQuery.data?.unreadCount ?? 0;
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
  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.readAt) {
      try { await markRead.mutateAsync(notification.id); } catch { /* navigation remains available even if the read request fails */ }
    }
    if (notification.href) { setOpen(false); window.location.assign(notification.href); }
  };
 return <div ref={containerRef} className="relative"><button type="button" className="relative inline-flex h-11 w-11 items-center justify-center rounded-control border border-border bg-panel text-text-muted transition-colors hover:bg-surface hover:text-text" aria-label={t('common.notifications.title')} title={t('common.notifications.title')} aria-expanded={open} aria-controls="notification-popover" onClick={() => setOpen((value) => !value)}><Bell size={18} strokeWidth={2} aria-hidden="true" />{unreadCount > 0 ? <span aria-hidden="true" className="absolute right-1 top-1 h-2 w-2 rounded-full bg-danger" /> : null}</button>{open ? <section id="notification-popover" role="region" aria-label={t('common.notifications.list')} className="absolute right-0 top-12 z-50 w-[min(22rem,calc(100vw-2rem))] rounded-xl border border-border bg-panel p-4 shadow-panel"><div className="flex items-center justify-between"><h2 className="font-bold text-text">{t('common.notifications.title')}</h2><button type="button" className="min-h-10 rounded-control px-2 text-xs font-semibold text-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:opacity-50" disabled={unreadCount === 0 || markAllRead.isPending} onClick={() => markAllRead.mutate()}>{t('common.notifications.markRead')}</button></div>{notificationsQuery.isPending ? <p className="mt-3 text-sm text-text-muted" aria-busy="true">{t('common.notifications.loading')}</p> : notificationsQuery.isError ? <p className="mt-3 text-sm text-danger">{t('common.notifications.error')}</p> : notifications.length === 0 ? <p className="mt-3 text-sm text-text-muted">{t('common.notifications.empty')}</p> : <ul className="mt-3 divide-y divide-border">{notifications.map((notification) => { const copy = notificationCopy(notification, t); return <li key={notification.id} className="py-3 first:pt-0 last:pb-0"><button type="button" className="w-full rounded-lg text-left hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2" onClick={() => { void handleNotificationClick(notification); }}><p className={`text-sm font-semibold ${notification.readAt ? 'text-text-muted' : 'text-text'}`}>{copy.title}</p><p className="mt-1 text-xs text-text-muted">{copy.detail}</p><span className={`mt-2 inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${severityClass(notification.severity)}`}>{notification.severity === 'DANGER' ? t('common.notifications.tones.danger') : notification.severity === 'WARNING' ? t('common.notifications.tones.warning') : t('common.notifications.tones.info')}</span></button></li>; })}</ul>}</section> : null}</div>;
}
