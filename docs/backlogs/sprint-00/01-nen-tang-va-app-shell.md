# Nền tảng frontend và App shell Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tạo Next.js CMS chạy độc lập với contract sinh tự động, MSW, design system, permission-aware app shell và primitives dùng chung cho bảy plan nghiệp vụ còn lại.

**Architecture:** pnpm monorepo chứa `apps/web` và `packages/contracts`. Web gọi `/api/v1` qua generated OpenAPI types; MSW chặn cùng request trong development/test. App Router giữ layout, feature code colocate, URL là nguồn sự thật cho list context.

**Tech Stack:** Next.js App Router, TypeScript strict, Tailwind CSS v4, TanStack Query/Table, React Hook Form, Zod, openapi-typescript/openapi-fetch, MSW, Vitest, Testing Library, Playwright, axe-core.

**Spec:** `docs/ui-ux/00-index.md`, `docs/ui-ux/01-khung-cms.md`, `docs/ui-ux/07-he-thong-giao-dien-va-chat-luong.md`, `docs/03-kien-truc-va-stack.md`.

## Trạng thái implementation

- Tasks 1–6 đã được triển khai trong source hiện tại.
- Session của App shell gọi `GET /api/v1/me`; fixture chỉ được dùng qua MSW development/test.
- Release gate đã chạy: lint, typecheck, unit/contract test, build, Playwright + axe, Docker build/runtime healthcheck.
- Các bước `git commit` trong plan được giữ unchecked vì worktree đang được giữ nguyên để người dùng quyết định tích hợp.

## Global Constraints

- CMS chỉ dành cho nhân viên nội bộ; không tạo route hoặc auth flow cho Candidate.
- Desktop-first, giữ đủ thao tác cốt lõi trên tablet.
- Một primary action trên mỗi màn hình; chữ truyền đạt nghiệp vụ, icon chỉ hỗ trợ.
- Không dùng emoji, cờ Nhật, máy bay hoặc icon làm trạng thái duy nhất.
- List/search/filter/sort phân trang phía server và phản ánh trên URL.
- Permission UI chỉ hướng dẫn; API vẫn là lớp cưỡng chế.
- Text hiển thị dùng từ điển tiếng Việt, không rải hard text trong feature.
- `.env` không commit; chỉ `.env.example`.

---

### Task 1: Khởi tạo pnpm workspace và quality gate

**Files:**
- Modify: `.gitignore`
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `tsconfig.base.json`
- Create: `eslint.config.mjs`
- Create: `prettier.config.mjs`
- Create: `.env.example`
- Create: `apps/web/package.json`
- Create: `apps/web/next.config.ts`
- Create: `apps/web/tsconfig.json`
- Create: `apps/web/postcss.config.mjs`
- Create: `apps/web/src/app/layout.tsx`
- Create: `apps/web/src/app/page.tsx`
- Create: `apps/web/src/app/globals.css`
- Create: `packages/contracts/package.json`

**Interfaces:**
- Produces: root scripts `dev`, `lint`, `typecheck`, `test`, `build`, `generate:contracts`.
- Produces: workspace packages `@cms/web` và `@cms/contracts`.

- [ ] **Step 1: Chuyển `.gitignore` khỏi allowlist tài liệu trước khi tạo source**

Giữ policy dữ liệu nhạy cảm và thay phần `*` allowlist bằng baseline sau:

```gitignore
node_modules/
.next/
dist/
coverage/
playwright-report/
test-results/
.turbo/
.env
.env.*
!.env.example
*.log
*.pem
*.key
data/
uploads/
exports/
backups/
.agents/
.agent/
.impeccable/
```

- [ ] **Step 2: Khởi tạo Git nếu workspace chưa có repository và tạo Web app**

```powershell
if (-not (Test-Path -LiteralPath '.git')) { git init -b main }
pnpm dlx create-next-app@latest apps/web --ts --eslint --tailwind --app --src-dir --import-alias '@/*' --use-pnpm --yes
```

- [ ] **Step 3: Tạo root scripts và workspace config**

```json
{
  "name": "cms-candidate-supply",
  "private": true,
  "packageManager": "pnpm@11.6.0",
  "scripts": {
    "dev": "pnpm --filter @cms/web dev",
    "lint": "pnpm -r lint",
    "typecheck": "pnpm -r typecheck",
    "test": "pnpm -r test",
    "build": "pnpm -r build",
    "generate:contracts": "pnpm --filter @cms/contracts generate"
  }
}
```

```yaml
packages:
  - apps/*
  - packages/*
```

