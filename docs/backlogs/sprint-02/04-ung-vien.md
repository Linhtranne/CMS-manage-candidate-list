# Ứng viên Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Xây Candidate list, saved views, drawer, Candidate 360, file states, duplicate review và import shell trên một hồ sơ gốc.

**Architecture:** Feature `candidates` tiêu thụ generated contract và tái sử dụng list/drawer primitives. Record status, readiness, contactability và operational phase được render riêng; import/duplicate là workflow có review, không tự merge.

**Tech Stack:** Next.js, TypeScript, TanStack Query/Table, React Hook Form, Zod, MSW, Vitest, Playwright.

**Spec:** `docs/ui-ux/03-ung-vien-ung-tuyen-phong-van.md` mục A; `docs/02-vong-doi-ung-vien.md`; `docs/11-tu-dien-du-lieu.md`.

> **Trạng thái triển khai:** Candidate contract, phase rule, fixture/handler, list với saved views, drawer tóm tắt, hồ sơ 360 và route `/candidates/[candidateId]` đã chạy trên frontend/mock. Các form tạo/sửa, import có preview và rà soát nghi trùng đã dùng chung modal có Escape, backdrop, focus, scroll-lock và animation; mutation thật vẫn cần nối backend NestJS.

### Evidence hiện có

- `apps/web/src/app/(cms)/candidates/page.tsx` và `[candidateId]/page.tsx` đã hết 404.
- `apps/web/src/features/candidates/` có query, phase rule, table, drawer và profile tabs.
- `tests/e2e/candidates.spec.ts` kiểm view tiềm năng, drawer, hồ sơ đầy đủ và view đang ứng tuyển.
- `apps/web/src/components/ui/modal.tsx` là primitive dùng chung cho create/edit/import/duplicate review; `tests/e2e/candidate-form-workflows.spec.ts` kiểm bốn luồng modal chính.

## Global Constraints

- Một người tương ứng một Candidate; Application/Journey không nhân bản hồ sơ.
- Tách `record_status`, `readiness_status`, `contactability_status` và operational phase.
- Không sửa trực tiếp phase tổng hợp.
- Field chuyên ngành đến từ schema/catalog có version; IT không phải mặc định.
- PII/tệp được mask theo permission; mọi download/merge/export có audit.
- Không dùng dữ liệu ứng viên thật trong fixture.

---

### Task 1: Candidate contract, derived phase và fixtures

**Files:**
- Modify: `packages/contracts/openapi/cms.yaml`
- Create: `apps/web/src/features/candidates/domain/derive-operational-phase.ts`
- Create: `apps/web/src/features/candidates/services/candidate-queries.ts`
- Create: `apps/web/src/mocks/fixtures/candidates.ts`
- Create: `apps/web/src/mocks/handlers/candidates.ts`
- Create: `apps/web/src/features/candidates/domain/derive-operational-phase.test.ts`

**Interfaces:**
- Produces: list/detail/search/import/duplicate endpoints cho `/candidates`.
- Produces: `deriveOperationalPhase(candidate): 'POTENTIAL' | 'APPLYING' | 'PASSED' | 'SUPPLYING' | 'SUPPLIED'`.

- [ ] **Step 1: Viết failing phase tests**

```ts
it.each([
  [{ hasActiveJourney: true, hasCompletedJourney: false }, 'SUPPLYING'],
  [{ hasActiveJourney: false, hasCompletedJourney: true }, 'SUPPLIED'],
  [{ hasActiveApplication: true }, 'APPLYING'],
])('derives phase from related records', (input, expected) => {
  expect(deriveOperationalPhase(input)).toBe(expected);
});
```

- [ ] **Step 2: Chạy test và xác nhận fail**

Run: `pnpm --filter @cms/web test -- src/features/candidates/domain/derive-operational-phase.test.ts`  
Expected: FAIL.

- [ ] **Step 3: Thêm schema và implementation thuần**

```ts
export function deriveOperationalPhase(input: OperationalPhaseInput): OperationalPhase {
  if (input.hasActiveJourney) return 'SUPPLYING';
  if (input.hasCompletedJourney) return 'SUPPLIED';
  if (input.hasPassedApplication) return 'PASSED';
  if (input.hasActiveApplication) return 'APPLYING';
  return 'POTENTIAL';
}
```

Fixture phải bao phủ multi-occupation, missing contact, archived, do-not-contact và PII masked.

- [ ] **Step 4: Generate contract và chạy tests**

Run: `pnpm generate:contracts && pnpm --filter @cms/web test -- src/features/candidates`  
Expected: PASS.

- [ ] **Step 5: Commit Candidate contract**

