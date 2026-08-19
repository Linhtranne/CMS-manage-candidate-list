export const mailTemplates = [
  { id: 'INTERVIEW_INVITATION', label: 'Mời phỏng vấn', requiredContext: 'interviewTime' },
  { id: 'DOCUMENT_REQUEST', label: 'Yêu cầu bổ sung hồ sơ', requiredContext: null },
  { id: 'RESULT_NOTICE', label: 'Thông báo kết quả', requiredContext: null }
] as const;

export function TemplatePicker({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return <label className="block text-sm font-semibold text-text">Mẫu email<select aria-label="Mẫu email" name="mau-email" value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 min-h-10 w-full rounded-control border border-border bg-panel px-3 font-normal"><option value="">Không dùng mẫu</option>{mailTemplates.map((template) => <option key={template.id} value={template.id}>{template.label}</option>)}</select></label>;
}
