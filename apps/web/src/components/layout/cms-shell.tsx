'use client';

import type { ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import { Menu } from 'lucide-react';
import type { CurrentUser } from '@/lib/auth/types';
import { Button } from '@/components/ui/button';
import { useDialogFocus } from '@/hooks/use-dialog-focus';
import { usePresence } from '@/hooks/use-presence';
import { useI18n } from '@/i18n/use-i18n';
import { Sidebar } from './sidebar';
import { Topbar } from './topbar';

export function CmsShell({ user, children }: { user: CurrentUser; children: ReactNode }) {
  const { t } = useI18n();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { mounted: mobileMounted, closing: mobileClosing, finishExit: finishMobileExit } = usePresence(mobileOpen);
  const mobileNavigationRef = useRef<HTMLDivElement>(null);

  useDialogFocus(mobileMounted, mobileNavigationRef);

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
          <div ref={mobileNavigationRef} id="mobile-cms-nav" data-state={mobileClosing ? 'closing' : 'open'} onAnimationEnd={(event) => { if (event.target === event.currentTarget) finishMobileExit(); }} className="cms-mobile-navigation fixed inset-0 z-40 flex lg:hidden focus-visible:outline-none" role="dialog" aria-modal="true" aria-label={t('navigation.ariaLabel')} tabIndex={-1}>
            <button type="button" aria-hidden="true" tabIndex={-1} className="cms-mobile-navigation-backdrop absolute inset-0 bg-[#182233]/35" onClick={closeMobileNavigation} />
            <div className="cms-mobile-navigation-panel relative z-10 h-full w-[min(20rem,calc(100vw-1rem))] max-w-full overflow-hidden shadow-panel"><Sidebar user={user} mobile onClose={closeMobileNavigation} /></div>
          </div>
        ) : null}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3 border-b border-border bg-panel px-4 py-2 lg:hidden">
            <Button variant="ghost" aria-label={t('navigation.openMobile')} title={t('navigation.openMobile')} aria-expanded={mobileOpen} aria-controls="mobile-cms-nav" className="h-11 w-11 shrink-0 px-0" onClick={openMobileNavigation}><Menu aria-hidden="true" size={20} strokeWidth={1.8} /></Button>
            <span className="text-sm font-semibold text-text">{t('common.brand.cmsName')}</span>
          </div>
          <Topbar user={user} />
          <main id="main-content" className="p-4 md:p-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
