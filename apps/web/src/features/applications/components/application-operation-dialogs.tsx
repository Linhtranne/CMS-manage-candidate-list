'use client';

import type { components } from '@cms/contracts';
import { Modal } from '@/components/ui/modal';
import { InterviewAttendanceForm } from './interview-attendance-form';
import { InterviewForm } from './interview-form';
import { InterviewResultForm } from './interview-result-form';

type Application = components['schemas']['ApplicationDetail'];
type Interview = components['schemas']['Interview'];

type Props = {
  application: Application;
  interviewAction?: 'create' | 'reschedule';
  selectedInterview?: Interview;
  attendanceAction?: 'cancel' | 'no-show';
  resultInterview?: Interview;
  showResult: boolean;
  onCloseInterview: () => void;
  onCloseAttendance: () => void;
  onCloseResult: () => void;
  onSaved: () => void;
};

export function ApplicationOperationDialogs({ application, interviewAction, selectedInterview, attendanceAction, resultInterview, showResult, onCloseInterview, onCloseAttendance, onCloseResult, onSaved }: Props) {
  const interviewTitle = interviewAction === 'reschedule' ? 'Đổi lịch phỏng vấn' : `Lên lịch vòng ${application.interviews.length + 1}`;
  const attendanceTitle = attendanceAction === 'cancel' ? 'Hủy lịch phỏng vấn' : 'Đánh dấu không đến';

  return <>
    {interviewAction && (interviewAction === 'create' || selectedInterview) ? <Modal open title={interviewTitle} description={`${application.candidate.name} · ${application.order.code}`} size="md" onClose={onCloseInterview}><InterviewForm embedded application={application} interview={selectedInterview} mode={interviewAction} onCancel={onCloseInterview} onSaved={() => { onCloseInterview(); onSaved(); }} /></Modal> : null}
    {attendanceAction && selectedInterview ? <Modal open title={attendanceTitle} description={`Vòng ${selectedInterview.round} · ${new Date(selectedInterview.scheduledAt).toLocaleString('vi-VN')}`} size="sm" onClose={onCloseAttendance}><InterviewAttendanceForm embedded application={application} interview={selectedInterview} action={attendanceAction} onCancel={onCloseAttendance} onSaved={() => { onCloseAttendance(); onSaved(); }} /></Modal> : null}
    {showResult && resultInterview ? <Modal open title={`Nhập kết quả vòng ${resultInterview.round}`} description={`${application.candidate.name} · ${new Date(resultInterview.scheduledAt).toLocaleString('vi-VN')}`} size="md" onClose={onCloseResult}><InterviewResultForm embedded application={application} interview={resultInterview} onCancel={onCloseResult} onSaved={() => { onCloseResult(); onSaved(); }} /></Modal> : null}
  </>;
}
