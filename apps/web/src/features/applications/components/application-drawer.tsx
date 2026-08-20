'use client';

import { useEffect, useState } from 'react';
import { DetailDrawer } from '@/components/ui/detail-drawer';
import { ErrorState } from '@/components/ui/error-state';
import { LoadingState } from '@/components/ui/loading-state';
import { useApplication } from '../services/application-queries';
import { ApplicationProfileContent, type ApplicationTab } from './application-profile-content';
import { ApplicationDecisionDialog } from './application-decision-dialog';
import { StartJourneyDialog } from './start-journey-dialog';
import { ApplicationOperationDialogs } from './application-operation-dialogs';
import { useI18n } from '@/i18n/use-i18n';

export function ApplicationDrawer({ applicationId, open, onClose }: { applicationId?: string; open: boolean; onClose: () => void }) {
  const { t } = useI18n();
  const query = useApplication(applicationId);
  const [activeTab, setActiveTab] = useState<ApplicationTab>('overview');
  const [interviewAction, setInterviewAction] = useState<'create' | 'reschedule'>();
  const [selectedInterviewId, setSelectedInterviewId] = useState<string>();
  const [showResult, setShowResult] = useState(false);
  const [showDecision, setShowDecision] = useState(false);
  const [showJourney, setShowJourney] = useState(false);
  const [attendanceAction, setAttendanceAction] = useState<'cancel' | 'no-show'>();
  useEffect(() => { if (!open) setActiveTab('overview'); }, [applicationId, open]);
  useEffect(() => { if (!open) { setInterviewAction(undefined); setSelectedInterviewId(undefined); setShowResult(false); setShowDecision(false); setShowJourney(false); setAttendanceAction(undefined); } }, [open]);
  const application = query.data;
  const selectedInterview = application?.interviews.find((item) => item.id === selectedInterviewId);
  const resultInterview = application?.interviews.filter((item) => item.scheduleStatus === 'COMPLETED').sort((a, b) => b.round - a.round)[0];
  const closeInlineActions = () => { setInterviewAction(undefined); setSelectedInterviewId(undefined); setAttendanceAction(undefined); setShowResult(false); };
  return <DetailDrawer open={open} title={t('applications.drawer.title')} size="wide" onClose={onClose}>{query.isPending ? <LoadingState label={t('applications.profile.error')} /> : query.error || !application ? <ErrorState message={t('applications.drawer.loadError')} onRetry={() => void query.refetch()} /> : <div className="space-y-6"><ApplicationProfileContent application={application} activeTab={activeTab} onTabChange={setActiveTab} actions={{ onSchedule: () => { closeInlineActions(); setShowDecision(false); setShowJourney(false); setActiveTab('interviews'); setInterviewAction('create'); }, onReschedule: (item) => { closeInlineActions(); setShowDecision(false); setShowJourney(false); setActiveTab('interviews'); setSelectedInterviewId(item.id); setInterviewAction('reschedule'); }, onCancelInterview: (item) => { closeInlineActions(); setShowDecision(false); setShowJourney(false); setSelectedInterviewId(item.id); setAttendanceAction('cancel'); }, onNoShow: (item) => { closeInlineActions(); setShowDecision(false); setShowJourney(false); setSelectedInterviewId(item.id); setAttendanceAction('no-show'); }, onResult: () => { closeInlineActions(); setShowDecision(false); setShowJourney(false); setActiveTab('result'); setShowResult(Boolean(resultInterview)); }, onDecision: () => { closeInlineActions(); setShowJourney(false); setShowDecision(true); }, onJourney: () => { closeInlineActions(); setShowDecision(false); setShowJourney(true); } }} /><ApplicationOperationDialogs application={application} interviewAction={interviewAction} selectedInterview={selectedInterview} attendanceAction={attendanceAction} resultInterview={resultInterview} showResult={showResult} onCloseInterview={() => { setInterviewAction(undefined); setSelectedInterviewId(undefined); }} onCloseAttendance={() => { setAttendanceAction(undefined); setSelectedInterviewId(undefined); }} onCloseResult={() => setShowResult(false)} onSaved={() => void query.refetch()} /><ApplicationDecisionDialog application={application} open={showDecision} onClose={() => setShowDecision(false)} onSaved={() => void query.refetch()} /><StartJourneyDialog application={application} open={showJourney} onClose={() => setShowJourney(false)} onSaved={() => void query.refetch()} /></div>}</DetailDrawer>;
}
