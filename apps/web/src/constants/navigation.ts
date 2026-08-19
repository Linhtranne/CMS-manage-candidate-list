import type { TranslationKey } from '@/i18n/types';
import type { Permission } from '@/lib/permissions/permissions';

export const navigation = [
  { href: '/work', labelKey: 'navigation.work', permission: 'work.read' },
  { href: '/clients', labelKey: 'navigation.clients', permission: 'clients.read' },
  { href: '/orders', labelKey: 'navigation.orders', permission: 'orders.read' },
  { href: '/candidates', labelKey: 'navigation.candidates', permission: 'candidates.read' },
  { href: '/applications', labelKey: 'navigation.applications', permission: 'applications.read' },
  { href: '/supply-journeys', labelKey: 'navigation.journeys', permission: 'journeys.read' },
  { href: '/mailbox', labelKey: 'navigation.mailbox', permission: 'mail.read' },
  { href: '/reports', labelKey: 'navigation.reports', permission: 'reports.read' }
] as const satisfies readonly { href: string; labelKey: TranslationKey; permission: Permission }[];

export const adminNavigation = { href: '/admin', labelKey: 'navigation.admin', permission: 'admin.read' } as const satisfies { href: string; labelKey: TranslationKey; permission: Permission };