Đổi `apps/web/package.json` thành package `@cms/web`, thêm scripts `lint`, `typecheck`, `test`, `build`, rồi cài dependencies:

```json
{
  "name": "@cms/web",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "lint": "eslint src",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "build": "next build"
  }
}
```

```powershell
pnpm --filter @cms/web add @tanstack/react-query @tanstack/react-table openapi-fetch react-hook-form zod @hookform/resolvers class-variance-authority clsx tailwind-merge lucide-react
pnpm --filter @cms/web add -D vitest jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event msw
pnpm add -Dw playwright @axe-core/playwright
pnpm --filter @cms/contracts add -D openapi-typescript
```

`packages/contracts/package.json`:

```json
{
  "name": "@cms/contracts",
  "private": true,
  "type": "module",
  "exports": { ".": "./src/index.ts" },
  "scripts": {
    "generate": "openapi-typescript openapi/cms.yaml -o src/generated/schema.d.ts",
    "lint": "eslint src",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "build": "tsc --noEmit"
  }
}
```

- [ ] **Step 4: Chạy quality gate ban đầu**

Run: `pnpm install && pnpm lint && pnpm typecheck && pnpm build`  
Expected: mọi command exit `0`; route mặc định build thành công.

- [ ] **Step 5: Commit scaffold**

```powershell
git add .gitignore .env.example package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json eslint.config.mjs prettier.config.mjs apps/web packages/contracts
git commit -m "chore: scaffold cms frontend workspace"
```

---

### Task 2: OpenAPI client, Query provider và MSW runtime

**Files:**
- Create: `packages/contracts/openapi/cms.yaml`
- Create: `packages/contracts/src/index.ts`
- Create: `packages/contracts/package.json`
- Create: `apps/web/src/lib/api/client.ts`
- Create: `apps/web/src/providers/query-provider.tsx`
- Create: `apps/web/src/mocks/browser.ts`
- Create: `apps/web/src/mocks/server.ts`
- Create: `apps/web/src/mocks/handlers/system.ts`
- Create: `apps/web/src/mocks/fixtures/users.ts`
- Create: `apps/web/src/test/setup.ts`
- Create: `apps/web/src/lib/api/client.test.ts`
- Modify: `apps/web/src/app/layout.tsx`

**Interfaces:**
- Produces: `apiClient` typed từ `paths` trong `@cms/contracts`.
- Produces: `QueryProvider({ children })`.
- Produces: MSW `worker` cho development và `server` cho Vitest.
- Produces: role fixtures `recruiterFixture`, `coordinatorFixture`, `managerFixture`, `configAdminFixture`, `auditorFixture` dùng xuyên tests.

- [ ] **Step 1: Viết failing test cho typed API wrapper**

```ts
import { describe, expect, it } from 'vitest';
import { apiClient } from './client';

describe('apiClient', () => {
  it('exposes GET operations from the generated contract', () => {
    expect(apiClient.GET).toBeTypeOf('function');
  });
});
```

- [ ] **Step 2: Chạy test để xác nhận fail**

Run: `pnpm --filter @cms/web test -- src/lib/api/client.test.ts`  
Expected: FAIL vì `client.ts` hoặc generated `paths` chưa tồn tại.

- [ ] **Step 3: Thêm contract nền và generate types**

```yaml
openapi: 3.1.0
info:
  title: Candidate Supply CMS API
  version: 1.0.0
servers:
  - url: /api/v1
paths:
  /me:
    get:
      operationId: getCurrentUser
      responses:
        '200':
          description: Current internal user
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/CurrentUser'
components:
  schemas:
    CurrentUser:
      type: object
      required: [id, displayName, roles, permissions]
      properties:
        id: { type: string, format: uuid }
        displayName: { type: string }
        roles: { type: array, items: { type: string } }
        permissions: { type: array, items: { type: string } }
```

```ts
import createClient from 'openapi-fetch';
import type { paths } from '@cms/contracts';

export const apiClient = createClient<paths>({ baseUrl: '/api/v1' });
```

Run: `pnpm generate:contracts`  
Expected: `packages/contracts/src/generated/schema.d.ts` được sinh và package export `paths`.

- [ ] **Step 4: Thêm QueryProvider/MSW và chạy test**

```tsx
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';

export function QueryProvider({ children }: { children: ReactNode }) {
  const [client] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: false } } }));
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
```

Run: `pnpm --filter @cms/web test -- src/lib/api/client.test.ts`  
Expected: PASS.

- [ ] **Step 5: Commit contract runtime**