```powershell
git add packages/contracts apps/web/src/features/candidates apps/web/src/mocks
git commit -m "feat: add candidate contract and phase rules"
```

---

### Task 2: Candidate list, views và drawer

**Files:**
- Create: `apps/web/src/features/candidates/components/candidate-list-page.tsx`
- Create: `apps/web/src/features/candidates/components/candidate-table.tsx`
- Create: `apps/web/src/features/candidates/components/candidate-drawer.tsx`
- Create: `apps/web/src/app/(cms)/candidates/page.tsx`
- Create: `apps/web/src/features/candidates/components/candidate-list-page.test.tsx`

**Interfaces:**
- Consumes: `useCandidates`, `useListParams`, shared table/drawer.
- Produces: route `/candidates`.

- [ ] **Step 1: Viết failing saved-view test**

```tsx
it('renders potential candidates from readiness status without duplicating records', async () => {
  render(<CandidateListPage initialView="potential" />);
  expect(await screen.findAllByRole('row', { name: /Tiềm năng/ })).toHaveLength(2);
  expect(new Set(screen.getAllByTestId('candidate-id').map((node) => node.textContent)).size).toBe(2);
});
```

- [ ] **Step 2: Chạy test và xác nhận fail**

Run: `pnpm --filter @cms/web test -- src/features/candidates/components/candidate-list-page.test.tsx`  
Expected: FAIL.

- [ ] **Step 3: Implement list/drawer**

Columns: mã, tên, liên hệ, ngành/nghề chính, tiếng Nhật, phase, việc tiếp theo, owner, cập nhật cuối. Drawer có bốn nút chữ: gửi email, thêm vào đơn, tạo việc, mở hồ sơ đầy đủ.

```tsx
export const candidateColumns: ColumnDef<CandidateListItem>[] = [
  { accessorKey: 'code', header: 'Mã ứng viên' },
  { accessorKey: 'displayName', header: 'Họ và tên' },
  { accessorKey: 'primaryOccupationLabel', header: 'Ngành nghề' },
  { accessorKey: 'operationalPhaseLabel', header: 'Giai đoạn hiện tại' },
  { accessorKey: 'nextActionLabel', header: 'Việc tiếp theo' },
  { accessorKey: 'owner.displayName', header: 'Phụ trách' },
];
```

- [ ] **Step 4: Chạy tests**

Run: `pnpm --filter @cms/web test -- src/features/candidates/components`  
Expected: PASS cho saved views, masked contact, empty/no-results/permission và drawer URL.

- [ ] **Step 5: Commit Candidate list**

```powershell
git add apps/web/src/features/candidates/components 'apps/web/src/app/(cms)/candidates'
git commit -m "feat: build candidate list and drawer"
```

---

### Task 3: Candidate 360 và hồ sơ đa ngành

**Files:**
- Create: `apps/web/src/features/candidates/components/candidate-detail-page.tsx`
- Create: `apps/web/src/features/candidates/components/candidate-overview.tsx`
- Create: `apps/web/src/features/candidates/components/occupation-profiles.tsx`
- Create: `apps/web/src/features/candidates/components/candidate-files.tsx`
- Create: `apps/web/src/features/candidates/components/candidate-history.tsx`
- Create: `apps/web/src/app/(cms)/candidates/[candidateId]/page.tsx`
- Create: `apps/web/src/features/candidates/components/candidate-detail-page.test.tsx`

**Interfaces:**
- Produces: route `/candidates/[candidateId]` với tabs Overview, Applications, Journey, Email, Files, Tasks/Notes, History.

- [ ] **Step 1: Viết failing multi-industry test**

```tsx
it('renders field groups from the occupation schema version', async () => {
  render(<CandidateDetailPage candidateId="candidate-mechanical-01" />);
  expect(await screen.findByText('Kỹ thuật gia công')).toBeVisible();
  expect(screen.queryByText('Tech stack')).not.toBeInTheDocument();
  expect(screen.getByText('Phiên bản biểu mẫu 3')).toBeVisible();
});
```

- [ ] **Step 2: Chạy test và xác nhận fail**

Run: `pnpm --filter @cms/web test -- src/features/candidates/components/candidate-detail-page.test.tsx`  
Expected: FAIL.

- [ ] **Step 3: Implement detail tabs và schema renderer**

```ts
export type FieldDefinition = {
  key: string;
  label: string;
  kind: 'text' | 'number' | 'select' | 'multiselect' | 'date';
  required: boolean;
  options?: Array<{ value: string; label: string }>;
};
```

Internal note dùng component riêng có nhãn `Chỉ nội bộ`; file row có version, verifier, scan status và download permission.

