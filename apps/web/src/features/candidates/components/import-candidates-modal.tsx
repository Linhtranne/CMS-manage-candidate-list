'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { useI18n } from '@/i18n/use-i18n';
import type { TranslationKey } from '@/i18n/types';
import { localizedError } from '@/i18n/errors';
import { useCandidates, useImportCandidates } from '../services/candidate-queries';

type PreviewRow = { row: number; values: Record<string, string>; errorKey?: TranslationKey; missingHeaders?: string[]; duplicate?: boolean };
const requiredHeaders = ['name', 'industry'];

function parseCsv(text: string, missingOccupation: string): PreviewRow[] {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length < 2) return [];
  const headers = (lines[0] ?? '').split(',').map((value) => value.trim().toLowerCase());
  return lines.slice(1).map((line, index) => {
    const values = line.split(',').reduce<Record<string, string>>((acc, value, columnIndex) => { const header = headers[columnIndex]; if (header) acc[header] = value.trim(); return acc; }, {});
    if (!values.occupation) values.occupation = missingOccupation;
    const missingHeaders = requiredHeaders.filter((header) => !values[header]);
    return { row: index + 2, values, errorKey: missingHeaders.length ? 'validation.import.missingFields' : undefined, missingHeaders };
  });
}

export function ImportCandidatesModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useI18n();
  const importCandidates = useImportCandidates();
  const existing = useCandidates({ view: 'all' });
  const [file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState<PreviewRow[]>([]);
  const [result, setResult] = useState<{ validRows: number; invalidRows: number; duplicateRows: number } | null>(null);
  const [error, setError] = useState('');
  const validRows = rows.filter((row) => !row.errorKey && !row.duplicate).length;

  const selectFile = async (nextFile: File | null) => {
    setFile(nextFile); setResult(null); setError(''); setRows([]);
    if (!nextFile) return;
    if (!nextFile.name.toLowerCase().endsWith('.csv')) { setError(t('candidates.import.csvOnly')); return; }
    const parsed = parseCsv(await nextFile.text(), t('candidates.drawer.notUpdated'));
    const candidates = existing.data?.items ?? [];
    setRows(parsed.map((row) => {
      const name = row.values.name?.toLowerCase();
      const duplicate = Boolean(name && candidates.some((candidate) => candidate.name.toLowerCase() === name));
      return { ...row, duplicate };
    }));
  };

  const submit = () => {
    if (!file || !rows.length) return setError(t('candidates.import.chooseFile'));
    setError('');
    importCandidates.mutate({ fileName: file.name, rows: rows.filter((row) => !row.errorKey && !row.duplicate).map((row) => row.values), version: 0 }, {
      onSuccess: (response) => setResult({ validRows: response.validRows, invalidRows: response.invalidRows, duplicateRows: response.duplicateRows }),
      onError: (mutationError) => setError(localizedError(t, mutationError, t('common.errors.loadFailed')))
    });
  };

  return <Modal open={open} onClose={onClose} title={t('candidates.import.title')} description={t('candidates.import.description')} size="md" footer={result ? <Button variant="primary" onClick={onClose}>{t('candidates.form.close')}</Button> : <><Button onClick={onClose}>{t('candidates.form.cancel')}</Button><Button variant="primary" onClick={submit} disabled={!file || importCandidates.isPending}>{importCandidates.isPending ? t('candidates.import.checking') : t('candidates.import.confirm')}</Button></>}>
    {result ? <div className="rounded-control border border-success/30 bg-success/10 px-4 py-3 text-sm font-semibold text-success" role="status"><p>{t('candidates.import.imported', { count: result.validRows })}</p><p className="mt-1 text-xs font-normal text-text-muted">{t('candidates.import.invalid', { count: result.invalidRows })} · {t('candidates.import.duplicate', { count: result.duplicateRows })}</p></div> : <div className="space-y-5">
      {error ? <p role="alert" className="rounded-control border border-danger/30 bg-danger/10 px-4 py-3 text-sm font-semibold text-danger">{error}</p> : null}
      <label className="block text-sm font-semibold text-text">{t('candidates.import.file')}<input aria-label={t('candidates.import.fileAria')} name="candidate-file" type="file" accept=".csv,.xlsx,.xls" onChange={(event) => { void selectFile(event.target.files?.[0] ?? null); }} className="mt-2 block w-full rounded-control border border-border bg-panel px-3 py-3 text-sm text-text file:mr-3 file:rounded-control file:border-0 file:bg-surface file:px-3 file:py-2 file:text-sm file:font-semibold" /></label>
      <div className="rounded-control border border-border bg-surface p-4 text-sm"><p className="font-semibold text-text">{t('candidates.import.preview')}</p>{file ? <div className="mt-3 space-y-3 text-text-muted"><p><span className="font-semibold text-success">{t('candidates.import.valid', { count: validRows })}</span> · {t('candidates.import.invalid', { count: rows.filter((row) => row.errorKey).length })} · {t('candidates.import.duplicate', { count: rows.filter((row) => row.duplicate).length })}</p><p>{t('candidates.import.fileName', { name: file.name })}</p>{rows.length ? <div className="max-h-48 overflow-auto rounded-control border border-border"><table className="w-full text-left text-xs"><thead className="border-b border-border"><tr><th className="px-2 py-2">{t('candidates.import.row')}</th><th className="px-2 py-2">{t('candidates.import.name')}</th><th className="px-2 py-2">{t('candidates.import.status')}</th></tr></thead><tbody>{rows.slice(0, 8).map((row) => <tr key={row.row} className="border-b border-border last:border-0"><td className="px-2 py-2">{row.row}</td><td className="px-2 py-2">{row.values.name || '—'}</td><td className="px-2 py-2">{row.errorKey ? <span className="text-danger">{t(row.errorKey, { fields: row.missingHeaders?.join(', ') ?? '' })}</span> : row.duplicate ? <span className="text-warning">{t('candidates.import.duplicateStatus')}</span> : <span className="text-success">{t('candidates.import.validStatus')}</span>}</td></tr>)}</tbody></table></div> : <p>{t('candidates.import.noRows')}</p>}</div> : <p className="mt-2 text-text-muted">{t('candidates.import.chooseHint')}</p>}</div>
    </div>}
  </Modal>;
}
