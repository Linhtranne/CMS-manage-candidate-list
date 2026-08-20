import { describe, expect, it } from 'vitest';
import { getDomainLabel } from './domain-labels';
import { createTranslator } from './translate';

describe('getDomainLabel', () => {
  it('translates stable system codes with the active locale', () => {
    expect(getDomainLabel(createTranslator('ja'), 'emailStatus', 'SENT')).toBe('送信済み');
    expect(getDomainLabel(createTranslator('en'), 'conversationStatus', 'NEEDS_ACTION')).toBe('Needs action');
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
  });

  it('preserves unknown values instead of translating user-owned data', () => {
    expect(getDomainLabel(createTranslator('ja'), 'emailStatus', 'CUSTOM_VALUE')).toBe('CUSTOM_VALUE');
  });
});
