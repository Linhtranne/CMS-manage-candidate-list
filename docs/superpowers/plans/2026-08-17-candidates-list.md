# Candidates List Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Xây route `/candidates` cho nhân viên nội bộ để quản lý hồ sơ ứng viên theo phase, ngành nghề, mức sẵn sàng và lịch sử liên quan.

**Architecture:** Candidate là hồ sơ gốc dùng chung cho Application và Supply Journey. Route danh sách dùng saved-view URL params, TanStack Query và MSW contract; click dòng mở drawer tóm tắt, còn hồ sơ đầy đủ dùng route `/candidates/[candidateId]` với các tab tổng quan, ứng tuyển, lộ trình, email, tệp và lịch sử.

**Tech Stack:** Next.js App Router, React/TypeScript, TanStack Query/Table, OpenAPI-generated types, MSW, Vitest, Playwright, Tailwind CSS.

**Spec:** `docs/backlogs/sprint-02/04-ung-vien.md`, `docs/ui-ux/03-ung-vien-ung-tuyen-phong-van.md`.

## Global Constraints

- CMS chỉ dành cho nhân viên nội bộ; ứng viên không đăng nhập vào CMS.
- Một người chỉ có một Candidate; Application và Journey tham chiếu Candidate, không nhân bản hồ sơ.
- Tách `record_status`, `readiness_status`, `contactability_status` và operational phase.
- Ngành nghề là đa ngành; IT không phải mặc định.
- PII và tệp phải có trạng thái hiển thị/quét; các thao tác nhạy cảm ghi audit trong contract/fixture.
- Không dùng icon để thay cho nhãn hành động nghiệp vụ.

---

### Task 1: Candidate contract, phase rule và fixtures

**Files:**
- Modify: `packages/contracts/openapi/cms.yaml`
- Create: `apps/web/src/features/candidates/domain/derive-operational-phase.ts`
- Create: `apps/web/src/features/candidates/services/candidate-queries.ts`
- Create: `apps/web/src/mocks/fixtures/candidates.ts`
- Create: `apps/web/src/mocks/handlers/candidates.ts`
- Modify: `apps/web/src/mocks/browser.ts`
- Test: `apps/web/src/features/candidates/domain/derive-operational-phase.test.ts`

**Interfaces:**
- `GET /candidates?query&view&industry&readiness&contactability` returns `{ items, nextCursor }`.
- `GET /candidates/{id}` returns CandidateDetail.
- `deriveOperationalPhase(input)` returns `POTENTIAL | APPLYING | PASSED | SUPPLYING | SUPPLIED`.

- [x] **Step 1: Write failing phase and fixture tests**

```ts
it.each([
  [{ hasActiveJourney: true, hasCompletedJourney: false }, 'SUPPLYING'],
  [{ hasActiveJourney: false, hasCompletedJourney: true }, 'SUPPLIED'],
  [{ hasPassedApplication: true }, 'PASSED'],
  [{ hasActiveApplication: true }, 'APPLYING'],
  [{}, 'POTENTIAL']
])('derives %s from related records', (input, expected) => {
  expect(deriveOperationalPhase(input)).toBe(expected);
});
```

- [x] **Step 2: Run the focused test and confirm it fails because the feature is missing**

Run: `pnpm --filter @cms/web test -- src/features/candidates/domain/derive-operational-phase.test.ts`

- [x] **Step 3: Add schemas, pure phase rule, fixtures and MSW handlers**

Fixture coverage must include potential multi-industry, active application, passed/supplying, missing phone, do-not-contact, archived and masked PII states. Handler filters must apply the selected view and query without exposing records outside the fixture scope.

- [x] **Step 4: Generate types and run focused tests**

Run: `pnpm generate:contracts && pnpm --filter @cms/web test -- src/features/candidates`

### Task 2: Candidate list, saved views and drawer

**Files:**
- Create: `apps/web/src/features/candidates/components/candidate-list-page.tsx`
- Create: `apps/web/src/features/candidates/components/candidate-table.tsx`
- Create: `apps/web/src/features/candidates/components/candidate-drawer.tsx`
- Create: `apps/web/src/app/(cms)/candidates/page.tsx`
- Test: `apps/web/src/features/candidates/components/candidate-list-page.test.tsx`
- Test: `tests/e2e/candidates.spec.ts`

