import { randomUUID } from 'node:crypto';
import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { getRequestContext } from '../../../platform/http/request-context.middleware.js';
import { JobOrderService } from '../application/job-order.service.js';
import { CreateOrderDto, OrderStatusUpdateDto, UpdateOrderRequirementDto } from './clients-orders.dto.js';
import { CsrfGuard } from '../../identity-access/http/guards/csrf.guard.js';
import { PolicyGuard, RequirePermission } from '../../identity-access/http/guards/policy.guard.js';
import { SessionGuard, type AuthenticatedRequest } from '../../identity-access/http/guards/session.guard.js';

@Controller('orders')
@UseGuards(SessionGuard, PolicyGuard)
export class OrdersController {
  constructor(private readonly orders: JobOrderService) {}

  @Get()
  @RequirePermission('job_order.view')
  async list(@Query('query') query?: string, @Query('status') status?: string, @Query('industry') industry?: string, @Query('cursor') cursor?: string, @Query('limit') limit?: string, @Req() request?: AuthenticatedRequest) {
    const auth = request?.auth;
    const result = await this.orders.list({ query, status: status as never, industry, ownerId: auth?.userId, teamId: auth?.teamId, cursor, ...(limit ? { limit: Number(limit) } : {}) });
    return { data: { items: result.items.map(serializeOrder) }, page: result.page, requestId: getRequestContext()?.requestId ?? 'unknown-request' };
  }

  @Get(':id')
  @RequirePermission('job_order.view')
  async get(@Param('id') id: string) { return serializeOrder(await this.orders.get(id)); }

  @Post()
  @UseGuards(CsrfGuard)
  @RequirePermission('job_order.create')
  create(@Body() body: CreateOrderDto, @Req() request: AuthenticatedRequest) {
    return this.orders.create({
      code: `JO-${randomUUID().slice(0, 12).toUpperCase()}`, position: body.position, clientId: body.clientId, industryLabel: body.industryLabel, occupation: body.occupation,
      location: body.location, target: body.target, deadline: new Date(body.deadline), ownerId: request.auth!.userId, teamId: request.auth!.teamId,
      occupationCatalogVersionId: body.occupationCatalogVersionId ?? '', requirementSnapshot: { catalogVersionId: body.occupationCatalogVersionId ?? '', occupation: body.occupation, criteria: body.criteria, salary: body.salary ?? '', contractType: body.contractType ?? '', japaneseLevel: body.japaneseLevel ?? '' },
    }, this.context(request)).then(serializeOrder);
  }

  @Patch(':id/status')
  @UseGuards(CsrfGuard)
  @RequirePermission('job_order.transition')
  transition(@Param('id') id: string, @Body() body: OrderStatusUpdateDto, @Req() request: AuthenticatedRequest) {
    return this.orders.transition(id, body.status, body.version, this.context(request, body.reasonCode), body.reasonCode).then(serializeOrder);
  }

  @Patch(':id/requirements')
  @UseGuards(CsrfGuard)
  @RequirePermission('job_order.update')
  updateRequirement(@Param('id') id: string, @Body() body: UpdateOrderRequirementDto, @Req() request: AuthenticatedRequest) {
    return this.orders.updateRequirement(id, { catalogVersionId: body.occupationCatalogVersionId, occupation: body.occupation, criteria: body.criteria }, body.version, this.context(request)).then(serializeOrder);
  }

  private context(request: AuthenticatedRequest, reason?: string) {
    const context = getRequestContext();
    return { actorId: request.auth!.userId, requestId: context?.requestId ?? 'unknown-request', correlationId: context?.correlationId ?? 'unknown-correlation', ...(reason ? { reason } : {}) };
  }
}

function serializeOrder(order: Awaited<ReturnType<JobOrderService['get']>>) {
  const health = order.status === 'FILLED' ? 'FILLED' : order.deadline.getTime() < Date.now() ? 'EXPIRING' : order.status === 'ON_HOLD' ? 'CLIENT_PAUSED' : 'UNDER_TARGET';
  return {
    id: order.id, code: order.code, position: order.position, client: { id: order.clientId, name: order.clientName ?? order.clientId }, industryLabel: order.industryLabel,
    occupation: order.occupation, location: order.location, target: order.target, deadline: order.deadline.toISOString(), owner: { id: order.ownerId, name: order.ownerName ?? order.ownerId },
    status: order.status, metrics: { target: order.target, ...order.metrics }, health, version: order.version, criteria: order.requirementSnapshot.criteria,
  };
}