```powershell
git add packages/contracts apps/web/src/lib/api apps/web/src/providers apps/web/src/mocks apps/web/src/test apps/web/src/app/layout.tsx
git commit -m "feat: add typed api and mock runtime"
```

---

### Task 3: Design tokens và UI primitives

**Files:**
- Modify: `apps/web/src/app/globals.css`
- Create: `apps/web/src/components/ui/button.tsx`
- Create: `apps/web/src/components/ui/status-label.tsx`
- Create: `apps/web/src/components/ui/empty-state.tsx`
- Create: `apps/web/src/components/ui/loading-state.tsx`
- Create: `apps/web/src/components/ui/error-state.tsx`
- Create: `apps/web/src/components/ui/button.test.tsx`
- Create: `apps/web/src/components/ui/status-label.test.tsx`
- Create: `apps/web/src/i18n/vi.ts`
- Modify: `apps/web/package.json` (thêm `@fontsource/be-vietnam-pro`)
- Modify: `apps/web/src/app/layout.tsx` (nạp đủ subset Latin/Latin-ext/Vietnamese cho weight 400/600/700)

**Interfaces:**
- Produces: `Button`, `StatusLabel`, `EmptyState`, `LoadingState`, `ErrorState`.
- Produces: CSS tokens `--color-*`, `--space-*`, `--radius-*`, `--shadow-*`.
- Produces: Be Vietnam Pro chính thức với đầy đủ subset Latin/Latin-ext/Vietnamese và Vietnamese copy dictionary.

- [ ] **Step 1: Viết failing tests cho button và status**

```tsx
it('requires visible text for primary business actions', () => {
  render(<Button variant="primary">Thêm ứng viên</Button>);
  expect(screen.getByRole('button', { name: 'Thêm ứng viên' })).toBeVisible();
});

it('renders status text independently from color', () => {
  render(<StatusLabel tone="danger">Quá hạn</StatusLabel>);
  expect(screen.getByText('Quá hạn')).toBeVisible();
});
```

- [ ] **Step 2: Chạy test để xác nhận fail**

Run: `pnpm --filter @cms/web test -- src/components/ui`  
Expected: FAIL vì primitives chưa tồn tại.

- [ ] **Step 3: Tạo token CSS-first và primitives tối thiểu**

```css
@theme {
  --color-surface: #fbfaf7;
  --color-panel: #ffffff;
  --color-text: #182233;
  --color-text-muted: #667085;
  --color-accent: #245ea8;
  --color-danger: #b42318;
  --color-border: #d9dee7;
  --radius-control: 0.5rem;
}

:focus-visible {
  outline: 3px solid color-mix(in srgb, var(--color-accent) 40%, transparent);
  outline-offset: 2px;
}
```

```tsx
export function StatusLabel({ children, tone = 'neutral' }: StatusLabelProps) {
  return <span className={statusLabelVariants({ tone })}>{children}</span>;
}
```

Font dùng package chính thức `@fontsource/be-vietnam-pro` để giữ đủ ba unicode subset (Latin, Latin-ext, Vietnamese) cho từng weight. Không dùng một Vietnamese subset lặp lại cho mọi weight:

```tsx
import '@fontsource/be-vietnam-pro/400.css';
import '@fontsource/be-vietnam-pro/600.css';
import '@fontsource/be-vietnam-pro/700.css';
```

- [ ] **Step 4: Chạy component tests và axe smoke**

Run: `pnpm --filter @cms/web test -- src/components/ui`  
Expected: PASS; status text vẫn tồn tại khi bỏ class màu.

- [ ] **Step 5: Commit design primitives**

```powershell
git add apps/web/src/styles apps/web/src/components/ui
git commit -m "feat: add cms design primitives"
```

---

### Task 4: Permission-aware App shell

**Files:**
- Create: `apps/web/src/lib/permissions/permissions.ts`
- Create: `apps/web/src/lib/permissions/permission-gate.tsx`
- Create: `apps/web/src/components/layout/cms-shell.tsx`
- Create: `apps/web/src/components/layout/sidebar.tsx`
- Create: `apps/web/src/components/layout/topbar.tsx`
- Create: `apps/web/src/constants/navigation.ts`
- Create: `apps/web/src/components/layout/global-search.tsx`
- Create: `apps/web/src/components/layout/notification-menu.tsx`
- Create: `apps/web/src/app/(auth)/login/page.tsx`
- Create: `apps/web/src/app/session-expired/page.tsx`
- Create: `apps/web/src/app/forbidden/page.tsx`
- Modify: `packages/contracts/openapi/cms.yaml`
- Create: `apps/web/src/mocks/handlers/search-auth.ts`
- Create: `apps/web/src/app/(cms)/layout.tsx`
- Create: `apps/web/src/app/(cms)/work/page.tsx`
- Create: `apps/web/src/components/layout/cms-shell.test.tsx`
- Create: `apps/web/src/components/layout/global-search.test.tsx`
- Create: `apps/web/src/app/(auth)/login/page.test.tsx`
- Create: `apps/web/src/app/session-expired/page.test.tsx`

