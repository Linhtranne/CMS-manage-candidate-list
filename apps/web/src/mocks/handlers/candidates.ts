import { http, HttpResponse } from 'msw';
import type { components } from '@cms/contracts';
import { candidateDetails, candidateFixtures, findCandidate, findCandidateDetail } from '../fixtures/candidates';

type Candidate = components['schemas']['Candidate'];

const problem = (message: string, status: number) => HttpResponse.json({ code: status === 404 ? 'NOT_FOUND' : 'FORBIDDEN', message }, { status });
const validation = (message: string) => HttpResponse.json({ code: 'VALIDATION_ERROR', message }, { status: 422 });
const now = () => new Date().toISOString();

export const candidatesHandlers = [
  http.get('*/api/v1/candidates', ({ request }) => {
    const url = new URL(request.url);
    const query = (url.searchParams.get('query') ?? '').trim().toLowerCase();
    const view = url.searchParams.get('view') ?? 'all';
    const industry = (url.searchParams.get('industry') ?? '').trim().toLowerCase();
    const readiness = url.searchParams.get('readiness');
    const contactability = url.searchParams.get('contactability');
    const items = candidateFixtures.filter((candidate) => {
      const haystack = `${candidate.code} ${candidate.name} ${candidate.occupation} ${candidate.industryLabels.join(' ')} ${candidate.source}`.toLowerCase();
      const matchesView = view === 'all'
        || (view === 'missing-contact' && (candidate.contactabilityStatus === 'UNKNOWN' || !candidate.emailMasked || !candidate.phoneMasked))
        || (view === 'duplicates' && candidate.isPossibleDuplicate)
        || candidate.operationalPhase.toLowerCase() === view;
      return matchesView
        && (!query || haystack.includes(query))
        && (!industry || candidate.industryLabels.some((label) => label.toLowerCase() === industry))
        && (!readiness || candidate.readinessStatus === readiness)
        && (!contactability || candidate.contactabilityStatus === contactability);
    });
    return HttpResponse.json({ items, nextCursor: null });
  }),
  http.get('*/api/v1/candidates/:id', ({ params }) => {
    const id = String(params.id);
    if (!findCandidate(id)) return problem('Không tìm thấy hồ sơ ứng viên.', 404);
    const detail = findCandidateDetail(id);
    return detail ? HttpResponse.json(detail) : problem('Không thể tải hồ sơ ứng viên.', 404);
  }),
  http.post('*/api/v1/candidates', async ({ request }) => {
    const body = await request.json() as { name?: string; industryLabels?: string[]; occupation?: string; japaneseLevel?: string; email?: string | null; phone?: string | null; address?: string | null; source?: string; readinessStatus?: Candidate['readinessStatus']; contactabilityStatus?: Candidate['contactabilityStatus'] };
    if (!body.name?.trim()) return validation('Vui lòng nhập họ tên.');
    if (!body.industryLabels?.length || !body.occupation?.trim()) return validation('Vui lòng nhập đủ ngành nghề và nghề nghiệp chính.');
    const nextNumber = Math.max(...candidateFixtures.map((item) => Number(item.code.replace('UV-', '')))) + 1;
    const code = `UV-${String(nextNumber).padStart(4, '0')}`;
    const id = `candidate-${String(nextNumber).padStart(2, '0')}`;
    const timestamp = now();
    const created: Candidate = {
      id,
      code,
      name: body.name.trim(),
      industryLabels: body.industryLabels,
      occupation: body.occupation.trim(),
      japaneseLevel: body.japaneseLevel?.trim() || 'Chưa xác định',
      recordStatus: 'ACTIVE',
      readinessStatus: body.readinessStatus ?? 'READY_FOR_REVIEW',
      contactabilityStatus: body.contactabilityStatus ?? (body.email || body.phone ? 'CONTACTABLE' : 'UNKNOWN'),
      operationalPhase: 'POTENTIAL',
      owner: { id: 'u-recruiter', name: 'Nguyễn Minh Anh' },
      lastActivityAt: timestamp,
      nextAction: 'Rà soát hồ sơ',
      applicationCount: 0,
      hasActiveJourney: false,
      isPossibleDuplicate: false,
      version: 1,
      emailMasked: body.email ? `${body.email.slice(0, 1)}***@${body.email.split('@')[1] ?? 'example.com'}` : null,
      phoneMasked: body.phone ? `${body.phone.slice(0, 2)}******${body.phone.slice(-2)}` : null,
      source: body.source?.trim() || 'Nhập thủ công'
    };
    candidateFixtures.push(created);
    candidateDetails.push({
      ...created,
      email: body.email ?? null,
      phone: body.phone ?? null,
      address: body.address ?? null,
      occupationProfiles: created.industryLabels.map((industryLabel, index) => ({ industryLabel, occupation: created.occupation, yearsExperience: 0, skills: [], status: index === 0 ? 'PRIMARY' : 'SECONDARY' })),
      applications: [],
      journeys: [],
      emailCount: 0,
      files: [],
      notes: [],
      history: [{ id: `${id}-created`, type: 'CREATED', occurredAt: timestamp, actor: created.owner, summary: 'Tạo hồ sơ ứng viên trong CMS.' }]
    });
    return HttpResponse.json(created, { status: 201 });
  }),
  http.patch('*/api/v1/candidates/:id', async ({ params, request }) => {
    const id = String(params.id);
    const current = findCandidate(id);
    const detail = findCandidateDetail(id);
    if (!current || !detail) return problem('Không tìm thấy hồ sơ ứng viên.', 404);
    const body = await request.json() as { name?: string; industryLabels?: string[]; occupation?: string; japaneseLevel?: string; email?: string | null; phone?: string | null; address?: string | null; source?: string; version?: number };
    if (body.version !== undefined && body.version !== current.version) return HttpResponse.json({ code: 'CONFLICT', message: 'Hồ sơ đã được cập nhật bởi người khác.' }, { status: 409 });
    if (!body.name?.trim() || !body.industryLabels?.length || !body.occupation?.trim()) return validation('Vui lòng nhập đủ thông tin hồ sơ.');
    Object.assign(current, { name: body.name.trim(), industryLabels: body.industryLabels, occupation: body.occupation.trim(), japaneseLevel: body.japaneseLevel?.trim() || current.japaneseLevel, source: body.source?.trim() || current.source, emailMasked: body.email ? `${body.email.slice(0, 1)}***@${body.email.split('@')[1] ?? 'example.com'}` : null, phoneMasked: body.phone ? `${body.phone.slice(0, 2)}******${body.phone.slice(-2)}` : null, lastActivityAt: now(), version: current.version + 1 });
    Object.assign(detail, current, { email: body.email ?? null, phone: body.phone ?? null, address: body.address ?? null });
    return HttpResponse.json(detail);
  }),
  http.post('*/api/v1/candidates/imports', async ({ request }) => {
    const body = await request.json() as { fileName?: string; rows?: unknown[] };
    const totalRows = body.rows?.length ?? 0;
    if (!body.fileName || totalRows === 0) return validation('Tệp import chưa có dữ liệu.');
    return HttpResponse.json({ importId: 'candidate-import-01', fileName: body.fileName, totalRows, validRows: totalRows, invalidRows: 0, duplicateRows: 0, createdCandidateIds: [] }, { status: 201 });
  }),
  http.post('*/api/v1/candidates/:id/duplicate-review', async ({ params, request }) => {
    const id = String(params.id);
    const current = findCandidate(id);
    if (!current) return problem('Không tìm thấy hồ sơ ứng viên.', 404);
    const body = await request.json() as { version?: number };
    if (body.version !== undefined && body.version !== current.version) return HttpResponse.json({ code: 'CONFLICT', message: 'Hồ sơ đã được cập nhật bởi người khác.' }, { status: 409 });
    current.isPossibleDuplicate = false;
    current.version += 1;
    current.lastActivityAt = now();
    return HttpResponse.json(current);
  })
];
