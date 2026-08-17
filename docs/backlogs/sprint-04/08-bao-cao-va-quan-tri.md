# Báo cáo và quản trị Implementation Plan

status: implemented (frontend/mock contract)

## Evidence

- Routes: `/reports`, `/admin/users`, `/admin/catalogs`, `/admin/templates`, `/admin/mailbox`, `/admin/audit`.
- Contract and MSW handlers cover report summary/funnel/export and admin users/roles/catalogs/templates/mailbox/audit.
- Verification: `pnpm test` (63 web tests + 1 contract test), `pnpm e2e` (18 passed), lint/typecheck/build passed.
- Production-like local shell: `NEXT_PUBLIC_MSW_ENABLED=true` with `next start -p 3000`; backend persistence/export worker remain future integration scope.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Xây báo cáo vận hành có định nghĩa mẫu số/drill-down/export và các màn hình quản trị người dùng, quyền, catalog, template, mailbox, audit.

**Architecture:** Report query dùng filter chuẩn hóa và trả metric kèm numerator/denominator/asOf; click metric mở list tương ứng. Admin feature tách users, catalogs, templates, mailbox và audit; UI permission-aware nhưng API/mock cưỡng chế action/scope/sensitivity.

**Tech Stack:** Next.js, TypeScript, TanStack Query/Table, React Hook Form, Zod, MSW, Vitest, Playwright.

**Spec:** `docs/ui-ux/06-bao-cao-quan-tri.md`; `docs/06-phan-quyen-bao-mat.md`; `docs/09-kiem-thu-nghiem-thu.md`.

## Global Constraints

- Candidate, Application, Interview và Journey dùng mẫu số riêng.
- KPI phải drill-down được và hiển thị khoảng thời gian/as-of.
- Chart chỉ cho trend/comparison; table/number là nguồn chính.
- Export chạy nền, theo scope, mask PII và có audit.
- Admin không mặc định đọc email/tài liệu Candidate.
- Catalog/template có version; giá trị đã dùng chỉ retire.
- Credential mailbox không được trả lại UI sau khi lưu.

---

### Task 1: Report/Admin contracts và metric definitions

**Files:**
- Modify: `packages/contracts/openapi/cms.yaml`
- Create: `apps/web/src/features/reports/domain/report-filters.ts`
- Create: `apps/web/src/features/reports/domain/metric.ts`
- Create: `apps/web/src/features/reports/services/report-queries.ts`
- Create: `apps/web/src/features/admin/services/admin-queries.ts`
- Create: `apps/web/src/mocks/fixtures/reports.ts`
- Create: `apps/web/src/mocks/fixtures/admin.ts`
- Create: `apps/web/src/mocks/handlers/reports-admin.ts`
- Create: `apps/web/src/features/reports/domain/report-filters.test.ts`

**Interfaces:**
- Produces: report summary/funnel/orders/journeys/mail/tasks/data-quality/export endpoints.
- Produces: admin user/team/role/catalog/template/mailbox/audit endpoints.
- Produces: `normalizeReportFilters(searchParams)`.
- Produces: `normalizeMetric(input)` với rate/label nhất quán.

- [ ] **Step 1: Viết failing metric/filter tests**

```ts
it('keeps numerator, denominator and timezone in a conversion metric', () => {
  expect(normalizeMetric({ numerator: 18, denominator: 60, timeZone: 'Asia/Ho_Chi_Minh' })).toEqual({
    numerator: 18,
    denominator: 60,
    rate: 0.3,
    label: '18/60 — 30%',
    timeZone: 'Asia/Ho_Chi_Minh',
  });
});
```

- [ ] **Step 2: Chạy test và xác nhận fail**

Run: `pnpm --filter @cms/web test -- src/features/reports/domain/report-filters.test.ts`  
Expected: FAIL.

- [ ] **Step 3: Thêm schemas và fixtures**

`ReportMetric` bắt buộc có `key`, `label`, `value`, `numerator?`, `denominator?`, `unit`, `asOf`, `drilldownHref`. Fixture chứng minh Candidate count khác Application count. Admin fixture có recruiter, coordinator, manager, admin-config-only và auditor.

```ts
export type ReportMetric = {
  key: string;
  label: string;
  value: number;
  numerator?: number;
  denominator?: number;
  unit: 'COUNT' | 'PERCENT' | 'DAYS' | 'MINUTES';
  asOf: string;
  drilldownHref: string;
};

export function normalizeMetric(input: { numerator: number; denominator: number; timeZone: string }) {
  const rate = input.denominator === 0 ? 0 : input.numerator / input.denominator;
  return { ...input, rate, label: `${input.numerator}/${input.denominator} — ${Math.round(rate * 100)}%` };
}
```

