'use client';

import { useEffect, useRef, type RefObject } from 'react';

const FOCUSABLE_SELECTOR = [
  'a[href]:not([tabindex="-1"])',
  'button:not([disabled]):not([tabindex="-1"])',
  'input:not([disabled]):not([tabindex="-1"])',
  'select:not([disabled]):not([tabindex="-1"])',
  'textarea:not([disabled]):not([tabindex="-1"])',
  '[tabindex]:not([tabindex="-1"])'
].join(',');

function focusElement(element: HTMLElement | null) {
  if (!element || !element.isConnected || element.getAttribute('aria-disabled') === 'true') return;
  element.focus();
}

export function useDialogFocus(mounted: boolean, panelRef: RefObject<HTMLElement | null>) {
  const restoreRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!mounted) {
      const restoreTarget = restoreRef.current;
      restoreRef.current = null;
      focusElement(restoreTarget);
      return;
    }

    if (!restoreRef.current) {
      const activeElement = document.activeElement;
      restoreRef.current = activeElement instanceof HTMLElement && activeElement !== document.body ? activeElement : null;
    }

    panelRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;
      const panel = panelRef.current;
      if (!panel) return;
      if (!panel.contains(document.activeElement)) return;

      const focusableElements = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
      if (focusableElements.length === 0) {
        event.preventDefault();
        panel.focus();
        return;
      }

      const activeElement = document.activeElement;
      const currentIndex = focusableElements.indexOf(activeElement as HTMLElement);
      if (event.shiftKey) {
        if (currentIndex <= 0) {
          event.preventDefault();
          focusElement(focusableElements[focusableElements.length - 1]);
        }
        return;
      }

      if (currentIndex === -1 || currentIndex === focusableElements.length - 1) {
        event.preventDefault();
        focusElement(focusableElements[0]);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [mounted, panelRef]);
}
