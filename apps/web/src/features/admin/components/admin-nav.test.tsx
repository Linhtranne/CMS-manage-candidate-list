import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { renderWithI18n } from '@/i18n/test-utils';
import { AdminNav } from './admin-nav';

vi.mock('next/navigation', () => ({
  usePathname: () => '/admin/templates'
}));

describe('AdminNav', () => {
  it('marks the current admin subsection active', () => {
    renderWithI18n(<AdminNav />, 'en');

    const activeLink = screen.getByRole('link', { name: 'Templates' });
    expect(activeLink).toHaveAttribute('href', '/admin/templates');
    expect(activeLink).toHaveAttribute('aria-current', 'page');
    expect(activeLink).toHaveClass('border-accent', 'bg-[#e8f1fb]', 'text-accent');
    expect(screen.getByRole('link', { name: 'Audit log' })).not.toHaveAttribute('aria-current');
  });

  it('converts vertical wheel input into horizontal scrolling when the nav overflows', () => {
    renderWithI18n(<AdminNav />, 'en');

    const nav = screen.getByRole('navigation');
    Object.defineProperties(nav, {
      clientWidth: { configurable: true, value: 300 },
      scrollWidth: { configurable: true, value: 600 },
      scrollLeft: { configurable: true, value: 0, writable: true }
    });

    const event = fireEvent.wheel(nav, { deltaX: 0, deltaY: 120 });

    expect(event).toBe(true);
    expect(nav).toHaveProperty('scrollLeft', 120);
  });
});
