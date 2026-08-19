'use client';

import { useCallback, type KeyboardEvent } from 'react';

export function useTabKeyboard(tabValues: readonly string[], onChange: (value: string) => void) {
  return useCallback((event: KeyboardEvent<HTMLElement>) => {
    if (!['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;

    const target = event.target instanceof HTMLElement && event.target.getAttribute('role') === 'tab' ? event.target : null;
    if (!target) return;

    const tabs = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('[role="tab"]'));
    const currentIndex = tabs.indexOf(target);
    if (currentIndex < 0) return;

    const nextIndex = event.key === 'Home'
      ? 0
      : event.key === 'End'
        ? tabs.length - 1
        : (currentIndex + (event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : -1) + tabs.length) % tabs.length;
    const nextTab = tabs[nextIndex];
    if (!nextTab) return;

    event.preventDefault();
    nextTab.focus();
    const nextValue = nextTab.dataset.tabValue;
    if (nextValue && tabValues.includes(nextValue)) onChange(nextValue);
  }, [onChange, tabValues]);
}