- [ ] **Step 4: Generate contract và chạy tests**

Run: `pnpm generate:contracts && pnpm --filter @cms/web test -- src/features/reports src/features/admin`  
Expected: PASS.

- [ ] **Step 5: Commit Report/Admin contracts**

```powershell
git add packages/contracts apps/web/src/features/reports apps/web/src/features/admin apps/web/src/mocks
git commit -m "feat: add reporting and admin contracts"
```

---

### Task 2: Report dashboard, filters và drill-down

**Files:**
- Create: `apps/web/src/features/reports/components/report-page.tsx`
- Create: `apps/web/src/features/reports/components/report-filter-bar.tsx`
- Create: `apps/web/src/features/reports/components/metric-strip.tsx`
- Create: `apps/web/src/features/reports/components/funnel-table.tsx`
- Create: `apps/web/src/features/reports/components/report-section.tsx`
- Create: `apps/web/src/app/(cms)/reports/page.tsx`
- Create: `apps/web/src/features/reports/components/report-page.test.tsx`

**Interfaces:**
- Produces: `/reports?from=&to=&teamId=&ownerId=&clientId=&orderId=&industryId=&sourceId=`.

- [ ] **Step 1: Viết failing drill-down test**

```tsx
it('shows the denominator and navigates to the underlying records', async () => {
  render(<ReportPage />);
  const metric = await screen.findByRole('link', { name: 'Trúng tuyển 18/60 — 30%' });
  expect(metric).toHaveAttribute('href', expect.stringContaining('/applications?view=passed'));
  expect(screen.getByText(/Dữ liệu cập nhật lúc/)).toBeVisible();
});
```

- [ ] **Step 2: Chạy test và xác nhận fail**

Run: `pnpm --filter @cms/web test -- src/features/reports/components/report-page.test.tsx`  
Expected: FAIL.

- [ ] **Step 3: Implement report sections**

Sections: Recruitment funnel, Source quality, Clients/Orders, Supply Journey, Shared Mailbox, Workload, Data Quality. Chỉ thêm chart cho trend; metric strip không có icon trang trí.

```tsx
export function MetricLink({ metric }: { metric: ReportMetric }) {
  const value = metric.denominator ? `${metric.numerator}/${metric.denominator} — ${Math.round(metric.value * 100)}%` : String(metric.value);
  return <Link href={metric.drilldownHref} aria-label={`${metric.label} ${value}`}><strong>{value}</strong><span>{metric.label}</span></Link>;
}
```

- [ ] **Step 4: Chạy tests**

Run: `pnpm --filter @cms/web test -- src/features/reports`  
Expected: PASS cho URL filters, metric denominator, drill-down, empty/permission/error.

- [ ] **Step 5: Commit Reports UI**

```powershell
git add apps/web/src/features/reports 'apps/web/src/app/(cms)/reports'
git commit -m "feat: build operational reports"
```

---

### Task 3: Asynchronous export workflow

**Files:**
- Create: `apps/web/src/features/reports/components/export-report-dialog.tsx`
- Create: `apps/web/src/features/reports/components/export-job-status.tsx`
- Create: `apps/web/src/features/reports/schemas/export-report.schema.ts`
- Create: `apps/web/src/features/reports/components/export-report-dialog.test.tsx`

**Interfaces:**
- Produces: export request `{ reportKey, filters, format: 'CSV' | 'XLSX', includedFields }`.
- Consumes: export job `{ id, status, progress?, downloadUrl?, expiresAt?, error? }`.

- [ ] **Step 1: Viết failing queued-state/scope test**

```tsx
it('reports queued instead of completed and excludes forbidden fields', async () => {
  render(<ExportReportDialog reportKey="candidates" open user={teamScopedRecruiter} />);
  expect(screen.queryByLabelText('Số hộ chiếu')).not.toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Tạo tệp xuất' }));
  expect(await screen.findByText('Đang tạo tệp')).toBeVisible();
});
```

- [ ] **Step 2: Chạy test và xác nhận fail**

Run: `pnpm --filter @cms/web test -- src/features/reports/components/export-report-dialog.test.tsx`  
Expected: FAIL.

- [ ] **Step 3: Implement export state machine**

States: `QUEUED`, `RUNNING`, `COMPLETED`, `FAILED`, `EXPIRED`. Download link chỉ hiện ở `COMPLETED`, có expires text và permission; retry tạo job mới có audit.

