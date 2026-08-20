'use client';

import { useI18n } from '@/i18n/use-i18n';

export function DepartureFields({ departureDate, airport, note, onChange }: { departureDate: string; airport: string; note: string; onChange: (patch: { departureDate?: string; airport?: string; note?: string }) => void }) {
  const { t } = useI18n();
  return <fieldset className="space-y-3 rounded-control border border-border bg-surface p-4"><legend className="px-1 text-sm font-semibold text-text">{t('validation.departurePlan')}</legend><label className="block text-sm font-semibold text-text">{t('validation.departureDate')}<input aria-label={t('validation.departureDate')} name="departure-date" type="datetime-local" value={departureDate} onChange={(event) => onChange({ departureDate: event.target.value })} className="mt-1 min-h-10 w-full rounded-control border border-border bg-panel px-3 font-normal" /></label><label className="block text-sm font-semibold text-text">{t('validation.airport')}<input aria-label={t('validation.airportAria')} name="departure-airport" value={airport} onChange={(event) => onChange({ airport: event.target.value })} className="mt-1 min-h-10 w-full rounded-control border border-border bg-panel px-3 font-normal" /></label><label className="block text-sm font-semibold text-text">{t('validation.note')}<textarea aria-label={t('validation.noteAria')} name="departure-note" value={note} onChange={(event) => onChange({ note: event.target.value })} className="mt-1 min-h-20 w-full rounded-control border border-border bg-panel px-3 py-2 font-normal" /></label></fieldset>;
}
