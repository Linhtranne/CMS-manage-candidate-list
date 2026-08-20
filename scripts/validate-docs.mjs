import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
function collectMarkdown(directory) {
  return readdirSync(directory, { withFileTypes: true })
    .flatMap((entry) => {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) return collectMarkdown(path);
      return entry.isFile() && entry.name.endsWith(".md") ? [path] : [];
    })
    .sort();
}

const markdownFiles = [
  join(projectRoot, "README.md"),
  join(projectRoot, "PRODUCT.md"),
  ...collectMarkdown(join(projectRoot, "docs")),
];

const requiredDocs = [
  "docs/00-tong-quan.md",
  "docs/01-yeu-cau-nghiep-vu.md",
  "docs/02-vong-doi-ung-vien.md",
  "docs/03-kien-truc-va-stack.md",
  "docs/04-mo-hinh-du-lieu.md",
  "docs/05-email-hub.md",
  "docs/06-phan-quyen-bao-mat.md",
  "docs/07-thiet-ke-cms.md",
  "docs/08-van-hanh-ubuntu.md",
  "docs/09-kiem-thu-nghiem-thu.md",
  "docs/10-lo-trinh-mvp.md",
  "docs/11-tu-dien-du-lieu.md",
  "docs/12-ma-tran-email-thong-bao.md",
  "docs/13-hop-dong-chuc-nang.md",
  "docs/14-quyet-dinh-kien-truc.md",
  "docs/15-truy-vet-yeu-cau.md",
  "docs/backend/README.md",
  ...Array.from({ length: 15 }, (_, index) =>
    `docs/backend/${String(index).padStart(2, "0")}-${[
      "governance-and-source-of-truth",
      "contract-alignment",
      "architecture-and-runtime",
      "api-iam-and-permissions",
      "data-prisma-and-migrations",
      "recruitment-domain",
      "supply-journey-and-documents",
      "email-hub-workers-and-storage",
      "tasks-reports-admin-audit",
      "security-privacy-threat-model",
      "observability-operations-dr",
      "testing-and-release-gates",
      "decision-register",
      "traceability",
      "definition-of-done",
    ][index]}.md`,
  ),
  "docs/backend/plans/README.md",
  "docs/backend/plans/00-phase-0-foundation.md",
  "docs/backend/plans/01-phase-1a-core-recruitment.md",
  "docs/backend/plans/02-phase-1b-email-hub.md",
  "docs/backend/plans/03-phase-2-supply-journey.md",
  "docs/backend/plans/04-phase-3-4-reporting-go-live.md",
  "docs/superpowers/specs/2026-08-20-backend-production-handoff-design.md",
];

for (const path of requiredDocs) {
  if (!existsSync(join(projectRoot, path))) {
    throw new Error(`Missing required document: ${path}`);
  }
}

const missingLinks = [];
for (const file of markdownFiles) {
  const content = readFileSync(file, "utf8");
  if (content.includes("\uFFFD")) {
    throw new Error(`Invalid UTF-8 replacement character in ${relative(projectRoot, file)}`);
  }
  if (content !== content.normalize("NFC")) {
    throw new Error(`Non-NFC Markdown content in ${relative(projectRoot, file)}`);
  }
  for (const match of content.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) {
    const target = match[1].split("#")[0];
    if (!target || /^(?:https?:|mailto:)/i.test(target)) continue;
    const resolvedTarget = resolve(dirname(file), decodeURIComponent(target));
    if (!existsSync(resolvedTarget)) {
      missingLinks.push(`${relative(projectRoot, file)} -> ${target}`);
    }
  }
}

if (missingLinks.length) {
  throw new Error(`Broken Markdown links:\n${missingLinks.join("\n")}`);
}

const allDocs = markdownFiles.map((file) => readFileSync(file, "utf8")).join("\n");
for (const forbidden of [
  "Japan Journey",
  "status = WAITING_INTERVIEW",
  "status = INTERVIEWED",
  "active_cycle",
  "recruitment@company.vn",
  "business@company.vn",
  "japan-ops@company.vn",
  "Japan IT Candidate CMS",
  "cung ứng nhân sự IT sang Nhật",
  "lộ trình cung ứng IT sang Nhật",
  "16-gap-audit-portal-rktsunagu.md",
  "baseline 1.1",
]) {
  if (allDocs.includes(forbidden)) throw new Error(`Legacy design term found: ${forbidden}`);
}

