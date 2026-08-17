'use client';

import { useState } from 'react';
import { ErrorState } from '@/components/ui/error-state';
import { LoadingState } from '@/components/ui/loading-state';
import { useApplication } from '../services/application-queries';
import { ApplicationProfileContent, type ApplicationTab } from './application-profile-content';
import { InterviewForm } from './interview-form';
import { InterviewResultForm } from './interview-result-form';
import { ApplicationDecisionDialog } from './application-decision-dialog';
import { StartJourneyDialog } from './start-journey-dialog';
import { InterviewAttendanceForm } from './interview-attendance-form';

export function ApplicationDetailPage({ applicationId }: { applicationId: string }) {
  const query = useApplication(applicationId);
  const [activeTab, setActiveTab] = useState<ApplicationTab>('overview');
  const [interviewAction, setInterviewAction] = useState<'create' | 'reschedule'>();
  const [selectedInterviewId, setSelectedInterviewId] = useState<string>();
  const [showResult, setShowResult] = useState(false);
  const [showDecision, setShowDecision] = useState(false);
  const [showJourney, setShowJourney] = useState(false);
  const [attendanceAction, setAttendanceAction] = useState<'cancel' | 'no-show'>();
  if (query.isPending) return <LoadingState />;
  if (query.error || !query.data) return <ErrorState message="Không thể tải hồ sơ ứng tuyển." onRetry={() => void query.refetch()} />;
  const application = query.data;
  const selectedInterview = application.interviews.find((item) => item.id === selectedInterviewId);
  const resultInterview = application.interviews.filter((item) => item.scheduleStatus === 'COMPLETED').sort((a, b) => b.round - a.round)[0];
  const closeInlineActions = () => { setInterviewAction(undefined); setSelectedInterviewId(undefined); setAttendanceAction(undefined); setShowResult(false); };
  return <div className="space-y-6"><ApplicationProfileContent application={application} activeTab={activeTab} onTabChange={setActiveTab} actions={{ onSchedule: () => { closeInlineActions(); setShowDecision(false); setShowJourney(false); setActiveTab('interviews'); setInterviewAction('create'); }, onReschedule: (item) => { closeInlineActions(); setShowDecision(false); setShowJourney(false); setActiveTab('interviews'); setSelectedInterviewId(item.id); setInterviewAction('reschedule'); }, onCancelInterview: (item) => { closeInlineActions(); setShowDecision(false); setShowJourney(false); setSelectedInterviewId(item.id); setAttendanceAction('cancel'); }, onNoShow: (item) => { closeInlineActions(); setShowDecision(false); setShowJourney(false); setSelectedInterviewId(item.id); setAttendanceAction('no-show'); }, onResult: () => { closeInlineActions(); setShowDecision(false); setShowJourney(false); setActiveTab('result'); setShowResult(Boolean(resultInterview)); }, onDecision: () => { closeInlineActions(); setShowJourney(false); setShowDecision(true); }, onJourney: () => { closeInlineActions(); setShowDecision(false); setShowJourney(true); } }} />{interviewAction && <InterviewForm application={application} interview={selectedInterview} mode={interviewAction} onCancel={() => { setInterviewAction(undefined); setSelectedInterviewId(undefined); }} onSaved={() => { setInterviewAction(undefined); setSelectedInterviewId(undefined); void query.refetch(); }} />}{attendanceAction && selectedInterview && <InterviewAttendanceForm application={application} interview={selectedInterview} action={attendanceAction} onCancel={() => { setAttendanceAction(undefined); setSelectedInterviewId(undefined); }} onSaved={() => { setAttendanceAction(undefined); setSelectedInterviewId(undefined); void query.refetch(); }} />}{showResult && resultInterview && <InterviewResultForm application={application} interview={resultInterview} onCancel={() => setShowResult(false)} onSaved={() => { setShowResult(false); void query.refetch(); }} />}<ApplicationDecisionDialog application={application} open={showDecision} onClose={() => setShowDecision(false)} onSaved={() => void query.refetch()} /><StartJourneyDialog application={application} open={showJourney} onClose={() => setShowJourney(false)} onSaved={() => void query.refetch()} /></div>;
}