**Interfaces:**
- Produces: `can(permissions, action): boolean`.
- Produces: `PermissionGate({ permission, fallback, children })`.
- Produces: route metadata `{ href, label, permission }`.
- Produces: `GET /search`, `POST /auth/login`, `POST /auth/logout`, session-expired/forbidden routes.

- [ ] **Step 1: Viết failing test cho tám khu vực và Admin theo quyền**

```tsx
it('shows eight CMS areas and hides Admin without permission', () => {
  render(<CmsShell user={recruiterFixture}>{children}</CmsShell>);
  expect(screen.getAllByRole('link')).toEqual(expect.arrayContaining([
    expect.objectContaining({ textContent: 'Việc của tôi' }),
    expect.objectContaining({ textContent: 'Hộp thư chung' }),
  ]));
  expect(screen.queryByText('Quản trị')).not.toBeInTheDocument();
});

it('does not expose search results outside the current permission scope', async () => {
  render(<GlobalSearch user={recruiterFixture} />);
  await userEvent.type(screen.getByRole('combobox', { name: 'Tìm kiếm toàn hệ thống' }), 'Sakura');
  expect(await screen.findByText('Sakura Care Partners')).toBeVisible();
  expect(screen.queryByText('Candidate thuộc đội khác')).not.toBeInTheDocument();
});

it('renders an explicit session-expired recovery action', () => {
  render(<SessionExpiredPage />);
  expect(screen.getByRole('link', { name: 'Đăng nhập lại' })).toHaveAttribute('href', '/login');
});
```

- [ ] **Step 2: Chạy test để xác nhận fail**

Run: `pnpm --filter @cms/web test -- src/components/layout/cms-shell.test.tsx`  
Expected: FAIL vì shell/navigation chưa tồn tại.

- [ ] **Step 3: Cài navigation và permission contract**

```ts
export const navigation = [
  { href: '/work', label: 'Việc của tôi', permission: 'work.read' },
  { href: '/clients', label: 'Khách hàng', permission: 'clients.read' },
  { href: '/orders', label: 'Đơn tuyển', permission: 'orders.read' },
  { href: '/candidates', label: 'Ứng viên', permission: 'candidates.read' },
  { href: '/applications', label: 'Ứng tuyển & Phỏng vấn', permission: 'applications.read' },
  { href: '/supply-journeys', label: 'Lộ trình cung ứng', permission: 'journeys.read' },
  { href: '/mailbox', label: 'Hộp thư chung', permission: 'mail.read' },
  { href: '/reports', label: 'Báo cáo', permission: 'reports.read' },
] as const;
```

Sidebar dùng text label; icon chỉ được thêm sau khi có accessible label và không thay text.

Global search nhóm kết quả theo Candidate/Client/Order và không render record ngoài permission:

```tsx
export function GlobalSearchResult({ result }: { result: SearchResult }) {
  return <Link href={result.href}><span>{result.primaryText}</span><small>{result.typeLabel}</small></Link>;
}
```

- [ ] **Step 4: Chạy unit test và responsive component test**

Run: `pnpm generate:contracts && pnpm --filter @cms/web test -- src/components/layout src/app`  
Expected: PASS cho recruiter/admin fixtures; search không rò record ngoài quyền; login/session-expired/forbidden có heading/action đúng; tablet variant giữ navigation trigger có tên.

- [ ] **Step 5: Commit App shell**

```powershell
git add apps/web/src/lib/permissions apps/web/src/components/layout apps/web/src/constants apps/web/src/app
git commit -m "feat: add permission aware cms shell"
```

---

### Task 5: List state, data table, saved view và detail drawer

**Files:**
- Create: `apps/web/src/hooks/use-list-params.ts`
- Create: `apps/web/src/components/ui/cms-data-table.tsx`
- Create: `apps/web/src/components/ui/saved-view-bar.tsx`
- Create: `apps/web/src/components/ui/saved-view-menu.tsx`
- Create: `apps/web/src/services/saved-view-service.ts`
- Create: `apps/web/src/mocks/handlers/saved-views.ts`
- Modify: `packages/contracts/openapi/cms.yaml`
- Create: `apps/web/src/components/ui/detail-drawer.tsx`
- Create: `apps/web/src/components/ui/list-state.test.tsx`