const invariants = [
  ["docs/00-tong-quan.md", "đa ngành"],
  ["docs/02-vong-doi-ung-vien.md", "SupplyJourney"],
  ["docs/02-vong-doi-ung-vien.md", "xuất hiện đồng thời"],
  ["docs/05-email-hub.md", "một hộp thư chung chính danh"],
  ["docs/05-email-hub.md", "outbox` trong PostgreSQL là nguồn sự thật"],
  ["docs/07-thiet-ke-cms.md", "Lộ trình cung ứng"],
  ["docs/10-lo-trinh-mvp.md", "Phase 1B — Email chung cốt lõi"],
  ["docs/11-tu-dien-du-lieu.md", "CandidateOccupationProfile"],
  ["docs/11-tu-dien-du-lieu.md", "SUPPLY_COMPLETED"],
  ["docs/12-ma-tran-email-thong-bao.md", "Thay đổi kế hoạch xuất cảnh"],
  ["docs/13-hop-dong-chuc-nang.md", "VERSION_CONFLICT"],
  ["docs/13-hop-dong-chuc-nang.md", "requirement_snapshot"],
  ["docs/14-quyet-dinh-kien-truc.md", "Lộ trình cung ứng, không phải quản lý chuyến bay"],
  ["docs/14-quyet-dinh-kien-truc.md", "Đa ngành bằng danh mục có version"],
  ["docs/15-truy-vet-yeu-cau.md", "RQ-17"],
  ["docs/backend/README.md", "Backend Production Handoff"],
  ["docs/backend/01-contract-alignment.md", "OIDC"],
  ["docs/backend/04-data-prisma-and-migrations.md", "applications_one_active_attempt"],
  ["docs/backend/07-email-hub-workers-and-storage.md", "MAIL_PROVIDER=DISABLED"],
  ["docs/backend/12-decision-register.md", "DEC-007"],
  ["docs/backend/13-traceability.md", "AC-32"],
  ["docs/backend/14-definition-of-done.md", "Production release DoD"],
];

for (const [relativeFile, token] of invariants) {
  const content = readFileSync(join(projectRoot, relativeFile), "utf8");
  if (!content.includes(token)) throw new Error(`Invariant missing in ${relativeFile}: ${token}`);
}

const backendDocs = markdownFiles.filter((file) =>
  relative(projectRoot, file).replaceAll("\\", "/").startsWith("docs/backend/"),
);
const backendSpecs = backendDocs.filter(
  (file) => dirname(file) === join(projectRoot, "docs", "backend"),
);
for (const file of backendSpecs) {
  const frontmatter = readFileSync(file, "utf8").split("---", 3)[1] ?? "";
  for (const key of ["status:", "version:", "updated_at:", "owner:", "risk:"]) {
    if (!frontmatter.includes(key)) {
      throw new Error(`Missing frontmatter ${key} in ${relative(projectRoot, file)}`);
    }
  }
}

const implementationPlans = backendDocs.filter(
  (file) =>
    dirname(file) === join(projectRoot, "docs", "backend", "plans") &&
    !file.endsWith(`${join("", "README.md")}`),
);
let implementationTaskCount = 0;
let implementationCheckCount = 0;
for (const file of implementationPlans) {
  const content = readFileSync(file, "utf8");
  for (const marker of [
    "REQUIRED SUB-SKILL: Use superpowers:executing-plans",
    "**Goal:**",
    "**Architecture:**",
    "**Tech Stack:**",
    "**Spec:**",
    "**Global Constraints:**",
  ]) {
    if (!content.includes(marker)) {
      throw new Error(`Missing plan marker in ${relative(projectRoot, file)}: ${marker}`);
    }
  }
  const taskSections = content.split(/^### Task \d+:/m).slice(1);
  if (!taskSections.length) {
    throw new Error(`Implementation plan has no tasks: ${relative(projectRoot, file)}`);
  }
  for (const task of taskSections) {
    for (const marker of ["**Files:**", "**Interfaces:**", "- [ ]", "Commit:"]) {
      if (!task.includes(marker)) {
        throw new Error(`Task missing ${marker} in ${relative(projectRoot, file)}`);
      }
    }
  }
  implementationTaskCount += taskSections.length;
  implementationCheckCount += (content.match(/^- \[ \]/gm) ?? []).length;
}
const placeholderPatterns = [
  /\bTODO\b/i,
  /\bTBD\b/i,
  /\bFIXME\b/i,
  /implement later/i,
  /fill in/i,
];
for (const file of backendDocs) {
  const content = readFileSync(file, "utf8");
  for (const pattern of placeholderPatterns) {
    if (pattern.test(content)) {
      throw new Error(`Forbidden placeholder in ${relative(projectRoot, file)}: ${pattern}`);
    }
  }
}

console.log(`MARKDOWN_FILES=${markdownFiles.length}`);
console.log("BROKEN_LINKS=0");
console.log("LEGACY_TERMS=0");
console.log(`DOMAIN_INVARIANTS=${invariants.length}`);
console.log(`BACKEND_DOCS=${backendDocs.length}`);
console.log(`BACKEND_SPECS=${backendSpecs.length}`);
console.log("BACKEND_PLACEHOLDERS=0");
console.log(`IMPLEMENTATION_PLANS=${implementationPlans.length}`);
console.log(`IMPLEMENTATION_TASKS=${implementationTaskCount}`);
console.log(`IMPLEMENTATION_CHECKS=${implementationCheckCount}`);
