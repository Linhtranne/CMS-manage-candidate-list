import { Button, ButtonLink } from '@/components/ui/button';
import { useI18n } from '@/i18n/use-i18n';

export function WorkActions({ onComplete, sendEmailHref, onChangeDue, onChangeAssignee, disabled = false }: { onComplete: () => void; sendEmailHref: string; onChangeDue: () => void; onChangeAssignee: () => void; disabled?: boolean }) {
  const { t } = useI18n();
  return (
    <div className="flex flex-wrap gap-2 border-t border-border pt-4">
      <Button variant="primary" onClick={onComplete} disabled={disabled}>{t('work.actions.complete')}</Button>
      <ButtonLink variant="secondary" href={sendEmailHref} className={disabled ? 'pointer-events-none opacity-50' : undefined} aria-disabled={disabled} tabIndex={disabled ? -1 : undefined} onClick={(event) => { if (disabled) event.preventDefault(); }}>{t('work.actions.email')}</ButtonLink>
      <Button variant="secondary" onClick={onChangeDue} disabled={disabled}>{t('work.actions.changeDue')}</Button>
      <Button variant="secondary" onClick={onChangeAssignee} disabled={disabled}>{t('work.actions.changeAssignee')}</Button>
    </div>
  );
}