- [ ] **Step 4: Chạy tests**

Run: `pnpm --filter @cms/web test -- src/features/candidates/components/candidate-detail-page.test.tsx`  
Expected: PASS cho IT/cơ khí/điều dưỡng fixtures và file quarantine.

- [ ] **Step 5: Commit Candidate 360**

```powershell
git add apps/web/src/features/candidates/components 'apps/web/src/app/(cms)/candidates/[candidateId]'
git commit -m "feat: build candidate 360 view"
```

---

### Task 4: Duplicate review và import shell

**Files:**
- Create: `apps/web/src/features/candidates/components/duplicate-review-dialog.tsx`
- Create: `apps/web/src/features/candidates/components/import-candidates-flow.tsx`
- Create: `apps/web/src/features/candidates/schemas/import-mapping.schema.ts`
- Create: `apps/web/src/features/candidates/components/duplicate-review-dialog.test.tsx`

**Interfaces:**
- Produces: merge payload `{ sourceCandidateId, targetCandidateId, reason, version }`.
- Produces: import steps `upload → mapping → preview → review-errors → submit`.

- [ ] **Step 1: Viết failing no-auto-merge test**

```tsx
it('requires explicit target and reason before merging', async () => {
  render(<DuplicateReviewDialog caseId="duplicate-01" open />);
  await userEvent.click(screen.getByRole('button', { name: 'Gộp hồ sơ' }));
  expect(screen.getByText('Vui lòng chọn hồ sơ đích')).toBeVisible();
  expect(screen.getByText('Vui lòng nhập lý do')).toBeVisible();
});
```

- [ ] **Step 2: Chạy test và xác nhận fail**

Run: `pnpm --filter @cms/web test -- src/features/candidates/components/duplicate-review-dialog.test.tsx`  
Expected: FAIL.

- [ ] **Step 3: Implement review/import states**

Import preview hiển thị total/valid/invalid/possible-duplicate, cho tải lỗi giả lập và không submit khi mapping trường bắt buộc thiếu. Merge button cần `candidates.merge` permission.

```ts
export const mergeCandidatesSchema = z.object({
  sourceCandidateId: z.string().uuid(),
  targetCandidateId: z.string().uuid(),
  reason: z.string().min(10, 'Vui lòng nhập lý do ít nhất 10 ký tự'),
  version: z.number().int().nonnegative(),
});
```

- [ ] **Step 4: Chạy tests**

Run: `pnpm --filter @cms/web test -- src/features/candidates`  
Expected: PASS cho create-separate, merge, cancel, invalid mapping và partial import.

- [ ] **Step 5: Commit review flows**

```powershell
git add apps/web/src/features/candidates
git commit -m "feat: add candidate import and duplicate review"
```

---

### Task 5: Candidate E2E và release gate

**Files:**
- Create: `tests/e2e/candidates.spec.ts`

**Interfaces:**
- Consumes: Candidate routes/fixtures.

- [ ] **Step 1: Viết failing E2E**

```ts
test('staff filters and opens a multi-industry candidate profile', async ({ page }) => {
  await page.goto('/candidates?view=potential');
  await page.getByRole('row', { name: /Trần Thu Hà/ }).click();
  await page.getByRole('link', { name: 'Mở hồ sơ đầy đủ' }).click();
  await expect(page.getByText('Hồ sơ nghề nghiệp')).toBeVisible();
  await assertNoSeriousA11yIssues(page);
});
```

- [ ] **Step 2: Chạy E2E và xác nhận fail**

Run: `pnpm e2e -- tests/e2e/candidates.spec.ts`  
Expected: FAIL cho đến khi route/drawer/detail hoàn chỉnh.

- [ ] **Step 3: Thêm scenario permission, duplicate và tablet**

Assert PII masked theo fixture; không dùng screenshot làm nguồn kiểm tra duy nhất.

```ts
test('duplicate review requires permission and reason', async ({ page }) => {
  await page.goto('/candidates?scenario=duplicate-review');
  await page.getByRole('button', { name: 'Xem hồ sơ có thể trùng' }).click();
  await expect(page.getByRole('button', { name: 'Gộp hồ sơ' })).toBeDisabled();
  await assertNoSeriousA11yIssues(page);
});
```

- [ ] **Step 4: Chạy full gate**

Run: `pnpm lint && pnpm typecheck && pnpm test && pnpm build && pnpm e2e -- tests/e2e/candidates.spec.ts`  
Expected: exit `0`.

- [ ] **Step 5: Commit Candidate gate**

```powershell
git add tests/e2e/candidates.spec.ts
git commit -m "test: cover candidate critical paths"
```
