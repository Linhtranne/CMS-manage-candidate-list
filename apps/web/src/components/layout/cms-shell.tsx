'use client';

import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import type { CurrentUser } from '@/lib/auth/types';
import { Button } from '@/components/ui/button';
import { usePresence } from '@/hooks/use-presence';
import { Sidebar } from './sidebar';
import { Topbar } from './topbar';

export function CmsShell({ user, children }: { user: CurrentUser; children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { mounted: mobileMounted, closing: mobileClosing, finishExit: finishMobileExit } = usePresence(mobileOpen);

  const openMobileNavigation = () => {
    setMobileOpen(true);
  };

  const closeMobileNavigation = () => {
    setMobileOpen(false);
    // Restore scroll immediately when the exit animation starts; the effect
    // cleanup remains as a second guard after the presence layer unmounts.
    document.body.style.overflow = '';
  };

  useEffect(() => {
    if (!mobileMounted) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeMobileNavigation();
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [mobileMounted]);

  return (
    <div className="min-h-screen bg-surface text-text">
      <div className="flex min-h-screen">
        <div className="hidden lg:block"><Sidebar user={user} /></div>
        {mobileMounted ? (
          <div id="mobile-cms-nav" data-state={mobileClosing ? 'closing' : 'open'} onAnimationEnd={(event) => { if (event.target === event.currentTarget) finishMobileExit(); }} className="cms-mobile-navigation fixed inset-0 z-40 flex lg:hidden" role="dialog" aria-modal="true" aria-label="Điều hướng CMS">
            <button type="button" aria-label="Đóng điều hướng" className="cms-mobile-navigation-backdrop absolute inset-0 bg-[#182233]/35" onClick={closeMobileNavigation} />
            <div className="cms-mobile-navigation-panel relative z-10 h-full w-[min(20rem,calc(100vw-1rem))] max-w-full overflow-hidden shadow-panel"><Sidebar user={user} mobile onClose={closeMobileNavigation} /></div>
          </div>
        ) : null}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3 border-b border-border bg-panel px-4 py-2 lg:hidden">
            <Button variant="ghost" aria-expanded={mobileOpen} aria-controls="mobile-cms-nav" onClick={openMobileNavigation}>Mở điều hướng</Button>
            <span className="text-sm font-semibold text-text">Candidate Supply CMS</span>
          </div>
          <Topbar user={user} />
          <main className="p-4 md:p-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
