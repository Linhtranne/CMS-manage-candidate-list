import type { components } from '@cms/contracts';
import { applicationFixtures } from './applications';
import { journeyDetails, toJourneySummary } from './journeys';

export type Candidate = components['schemas']['Candidate'];
export type CandidateDetail = components['schemas']['CandidateDetail'];
export type CandidateOccupationProfile = components['schemas']['CandidateOccupationProfile'];
export type CandidateFile = components['schemas']['CandidateFile'];

const recruiter = { id: 'u-recruiter', name: 'Nguyễn Minh Anh' };
const manager = { id: 'u-manager', name: 'Lê Thu Hà' };
const coordinator = { id: 'u-coordinator', name: 'Trần Quốc Huy' };

function candidate(input: Omit<Candidate, 'version'> & Partial<Pick<Candidate, 'version'>>): Candidate {
  return { ...input, version: input.version ?? 1 };
}

export const candidateFixtures: Candidate[] = [
  candidate({ id: 'candidate-09', code: 'UV-0009', name: 'Phạm Thu Hà', industryLabels: ['Điều dưỡng', 'Dịch vụ lưu trú'], occupation: 'Chăm sóc người cao tuổi', japaneseLevel: 'N4', recordStatus: 'ACTIVE', readinessStatus: 'READY_FOR_REVIEW', contactabilityStatus: 'CONTACTABLE', operationalPhase: 'POTENTIAL', owner: recruiter, lastActivityAt: '2026-08-15T03:00:00.000Z', nextAction: 'Sàng lọc hồ sơ', applicationCount: 0, hasActiveJourney: false, emailMasked: 'p***@example.com', phoneMasked: '09******12', source: 'Giới thiệu nội bộ', isPossibleDuplicate: false, skills: ['Chăm sóc cơ bản', 'Làm việc theo ca'], yearsExperience: 3, desiredLocation: 'Tokyo', missingDocumentCount: 0 }),
  candidate({ id: 'candidate-01', code: 'UV-0001', name: 'Nguyễn Minh An', industryLabels: ['Công nghệ thông tin'], occupation: 'Phát triển phần mềm', japaneseLevel: 'N3', recordStatus: 'ACTIVE', readinessStatus: 'READY_FOR_INTERVIEW', contactabilityStatus: 'CONTACTABLE', operationalPhase: 'APPLYING', owner: recruiter, lastActivityAt: '2026-08-12T03:00:00.000Z', nextAction: 'Theo dõi lịch phỏng vấn', applicationCount: 1, hasActiveJourney: false, emailMasked: 'n***@example.com', phoneMasked: '09******01', source: 'Nguồn chủ động', isPossibleDuplicate: false, skills: ['TypeScript', 'React', 'SQL'], yearsExperience: 4, desiredLocation: 'Tokyo', missingDocumentCount: 0 }),
  candidate({ id: 'candidate-07', code: 'UV-0007', name: 'Lê Hoàng Yến', industryLabels: ['Công nghệ thông tin', 'Kinh doanh'], occupation: 'BrSE', japaneseLevel: 'N2', recordStatus: 'ACTIVE', readinessStatus: 'READY_FOR_INTERVIEW', contactabilityStatus: 'CONTACTABLE', operationalPhase: 'PASSED', owner: coordinator, lastActivityAt: '2026-08-09T09:00:00.000Z', nextAction: 'Theo dõi lộ trình cung ứng', applicationCount: 1, hasActiveJourney: true, emailMasked: 'l***@example.com', phoneMasked: '09******07', source: 'Ứng tuyển trực tiếp', isPossibleDuplicate: false, skills: ['Bridge communication', 'Java', 'N2'], yearsExperience: 6, desiredLocation: 'Osaka', missingDocumentCount: 0 }),
  candidate({ id: 'candidate-05', code: 'UV-0005', name: 'Võ Thanh Tùng', industryLabels: ['Công nghệ thông tin'], occupation: 'Kỹ sư phần mềm', japaneseLevel: 'N3', recordStatus: 'ACTIVE', readinessStatus: 'READY_FOR_INTERVIEW', contactabilityStatus: 'CONTACTABLE', operationalPhase: 'SUPPLYING', owner: manager, lastActivityAt: '2026-08-08T09:00:00.000Z', nextAction: 'Bổ sung hồ sơ COE', applicationCount: 1, hasActiveJourney: true, emailMasked: 'v***@example.com', phoneMasked: '09******05', source: 'Giới thiệu khách hàng', isPossibleDuplicate: false, skills: ['Java', 'Spring', 'AWS'], yearsExperience: 5, desiredLocation: 'Tokyo', missingDocumentCount: 1 }),
  candidate({ id: 'candidate-02', code: 'UV-0002', name: 'Trần Quốc Bảo', industryLabels: ['Cơ khí chế tạo'], occupation: 'Kỹ thuật viên cơ khí', japaneseLevel: 'N4', recordStatus: 'ACTIVE', readinessStatus: 'NOT_READY', contactabilityStatus: 'UNKNOWN', operationalPhase: 'POTENTIAL', owner: recruiter, lastActivityAt: '2026-08-11T09:00:00.000Z', nextAction: 'Bổ sung số điện thoại', applicationCount: 0, hasActiveJourney: false, emailMasked: null, phoneMasked: null, source: 'Import bảng tính', isPossibleDuplicate: true, skills: ['Đọc bản vẽ', 'Vận hành máy'], yearsExperience: 2, desiredLocation: 'Aichi', missingDocumentCount: 2 }),
  candidate({ id: 'candidate-10', code: 'UV-0010', name: 'Nguyễn Thị Hạnh', industryLabels: ['Sản xuất'], occupation: 'Vận hành máy', japaneseLevel: 'N4', recordStatus: 'ARCHIVED', readinessStatus: 'NOT_READY', contactabilityStatus: 'DO_NOT_CONTACT', operationalPhase: 'POTENTIAL', owner: manager, lastActivityAt: '2026-07-30T09:00:00.000Z', nextAction: 'Đã lưu trữ', applicationCount: 0, hasActiveJourney: false, emailMasked: 'h***@example.com', phoneMasked: '09******10', source: 'Nguồn cũ', isPossibleDuplicate: false, skills: ['Vận hành dây chuyền'], yearsExperience: 7, desiredLocation: 'Nagoya', missingDocumentCount: 3 }),
  candidate({ id: 'candidate-11', code: 'UV-0011', name: 'Đỗ Mai Lan', industryLabels: ['Công nghệ thông tin'], occupation: 'QA Engineer', japaneseLevel: 'N2', recordStatus: 'ACTIVE', readinessStatus: 'READY_FOR_INTERVIEW', contactabilityStatus: 'CONTACTABLE', operationalPhase: 'SUPPLIED', owner: coordinator, lastActivityAt: '2026-07-18T09:00:00.000Z', nextAction: 'Theo dõi sau tiếp nhận', applicationCount: 1, hasActiveJourney: false, emailMasked: 'd***@example.com', phoneMasked: '09******11', source: 'Đối tác tuyển dụng', isPossibleDuplicate: false, skills: ['Cypress', 'Test automation'], yearsExperience: 4, desiredLocation: 'Fukuoka', missingDocumentCount: 0 })
];

