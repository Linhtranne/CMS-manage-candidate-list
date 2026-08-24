import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { CsrfGuard } from '../../identity-access/http/guards/csrf.guard.js';
import { PolicyGuard, RequirePermission } from '../../identity-access/http/guards/policy.guard.js';
import { SessionGuard, type AuthenticatedRequest } from '../../identity-access/http/guards/session.guard.js';
import { RetentionService } from '../application/retention.service.js';
@Controller('retention') @UseGuards(SessionGuard, PolicyGuard) @RequirePermission('iam.configure')
export class RetentionController {
  constructor(private readonly retention: RetentionService) {}
  @Post('dry-run') dryRun(@Body() body: { policyCode: string; before: string }) { return this.retention.dryRun(body.policyCode, new Date(body.before)); }
  @Post('execute') @UseGuards(CsrfGuard) execute(@Body() body: { policyCode: string; before: string; approvalId?: string }, @Req() request: AuthenticatedRequest) { return this.retention.execute(body.policyCode, new Date(body.before), request.auth!.userId, body.approvalId); }
  @Post('legal-holds') @UseGuards(CsrfGuard) place(@Body() body: { entityType: string; entityId: string; reason: string }, @Req() request: AuthenticatedRequest) { return this.retention.placeHold({ ...body, actorId: request.auth!.userId }); }
  @Post('legal-holds/release') @UseGuards(CsrfGuard) release(@Body() body: { id: string }, @Req() request: AuthenticatedRequest) { return this.retention.releaseHold(body.id, request.auth!.userId); }
}
