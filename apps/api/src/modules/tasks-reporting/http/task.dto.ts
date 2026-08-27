import { IsDateString, IsEnum, IsInt, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator';
import { TASK_WAITING_ON } from '../domain/task.rules.js';

export class CreateTaskDto {
  @IsString() @MinLength(1) @MaxLength(240) title!: string;
  @IsOptional() @IsString() @MaxLength(2000) description?: string;
  @IsString() assigneeUserId!: string;
  @IsOptional() @IsString() teamId?: string | null;
  @IsOptional() @IsEnum(TASK_WAITING_ON) waitingOn?: string | null;
  @IsOptional() @IsDateString() dueAt?: string | null;
  @IsOptional() @IsString() @MaxLength(500) noDueDateReason?: string | null;
  @IsOptional() @IsString() ruleCode?: string | null;
  @IsOptional() @IsString() sourceEventId?: string | null;
  @IsOptional() @IsString() dedupeKey?: string | null;
  @IsString() referenceEntityType!: string;
  @IsString() referenceEntityId!: string;
}

export class VersionedTaskActionDto {
  @IsInt() @Min(1) version!: number;
  @IsOptional() @IsString() @MaxLength(500) reason?: string;
}

export class AssignTaskDto {
  @IsInt() @Min(1) version!: number;
  @IsString() assigneeUserId!: string;
  @IsOptional() @IsString() teamId?: string | null;
}

/** Compatibility payload used by the web work-item surface. */
export class CreateWorkItemDto {
  @IsString() @MinLength(1) @MaxLength(240) title!: string;
  @IsEnum(['URGENT', 'HIGH', 'NORMAL']) priority!: 'URGENT' | 'HIGH' | 'NORMAL';
  @IsDateString() dueAt!: string;
  @IsString() candidateId!: string;
  @IsOptional() @IsString() orderId?: string | null;
  @IsOptional() @IsString() clientId?: string | null;
  @IsOptional() @IsString() @MaxLength(2000) notes?: string | null;
  @IsOptional() @IsString() assigneeId?: string;
  @IsOptional() @IsEnum(TASK_WAITING_ON) waitingOn?: string | null;
  @IsOptional() @IsString() referenceEntityType?: string;
  @IsOptional() @IsString() referenceEntityId?: string;
}