const occupationProfiles: Record<string, CandidateOccupationProfile[]> = {
  'candidate-09': [
    { industryLabel: 'Điều dưỡng', occupation: 'Chăm sóc người cao tuổi', yearsExperience: 3, skills: ['Chăm sóc cơ bản', 'Làm việc theo ca'], status: 'PRIMARY' },
    { industryLabel: 'Dịch vụ lưu trú', occupation: 'Nhân viên buồng phòng', yearsExperience: 1, skills: ['Tiếng Nhật giao tiếp'], status: 'SECONDARY' }
  ],
  'candidate-01': [{ industryLabel: 'Công nghệ thông tin', occupation: 'Phát triển phần mềm', yearsExperience: 4, skills: ['TypeScript', 'React', 'SQL'], status: 'PRIMARY' }],
  'candidate-05': [{ industryLabel: 'Công nghệ thông tin', occupation: 'Kỹ sư phần mềm', yearsExperience: 5, skills: ['Java', 'Spring', 'AWS'], status: 'PRIMARY' }],
  'candidate-07': [{ industryLabel: 'Công nghệ thông tin', occupation: 'BrSE', yearsExperience: 6, skills: ['Bridge communication', 'Java', 'N2'], status: 'PRIMARY' }]
};

const files: Record<string, CandidateFile[]> = {
  'candidate-09': [{ id: 'candidate-file-09-cv', fileName: 'CV-Pham-Thu-Ha.pdf', category: 'CV', scanStatus: 'SAFE', uploadedAt: '2026-08-14T04:00:00.000Z', downloadUrl: '/mock/files/cv-pham-thu-ha.pdf' }],
  'candidate-05': [{ id: 'candidate-file-05-passport', fileName: 'passport-scan.pdf', category: 'IDENTITY', scanStatus: 'SAFE', uploadedAt: '2026-08-08T09:00:00.000Z', downloadUrl: '/mock/files/passport-scan.pdf' }]
};

export const candidateDetails: CandidateDetail[] = candidateFixtures.map((item) => {
  const applications = applicationFixtures.filter((application) => application.candidate.id === item.id);
  const journeys = journeyDetails.filter((journey) => journey.candidateId === item.id).map(toJourneySummary);
  const actor = item.owner.id === manager.id ? manager : item.owner.id === coordinator.id ? coordinator : recruiter;
  return {
    ...item,
    email: item.id === 'candidate-09' ? 'pham.thu.ha@example.com' : item.emailMasked ? item.emailMasked.replace('***', 'candidate') : null,
    phone: item.phoneMasked ? '09 1234 56 12' : null,
    address: item.id === 'candidate-09' ? 'Hải Phòng' : null,
    occupationProfiles: occupationProfiles[item.id] ?? [{ industryLabel: item.industryLabels[0], occupation: item.occupation, yearsExperience: 2, skills: [], status: 'PRIMARY' }],
    applications,
    journeys,
    emailCount: item.id === 'candidate-09' ? 2 : applications.length,
    files: files[item.id] ?? [],
    notes: item.id === 'candidate-09' ? ['Đã xác minh kinh nghiệm chăm sóc với người giới thiệu.'] : [],
    history: [{ id: `${item.id}-created`, type: 'CREATED', occurredAt: '2026-08-01T08:00:00.000Z', actor, summary: 'Tạo hồ sơ ứng viên trong CMS.' }]
  };
});

export function findCandidate(id: string) {
  return candidateFixtures.find((item) => item.id === id);
}

export function findCandidateDetail(id: string) {
  return candidateDetails.find((item) => item.id === id);
}
