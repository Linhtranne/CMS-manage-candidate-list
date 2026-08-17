import Link from 'next/link';
import type { Route } from 'next';

const links = [
  ['/admin/users', 'Người dùng & quyền'],
  ['/admin/catalogs', 'Danh mục'],
  ['/admin/templates', 'Template'],
  ['/admin/mailbox', 'Mailbox'],
  ['/admin/audit', 'Audit log']
] as const;

export function AdminNav() {
  return <nav className="flex flex-wrap gap-2" aria-label="Khu vực quản trị">{links.map(([href, label]) => <Link key={href} href={href as Route} className="rounded-control border border-border bg-panel px-3 py-2 text-sm font-semibold text-text-muted hover:border-accent hover:text-accent">{label}</Link>)}</nav>;
}
