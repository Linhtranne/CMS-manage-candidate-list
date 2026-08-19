import { http, HttpResponse } from 'msw';
import type { components } from '@cms/contracts';
import { candidateDetails, candidateFixtures, findCandidate, findCandidateDetail } from '../fixtures/candidates';
import { candidateMatchFixtures } from '../fixtures/orders';

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
    const occupation = (url.searchParams.get('occupation') ?? '').trim().toLowerCase();
    const skill = (url.searchParams.get('skill') ?? '').trim().toLowerCase();
    const desiredLocation = (url.searchParams.get('desiredLocation') ?? '').trim().toLowerCase();
    const source = (url.searchParams.get('source') ?? '').trim().toLowerCase();
    const recordStatus = url.searchParams.get('recordStatus');
    const experience = url.searchParams.get('experience');
    const items = candidateFixtures.filter((candidate) => {
      const haystack = `${candidate.code} ${candidate.name} ${candidate.occupation} ${candidate.industryLabels.join(' ')} ${candidate.source} ${(candidate.skills ?? []).join(' ')} ${candidate.desiredLocation ?? ''}`.toLowerCase();
      const years = candidate.yearsExperience ?? 0;
      const matchesView = view === 'all'
        || (view === 'missing-contact' && (candidate.contactabilityStatus === 'UNKNOWN' || !candidate.emailMasked || !candidate.phoneMasked))
        || (view === 'duplicates' && candidate.isPossibleDuplicate)
        || (view === 'new-unassigned' && candidate.applicationCount === 0)
        || (view === 'ready-to-match' && candidate.applicationCount === 0 && candidate.readinessStatus === 'READY_FOR_INTERVIEW')
        || (view === 'paused' && candidate.contactabilityStatus === 'DO_NOT_CONTACT')
        || (view === 'archived' && candidate.recordStatus === 'ARCHIVED')
        || (view === 'missing-documents' && (candidate.missingDocumentCount ?? (candidate.readinessStatus === 'NOT_READY' ? 1 : 0)) > 0)
        || candidate.operationalPhase.toLowerCase() === view;
      return matchesView
        && (!query || haystack.includes(query))
        && (!industry || candidate.industryLabels.some((label) => label.toLowerCase() === industry))
        && (!readiness || candidate.readinessStatus === readiness)
        && (!contactability || candidate.contactabilityStatus === contactability)
        && (!occupation || candidate.occupation.toLowerCase().includes(occupation))
        && (!skill || (candidate.skills ?? []).some((item) => item.toLowerCase().includes(skill)))
        && (!desiredLocation || (candidate.desiredLocation ?? '').toLowerCase().includes(desiredLocation))
        && (!source || (candidate.source ?? '').toLowerCase() === source)
        && (!recordStatus || candidate.recordStatus === recordStatus)
        && (!experience || (experience === '0-2' ? years <= 2 : experience === '3-5' ? years >= 3 && years <= 5 : experience === '6+' ? years >= 6 : true));
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
    candidateMatchFixtures.push({ id, code, name: created.name, industryLabel: created.industryLabels[0] ?? '', occupation: created.occupation, japaneseLevel: created.japaneseLevel, readiness: created.readinessStatus === 'READY_FOR_INTERVIEW' ? 'Sẵn sàng phỏng vấn' : created.readinessStatus === 'READY_FOR_REVIEW' ? 'Chờ rà soát' : 'Chưa đủ hồ sơ', hasActiveApplicationInOrder: false, hasActiveJourney: false, skills: created.skills ?? [], yearsExperience: created.yearsExperience ?? 0, recordStatus: created.recordStatus });
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
    const body = await request.json() as { fileName?: string; rows?: Array<Record<string, unknown>> };
    const rows = body.rows ?? [];
    if (!body.fileName || rows.length === 0) return validation('Tệp import chưa có dữ liệu.');
    const createdCandidateIds: string[] = [];
    let invalidRows = 0;
    let duplicateRows = 0;
    for (const row of rows) {
      const value = (key: string) => String(row[key] ?? '').trim();
      const name = value('name');
      const industry = value('industry') || value('industryLabel');
      const occupation = value('occupation') || 'Chưa cập nhật';
      if (!name || !industry || !occupation) { invalidRows += 1; continue; }
      const duplicate = candidateFixtures.some((candidate) => candidate.name.toLowerCase() === name.toLowerCase() && candidate.occupation.toLowerCase() === occupation.toLowerCase());
      if (duplicate) { duplicateRows += 1; continue; }
      const nextNumber = Math.max(...candidateFixtures.map((item) => Number(item.code.replace('UV-', '')))) + 1;
      const id = `candidate-${String(nextNumber).padStart(2, '0')}`;
      const code = `UV-${String(nextNumber).padStart(4, '0')}`;
      const timestamp = now();
      const created: Candidate = { id, code, name, industryLabels: [industry], occupation, japaneseLevel: value('japaneseLevel') || 'Chưa xác định', recordStatus: 'ACTIVE', readinessStatus: 'READY_FOR_REVIEW', contactabilityStatus: value('email') || value('phone') ? 'CONTACTABLE' : 'UNKNOWN', operationalPhase: 'POTENTIAL', owner: { id: 'u-recruiter', name: 'Nguyễn Minh Anh' }, lastActivityAt: timestamp, nextAction: 'Rà soát hồ sơ import', applicationCount: 0, hasActiveJourney: false, isPossibleDuplicate: false, version: 1, emailMasked: value('email') ? `${value('email').slice(0, 1)}***@${value('email').split('@')[1] ?? 'example.com'}` : null, phoneMasked: value('phone') ? `${value('phone').slice(0, 2)}******${value('phone').slice(-2)}` : null, source: value('source') || 'Import bảng tính', skills: value('skills').split(';').map((item) => item.trim()).filter(Boolean), yearsExperience: Number(value('yearsExperience')) || 0, desiredLocation: value('desiredLocation') || null, missingDocumentCount: 0 };
      candidateFixtures.push(created);
      candidateDetails.push({ ...created, email: value('email') || null, phone: value('phone') || null, address: value('address') || null, occupationProfiles: [{ industryLabel: industry, occupation, yearsExperience: created.yearsExperience ?? 0, skills: created.skills ?? [], status: 'PRIMARY' }], applications: [], journeys: [], emailCount: 0, files: [], notes: [], history: [{ id: `${id}-created`, type: 'CREATED', occurredAt: timestamp, actor: created.owner, summary: 'Tạo hồ sơ từ import bảng tính.' }] });
      candidateMatchFixtures.push({ id, code, name, industryLabel: industry, occupation, japaneseLevel: created.japaneseLevel, readiness: 'Chờ rà soát', hasActiveApplicationInOrder: false, hasActiveJourney: false, skills: created.skills ?? [], yearsExperience: created.yearsExperience ?? 0, recordStatus: 'ACTIVE' });
      createdCandidateIds.push(id);
    }
    return HttpResponse.json({ importId: `candidate-import-${Date.now()}`, fileName: body.fileName, totalRows: rows.length, validRows: createdCandidateIds.length, invalidRows, duplicateRows, createdCandidateIds }, { status: 201 });
  }),
  http.post('*/api/v1/candidates/:id/duplicate-review', async ({ params, request }) => {
    const id = String(params.id);
    const current = findCandidate(id);
    if (!current) return problem('Không tìm thấy hồ sơ ứng viên.', 404);
    const body = await request.json() as { version?: number; action?: 'MARK_REVIEWED' | 'KEEP_SEPARATE' | 'MERGE'; targetCandidateId?: string | null; reason?: string | null };
    if (body.version !== undefined && body.version !== current.version) return HttpResponse.json({ code: 'CONFLICT', message: 'Hồ sơ đã được cập nhật bởi người khác.' }, { status: 409 });
    if (body.action === 'MERGE' && (!body.targetCandidateId || !body.reason?.trim())) return validation('Gộp hồ sơ cần chọn bản ghi đích và nhập lý do.');
    if (body.action === 'MERGE' && !findCandidate(body.targetCandidateId ?? '')) return problem('Không tìm thấy hồ sơ đích để gộp.', 404);
    current.isPossibleDuplicate = false;
    current.version += 1;
    current.lastActivityAt = now();
    return HttpResponse.json(current);
  })
];
