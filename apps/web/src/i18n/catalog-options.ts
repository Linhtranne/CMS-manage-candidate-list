import type { TranslationKey } from './types';
import type { Translate } from './types';

export const candidateIndustryOptions = [
  { value: 'Điều dưỡng', key: 'catalog.industry.nursing' },
  { value: 'Dịch vụ lưu trú', key: 'catalog.industry.hospitality' },
  { value: 'Công nghệ thông tin', key: 'catalog.industry.it' },
  { value: 'Cơ khí chế tạo', key: 'catalog.industry.mechanical' },
  { value: 'Sản xuất', key: 'catalog.industry.manufacturing' },
  { value: 'Dịch vụ', key: 'catalog.industry.services' }
] as const satisfies ReadonlyArray<{ value: string; key: TranslationKey }>;

export const candidateListIndustryOptions = [
  { value: 'all', key: 'candidates.list.allIndustries' },
  ...candidateIndustryOptions.filter(({ value }) => value !== 'Dịch vụ')
] as const satisfies ReadonlyArray<{ value: string; key: TranslationKey }>;

export const candidateJapaneseLevelOptions = [
  { value: 'N5', key: 'catalog.japanese.n5' },
  { value: 'N4', key: 'catalog.japanese.n4' },
  { value: 'N3', key: 'catalog.japanese.n3' },
  { value: 'N2', key: 'catalog.japanese.n2' },
  { value: 'N1', key: 'catalog.japanese.n1' },
  { value: 'Chưa xác định', key: 'catalog.japanese.unknown' }
] as const satisfies ReadonlyArray<{ value: string; key: TranslationKey }>;

export const candidateSourceOptions = [
  { value: 'Nhập thủ công', key: 'catalog.source.manual' },
  { value: 'Giới thiệu nội bộ', key: 'catalog.source.referral' },
  { value: 'Import bảng tính', key: 'catalog.source.import' },
  { value: 'Đối tác tuyển dụng', key: 'catalog.source.partner' },
  { value: 'Ứng tuyển trực tiếp', key: 'catalog.source.direct' }
] as const satisfies ReadonlyArray<{ value: string; key: TranslationKey }>;

const catalogLabelKeys: Record<string, TranslationKey> = {
  'Công nghệ thông tin': 'catalog.industry.it',
  'Điều dưỡng': 'catalog.industry.nursing',
  'Cơ khí': 'catalog.industry.mechanical',
  'Cơ khí chế tạo': 'catalog.industry.mechanical',
  'Sản xuất': 'catalog.industry.manufacturing',
  'Dịch vụ lưu trú': 'catalog.industry.hospitality',
  'Dịch vụ': 'catalog.industry.services',
  'Chăm sóc sức khỏe': 'catalog.industry.nursing',
  'Kinh doanh': 'reports.filters.business',
  'N5': 'catalog.japanese.n5',
  'N4': 'catalog.japanese.n4',
  'N3': 'catalog.japanese.n3',
  'N2': 'catalog.japanese.n2',
  'N1': 'catalog.japanese.n1',
  'Chưa xác định': 'catalog.japanese.unknown',
  'Nhập thủ công': 'catalog.source.manual',
  'Giới thiệu nội bộ': 'catalog.source.referral',
  'Giới thiệu khách hàng': 'catalog.source.referral',
  'Nguồn giới thiệu': 'catalog.source.referral',
  'Import bảng tính': 'catalog.source.import',
  'Đối tác tuyển dụng': 'catalog.source.partner',
  'Ứng tuyển trực tiếp': 'catalog.source.direct',
  'Nguồn chủ động': 'catalog.source.direct',
  'Nguồn cũ': 'catalog.source.referral',
  'Đối tác cũ': 'catalog.source.partner',
  MANUAL_MATCH: 'catalog.source.manual',
  REFERRAL: 'catalog.source.referral',
  IMPORT: 'catalog.source.import',
  'Doanh nghiệp tiếp nhận': 'clients.form.receiver',
  'Nghiệp đoàn / tổ chức giám sát': 'clients.form.supervisor',
  'Đơn vị đào tạo': 'clients.form.training'
};

const organizationTypeLabelKeys: Record<string, TranslationKey> = {
  'Doanh nghiệp tiếp nhận': 'clients.form.receiver',
  'Nghiệp đoàn / tổ chức giám sát': 'clients.form.supervisor',
  'Đối tác tuyển dụng': 'clients.form.recruiter',
  'Đơn vị đào tạo': 'clients.form.training',
  receiver: 'clients.form.receiver',
  supervisor: 'clients.form.supervisor',
  recruiter: 'clients.form.recruiter',
  training: 'clients.form.training'
};

const organizationTypeCanonicalValues: Record<string, string> = {
  receiver: 'Doanh nghiệp tiếp nhận',
  supervisor: 'Nghiệp đoàn / tổ chức giám sát',
  recruiter: 'Đối tác tuyển dụng',
  training: 'Đơn vị đào tạo'
};

const occupationLabelKeys: Record<string, TranslationKey> = {
  'Phát triển phần mềm': 'catalog.occupation.softwareDevelopment',
  'Kỹ sư phần mềm': 'catalog.occupation.softwareEngineer',
  'Kỹ thuật viên cơ khí': 'catalog.occupation.mechanicalTechnician',
  'Gia công cơ khí': 'catalog.occupation.machining',
  'Điều dưỡng': 'catalog.occupation.nursing',
  'Chăm sóc người cao tuổi': 'catalog.occupation.elderlyCare',
  'Vận hành máy': 'catalog.occupation.machineOperator',
  'QA Engineer': 'catalog.occupation.qaEngineer',
  'Frontend Developer': 'catalog.occupation.frontendDeveloper',
  BrSE: 'catalog.occupation.brse'
};

export function catalogLabel(t: Translate, value: string | null | undefined): string {
  if (!value) return '';
  const key = catalogLabelKeys[value];
  return key ? t(key) : value;
}

export function catalogValue(t: Translate, value: string | null | undefined): string {
  if (!value) return '';
  if (catalogLabelKeys[value]) return value;
  const match = Object.entries(catalogLabelKeys).find(([, key]) => t(key) === value);
  return match?.[0] ?? value;
}

export function organizationTypeLabel(t: Translate, value: string | null | undefined): string {
  if (!value) return '';
  const key = organizationTypeLabelKeys[value];
  return key ? t(key) : value;
}

export function organizationTypeValue(t: Translate, value: string | null | undefined): string {
  if (!value) return '';
  if (organizationTypeCanonicalValues[value]) return organizationTypeCanonicalValues[value];
  if (organizationTypeLabelKeys[value]) return value;
  const match = Object.entries(organizationTypeLabelKeys).find(([, key]) => t(key) === value);
  return match ? organizationTypeCanonicalValues[match[0]] ?? match[0] : value;
}

export function occupationLabel(t: Translate, value: string | null | undefined): string {
  if (!value) return '';
  const key = occupationLabelKeys[value];
  return key ? t(key) : value;
}
