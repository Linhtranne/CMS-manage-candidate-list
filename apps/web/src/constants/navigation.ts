import { vi } from '@/i18n/vi';
import type { Permission } from '@/lib/permissions/permissions';

export const navigation = [
  { href: '/work', label: vi.navigation.work, permission: 'work.read' },
  { href: '/clients', label: vi.navigation.clients, permission: 'clients.read' },
  { href: '/orders', label: vi.navigation.orders, permission: 'orders.read' },
  { href: '/candidates', label: vi.navigation.candidates, permission: 'candidates.read' },
  { href: '/applications', label: vi.navigation.applications, permission: 'applications.read' },
  { href: '/supply-journeys', label: vi.navigation.journeys, permission: 'journeys.read' },
  { href: '/mailbox', label: vi.navigation.mailbox, permission: 'mail.read' },
  { href: '/reports', label: vi.navigation.reports, permission: 'reports.read' }
] as const satisfies readonly { href: string; label: string; permission: Permission }[];

export const adminNavigation = { href: '/admin', label: vi.navigation.admin, permission: 'admin.read' } as const;
