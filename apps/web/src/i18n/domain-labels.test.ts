import { describe, expect, it } from 'vitest';
import { getDomainLabel } from './domain-labels';
import { createTranslator } from './translate';

describe('getDomainLabel', () => {
  it('translates stable system codes with the active locale', () => {
    expect(getDomainLabel(createTranslator('ja'), 'emailStatus', 'SENT')).toBe('送信済み');
    expect(getDomainLabel(createTranslator('vi'), 'emailStatus', 'DELIVERED')).toBe('Đã chuyển đến');
    expect(getDomainLabel(createTranslator('en'), 'emailStatus', 'RETRY_WAIT')).toBe('Waiting to retry');
    expect(getDomainLabel(createTranslator('ja'), 'emailStatus', 'CANCELLED')).toBe('キャンセル済み');
    expect(getDomainLabel(createTranslator('en'), 'conversationStatus', 'NEEDS_ACTION')).toBe('Needs action');
    expect(getDomainLabel(createTranslator('vi'), 'orderHealth', 'CLIENT_PAUSED')).toBe('Khách hàng tạm dừng');
    expect(getDomainLabel(createTranslator('en'), 'orderHealth', 'RESULT_DELAY')).toBe('Result delayed');
    expect(getDomainLabel(createTranslator('ja'), 'orderHealth', 'CLIENT_PAUSED')).toBe('取引先が一時停止');
  });

  it('translates seeded domain values without translating unknown record data', () => {
    expect(getDomainLabel(createTranslator('en'), 'candidateNextAction', 'Bổ sung hồ sơ COE')).toBe('Complete COE documents');
    expect(getDomainLabel(createTranslator('ja'), 'workTask', 'Nhập kết quả phỏng vấn')).toBe('面接結果を入力');
    expect(getDomainLabel(createTranslator('en'), 'milestoneName', 'Chuẩn bị bay')).toBe('Departure plan');
    expect(getDomainLabel(createTranslator('ja'), 'adminRole', 'manager')).toBe('マネージャー');
    expect(getDomainLabel(createTranslator('en'), 'adminTeam', 'team-recruiting')).toBe('Recruiting');
    expect(getDomainLabel(createTranslator('en'), 'adminRoleDescription', 'manager')).toContain('reports');
    expect(getDomainLabel(createTranslator('ja'), 'journeyTemplate', 'Cung ứng ngành chăm sóc')).toBe('介護人材供給');
    expect(getDomainLabel(createTranslator('en'), 'journeyEligibilityReason', 'Ứng viên đang có lộ trình cung ứng hiệu lực.')).toContain('active supply journey');
    expect(getDomainLabel(createTranslator('en'), 'reportMetric', 'activeOrders')).toBe('Open job orders');
    expect(getDomainLabel(createTranslator('ja'), 'reportMetric', 'duplicateCandidates')).toBe('重複候補者');
    expect(getDomainLabel(createTranslator('ja'), 'reportFunnelStage', 'interviewed')).toBe('面接済み');
    expect(getDomainLabel(createTranslator('vi'), 'reportFunnelStage', 'IN_INTERVIEW_PROCESS')).toBe('Đang phỏng vấn');
    expect(getDomainLabel(createTranslator('en'), 'reportFunnelStage', 'PASSED')).toBe('Passed');
    expect(getDomainLabel(createTranslator('en'), 'orderStatus', 'OPEN')).toBe('Recruiting');
    expect(getDomainLabel(createTranslator('vi'), 'auditSource', 'API')).toBe('API hệ thống');
  });

  it('preserves unknown values instead of translating user-owned data', () => {
    expect(getDomainLabel(createTranslator('ja'), 'emailStatus', 'CUSTOM_VALUE')).toBe('CUSTOM_VALUE');
    expect(getDomainLabel(createTranslator('vi'), 'auditAction', 'AUTH_LOGIN_SUCCESS', 'admin.audit.systemAction')).toBe('Hoạt động hệ thống');
  });
});