**Interfaces:**
- Produces: `useListParams({ defaultView })` với `query`, `view`, `sort`, `cursor`, `selectedId`.
- Produces: `CmsDataTable<TData>`, `SavedViewBar`, `DetailDrawer`.
- Produces: `GET/POST/PATCH /saved-views`; manager có thể publish view theo permission.

- [ ] **Step 1: Viết failing test cho URL state**

```tsx
it('keeps view, sort and selected record in the URL', async () => {
  render(<ListHarness initialUrl="/candidates?view=potential&sort=-updatedAt" />);
  await userEvent.click(screen.getByText('Nguyễn Minh An'));
  expect(window.location.search).toContain('view=potential');
  expect(window.location.search).toContain('selectedId=candidate-01');
});

it('saves a private view and only lets managers publish team views', async () => {
  render(<SavedViewMenu resource="candidates" user={recruiterFixture} />);
  expect(screen.getByRole('option', { name: 'Dùng riêng' })).toBeVisible();
  expect(screen.queryByRole('option', { name: 'Chia sẻ cho đội' })).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Chạy test để xác nhận fail**

Run: `pnpm --filter @cms/web test -- src/components/ui/list-state.test.tsx`  
Expected: FAIL vì list primitives chưa tồn tại.

- [ ] **Step 3: Tạo typed list params và generic components**

```ts
export type ListParams = {
  query: string;
  view: string;
  sort: string;
  cursor?: string;
  selectedId?: string;
};
```

`CmsDataTable` nhận TanStack `ColumnDef<TData>[]`, server pagination callback và render đủ loading/empty/no-results/error. `DetailDrawer` dùng `selectedId` và trả focus về row đã mở.

```ts
export type SaveViewInput = {
  resource: string;
  name: string;
  query: Record<string, string | string[]>;
  visibility: 'PRIVATE' | 'TEAM';
};
```

- [ ] **Step 4: Chạy tests**

Run: `pnpm generate:contracts && pnpm --filter @cms/web test -- src/components/ui src/hooks src/services`  
Expected: PASS cho URL restore, no-results, permission, drawer focus, save private view và publish team view theo quyền.

- [ ] **Step 5: Commit list foundation**

```powershell
git add apps/web/src/hooks apps/web/src/components/ui
git commit -m "feat: add list and drawer foundation"
```

---

### Task 6: Playwright, accessibility và shell release gate

**Files:**
- Create: `playwright.config.ts`
- Create: `tests/e2e/app-shell.spec.ts`
- Create: `tests/e2e/helpers/axe.ts`
- Modify: `package.json`

**Interfaces:**
- Produces: `pnpm e2e` và `assertNoSeriousA11yIssues(page)`.
- Consumes: App shell, MSW development runtime.

- [ ] **Step 1: Viết failing E2E**

```ts
test('app shell works on desktop and tablet', async ({ page }) => {
  await page.goto('/work');
  await expect(page.getByRole('link', { name: 'Ứng viên' })).toBeVisible();
  await page.setViewportSize({ width: 768, height: 1024 });
  await expect(page.getByRole('button', { name: 'Mở điều hướng' })).toBeVisible();
  await assertNoSeriousA11yIssues(page);
});
```

- [ ] **Step 2: Chạy E2E để xác nhận fail**

Run: `pnpm e2e -- tests/e2e/app-shell.spec.ts`  
Expected: FAIL cho đến khi Playwright config, MSW boot và tablet navigation hoàn chỉnh.

- [ ] **Step 3: Hoàn thiện E2E config và axe helper**

```ts
export async function assertNoSeriousA11yIssues(page: Page) {
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations.filter((v) => ['serious', 'critical'].includes(v.impact ?? ''))).toEqual([]);
}
```

Thêm root script:

```json
{
  "scripts": {
    "e2e": "playwright test"
  }
}
```

- [ ] **Step 4: Chạy full Sprint 0 gate**

Run: `pnpm lint && pnpm typecheck && pnpm test && pnpm build && pnpm e2e`  
Expected: toàn bộ exit `0`; app shell đạt desktop/tablet và axe gate.

- [ ] **Step 5: Commit Sprint 0**

```powershell
git add playwright.config.ts tests/e2e package.json pnpm-lock.yaml
git commit -m "test: add app shell release gate"
```
