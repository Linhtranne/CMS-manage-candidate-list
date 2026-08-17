'use client';

import { useState } from 'react';
import type { CurrentUser } from '@/lib/auth/types';
import { Button } from './button';

export function SavedViewMenu({ resource, user }: { resource: string; user: CurrentUser }) {
  const [visibility, setVisibility] = useState<'PRIVATE' | 'TEAM'>('PRIVATE');
  const canPublish = user.roles.includes('MANAGER') || user.permissions.includes('admin.read');

  return (
    <div className="flex items-center gap-2" data-resource={resource}>
      <label htmlFor="view-visibility" className="text-sm text-text-muted">Lưu view</label>
      <select id="view-visibility" aria-label="Phạm vi lưu view" value={visibility} onChange={(event) => setVisibility(event.target.value as 'PRIVATE' | 'TEAM')} className="min-h-10 rounded-control border border-border bg-panel px-3 text-sm">
        <option value="PRIVATE">Dùng riêng</option>
        {canPublish ? <option value="TEAM">Chia sẻ cho đội</option> : null}
      </select>
      <Button variant="secondary" size="sm">Lưu</Button>
    </div>
  );
}