```tsx
if (job.status === 'COMPLETED') return <a href={job.downloadUrl}>Tải tệp trước {formatDateTime(job.expiresAt)}</a>;
if (job.status === 'FAILED') return <ErrorState title="Không thể tạo tệp" actionLabel="Thử lại" onAction={retry} />;
return <StatusLabel>{job.status === 'QUEUED' ? 'Đang chờ xử lý' : 'Đang tạo tệp'}</StatusLabel>;
```

- [ ] **Step 4: Chạy tests**

Run: `pnpm --filter @cms/web test -- src/features/reports`  
Expected: PASS cho scoped fields, queued/running/completed/failed/expired.

- [ ] **Step 5: Commit Export UI**

```powershell
git add apps/web/src/features/reports
git commit -m "feat: add audited report exports"
```

---

### Task 4: Users, teams, roles và permission editor

**Files:**
- Create: `apps/web/src/features/admin/components/users-page.tsx`
- Create: `apps/web/src/features/admin/components/user-form.tsx`
- Create: `apps/web/src/features/admin/components/role-permission-matrix.tsx`
- Create: `apps/web/src/app/(cms)/admin/users/page.tsx`
- Create: `apps/web/src/features/admin/components/role-permission-matrix.test.tsx`

**Interfaces:**
- Produces: user update `{ teamId, roleIds, status, version }`.
- Produces: role update `{ actions, scopes, sensitivities, version }`.

- [ ] **Step 1: Viết failing admin-no-content-access test**

```tsx
it('does not infer business-content access from configuration admin role', () => {
  render(<RolePermissionMatrix role={configAdminRoleFixture} />);
  expect(screen.getByRole('checkbox', { name: 'Đọc nội dung email' })).not.toBeChecked();
  expect(screen.getByRole('checkbox', { name: 'Quản lý danh mục' })).toBeChecked();
});
```

- [ ] **Step 2: Chạy test và xác nhận fail**

Run: `pnpm --filter @cms/web test -- src/features/admin/components/role-permission-matrix.test.tsx`  
Expected: FAIL.

- [ ] **Step 3: Implement users/roles UI**

Matrix nhóm action, scope (`SELF/TEAM/DEPARTMENT/ALL`) và sensitivity. Khóa user/thu hồi session cần confirm. Không dùng hidden checkbox để thay API authorization.

```ts
export type RolePermissionDraft = {
  action: string;
  scopes: Array<'SELF' | 'TEAM' | 'DEPARTMENT' | 'ALL'>;
  sensitivities: string[];
};
```

- [ ] **Step 4: Chạy tests**

Run: `pnpm --filter @cms/web test -- src/features/admin`  
Expected: PASS cho role fixtures, lock user, version conflict và permission denied.

- [ ] **Step 5: Commit Identity Admin UI**

```powershell
git add apps/web/src/features/admin 'apps/web/src/app/(cms)/admin/users'
git commit -m "feat: add user and permission administration"
```

---

### Task 5: Catalogs, templates, mailbox health và audit

**Files:**
- Create: `apps/web/src/features/admin/components/catalogs-page.tsx`
- Create: `apps/web/src/features/admin/components/journey-templates-page.tsx`
- Create: `apps/web/src/features/admin/components/email-templates-page.tsx`
- Create: `apps/web/src/features/admin/components/mailbox-settings-page.tsx`
- Create: `apps/web/src/features/admin/components/audit-log-page.tsx`
- Create: `apps/web/src/app/(cms)/admin/catalogs/page.tsx`
- Create: `apps/web/src/app/(cms)/admin/templates/page.tsx`
- Create: `apps/web/src/app/(cms)/admin/mailbox/page.tsx`
- Create: `apps/web/src/app/(cms)/admin/audit/page.tsx`
- Create: `apps/web/src/features/admin/components/mailbox-settings-page.test.tsx`

**Interfaces:**
- Produces: version/retire actions cho catalog/template.
- Consumes: mailbox health DTO không chứa credential.
- Produces: audit filters actor/time/resource/action/source.

- [ ] **Step 1: Viết failing credential/retire tests**