**Interfaces:**
- Views: `potential`, `applying`, `passed`, `supplying`, `supplied`, `all`, `missing-contact`, `duplicates`.
- Table columns: code, candidate, industry/occupation, Japanese level, operational phase, readiness, contactability, next action, owner, updated.
- Row click opens `DetailDrawer`; drawer contains summary and explicit text actions: `Gửi email`, `Thêm vào đơn`, `Tạo việc`, `Mở hồ sơ đầy đủ`.

- [x] **Step 1: Write failing list test**

```tsx
it('renders potential candidates and opens the selected candidate drawer', async () => {
  render(<CandidateListPage initialView="potential" />);
  expect(await screen.findByText('Ứng viên tiềm năng')).toBeInTheDocument();
  expect(await screen.findByRole('row', { name: /UV-0009/ })).toBeInTheDocument();
  await userEvent.click(screen.getByRole('row', { name: /UV-0009/ }));
  expect(await screen.findByRole('dialog', { name: 'Hồ sơ ứng viên' })).toBeInTheDocument();
});
```

- [x] **Step 2: Run the focused test and confirm it fails because `/candidates` is not implemented**

- [x] **Step 3: Implement list/view/filter/table/drawer using existing list and drawer primitives**

Use URL state through `useListParams`, keep the table horizontally scrollable, preserve mobile navigation behavior and show an explicit empty/error/loading state.

- [x] **Step 4: Add E2E coverage for view switching, row drawer and full profile navigation**

Run: `pnpm e2e -- tests/e2e/candidates.spec.ts`

### Task 3: Candidate full profile

**Files:**
- Create: `apps/web/src/features/candidates/components/candidate-detail-page.tsx`
- Create: `apps/web/src/app/(cms)/candidates/[candidateId]/page.tsx`
- Test: `apps/web/src/features/candidates/components/candidate-detail-page.test.tsx`

**Interfaces:**
- Tabs: Tổng quan, Ứng tuyển, Lộ trình cung ứng, Email, Tệp & ghi chú, Lịch sử.
- The page is an internal profile surface; no candidate-facing login or response form is added.

- [x] **Step 1: Write failing detail test for candidate identity and operational phase**
- [x] **Step 2: Run the focused test and confirm it fails**
- [x] **Step 3: Implement detail page and tab content from CandidateDetail**
- [x] **Step 4: Verify direct route and drawer `Mở hồ sơ đầy đủ` navigation**

### Task 4: Release verification

**Files:**
- Modify: `docs/backlogs/sprint-02/04-ung-vien.md` (mark implemented evidence)
- Modify: `docs/backlogs/00-ui-ux-roadmap.md` (remove `/candidates` route gap)

- [x] **Step 1: Run lint and typecheck**
- [x] **Step 2: Run full unit tests and build**
- [x] **Step 3: Run Candidate E2E and local route/health checks**
- [x] **Step 4: Render the route in the local browser and check console errors**

---

## Phase B: Candidate form workflows with one modal contract

**Goal:** Chuyển Candidate từ read-only sang các thao tác nhập, import, rà soát và chỉnh sửa trong một modal chuẩn có animation.

**Modal contract:** `apps/web/src/components/ui/modal.tsx` owns backdrop, Escape, focus, scroll lock, close button and enter/exit motion. Feature forms only own fields, validation and mutation state.

- [x] **Task B1: Modal primitive and regression test**
- [x] **Task B2: Create candidate form and `POST /candidates` mock contract**
- [x] **Task B3: Import preview form and import result state**
- [x] **Task B4: Duplicate review and candidate edit modal**
- [x] **Task B5: Candidate E2E and full verification gate**

---

## Phase C: Chuẩn hóa modal cho các form nghiệp vụ còn lại

**Goal:** dùng cùng hành vi backdrop, Escape, focus, scroll-lock và exit animation cho các mutation form đã có ở các module khác.

- [x] `AddCandidatesDialog` chuyển sang `Modal` chung.
- [x] `ApplicationDecisionDialog` và `StartJourneyDialog` chuyển sang `Modal` chung.
- [x] `WaiveMilestoneDialog`, `LinkConversationDialog` và `ExportReportDialog` chuyển sang `Modal` chung.
- [x] Giữ nguyên selector nghiệp vụ, validation, mutation và conflict behavior; chạy lại unit/E2E.
