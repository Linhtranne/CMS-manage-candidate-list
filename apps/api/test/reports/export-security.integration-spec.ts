import { describe, expect, it } from 'vitest';
import { ReportExportService } from '../../src/modules/tasks-reporting/application/report-export.service.js';
describe('report export security', () => {
  it('fails closed while export activation is disabled', async () => {
    const service = new ReportExportService({ create: async () => ({}), findScoped: async () => null }, false);
    await expect(service.create({ reportCode: 'candidate_inventory', format: 'CSV', purpose: 'audit', includedFields: ['status'], filters: {} }, { actorId: 'u1', scope: 'SELF' })).rejects.toMatchObject({ code: 'REPORT_EXPORT_DISABLED' });
  });
  it('rejects sensitive columns before queueing', async () => {
    const service = new ReportExportService({ create: async () => ({}), findScoped: async () => null }, true);
    await expect(service.create({ reportCode: 'candidate_inventory', format: 'CSV', purpose: 'audit', includedFields: ['passportNumber'], filters: {} }, { actorId: 'u1', scope: 'SELF' })).rejects.toMatchObject({ code: 'REPORT_EXPORT_FIELD_RESTRICTED' });
  });
});