```tsx
it('never renders a saved mailbox credential and retires used catalog values', async () => {
  render(<MailboxSettingsPage />);
  expect(screen.queryByDisplayValue(/secret|token/i)).not.toBeInTheDocument();
  render(<CatalogsPage />);
  expect(screen.getByRole('button', { name: 'Ngừng sử dụng ngành nghề' })).toBeVisible();
  expect(screen.queryByRole('button', { name: 'Xóa ngành nghề' })).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Chạy test và xác nhận fail**

Run: `pnpm --filter @cms/web test -- src/features/admin/components/mailbox-settings-page.test.tsx`  
Expected: FAIL.

- [ ] **Step 3: Implement admin surfaces**

Journey/Email templates có version + preview + retire. Mailbox chỉ hiển thị address, sender name, adapter, limit, health, last checked và masked credential state. Audit read-only, server-filtered, sensitive values masked.

```ts
export type MailboxSettingsView = {
  address: string;
  senderName: string;
  adapter: 'MICROSOFT_365' | 'GOOGLE_WORKSPACE' | 'SMTP_IMAP';
  maxAttachmentBytes: number;
  health: 'HEALTHY' | 'DEGRADED' | 'DISCONNECTED';
  lastCheckedAt: string;
  credentialConfigured: boolean;
};
```

Kiểu trên cố ý không có token/secret/refresh credential.

- [ ] **Step 4: Chạy tests**

Run: `pnpm --filter @cms/web test -- src/features/admin`  
Expected: PASS cho versioning, retire, credential absence, audit filters và permission.

- [ ] **Step 5: Commit Config Admin UI**

```powershell
git add apps/web/src/features/admin 'apps/web/src/app/(cms)/admin'
git commit -m "feat: add cms configuration administration"
```

---

### Task 6: Reports/Admin E2E và roadmap release gate

**Files:**
- Create: `tests/e2e/reports-admin.spec.ts`
- Create: `tests/e2e/critical-candidate-journey-mail.spec.ts`
- Create: `tests/e2e/helpers/session.ts`
- Create: `tests/e2e/helpers/scenario.ts`

**Interfaces:**
- Consumes: toàn bộ feature routes và role fixtures.
- Produces: `useUserFixture(page, fixtureName)`, `seedScenario(page, scenarioName)` cho MSW E2E mode.

- [ ] **Step 1: Viết failing report/admin E2E**

```ts
test('manager drills down a metric while config admin cannot read candidate mail', async ({ page }) => {
  await page.goto('/reports');
  await page.getByRole('link', { name: /Trúng tuyển 18\/60/ }).click();
  await expect(page).toHaveURL(/applications\?view=passed/);
  await useUserFixture(page, 'config-admin');
  await page.goto('/mailbox');
  await expect(page.getByText('Bạn không có quyền truy cập nội dung email')).toBeVisible();
});
```

- [ ] **Step 2: Chạy E2E và xác nhận fail**

Run: `pnpm e2e -- tests/e2e/reports-admin.spec.ts`  
Expected: FAIL trước khi routes/fixtures hoàn chỉnh.

- [ ] **Step 3: Thêm critical cross-feature flow**

`critical-candidate-journey-mail.spec.ts` kiểm Candidate → add Order → Application → Interview result → PASSED → start Journey → update milestone → send Email, dùng dữ liệu giả và assert audit-visible outcomes.

```ts
export async function useUserFixture(page: Page, fixtureName: string) {
  await page.addInitScript((name) => localStorage.setItem('e2e-user-fixture', name), fixtureName);
  await page.reload();
}

export async function seedScenario(page: Page, scenarioName: string) {
  await page.request.post('/__test__/scenario', { data: { scenarioName } });
}
```

```ts
test('candidate operations flow remains traceable across features', async ({ page }) => {
  await seedScenario(page, 'candidate-to-supply');
  await page.goto('/candidates/candidate-01');
  await expect(page.getByText('Đang cung ứng')).toBeVisible();
  await page.getByRole('tab', { name: 'Email' }).click();
  await expect(page.getByText('Đã xếp hàng gửi')).toBeVisible();
  await page.goto('/admin/audit?resourceId=candidate-01');
  await expect(page.getByRole('row', { name: /SUPPLY_JOURNEY_STARTED/ })).toBeVisible();
});
```

- [ ] **Step 4: Chạy toàn bộ roadmap gate**

Run: `pnpm generate:contracts && git diff --exit-code packages/contracts/src/generated && pnpm lint && pnpm typecheck && pnpm test && pnpm build && pnpm e2e`  
Expected: exit `0`; generated contract không có diff; axe không có serious/critical violation.

- [ ] **Step 5: Commit roadmap gate**

```powershell
git add tests/e2e/reports-admin.spec.ts tests/e2e/critical-candidate-journey-mail.spec.ts tests/e2e/helpers
git commit -m "test: add cms ui release gate"
```
