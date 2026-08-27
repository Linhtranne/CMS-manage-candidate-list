import type { Translate } from './types';

export function timeZoneLabel(t: Translate, value: string | null | undefined): string {
  if (!value) return '';
  if (value === 'Asia/Ho_Chi_Minh') return t('reports.page.timeZones.asiaHoChiMinh');
  if (value === 'Asia/Tokyo') return t('reports.page.timeZones.asiaTokyo');
  if (value === 'UTC') return t('reports.page.timeZones.utc');
  return value;
}
