import { IsArray, IsEnum, IsInt, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator';
import { BLOCKER_PARTIES } from '../domain/journey-milestone.aggregate.js';

export class MilestoneCommandDto {
  @IsInt() @Min(1) version!: number;
  @IsOptional() @IsString() @MaxLength(1000) reason?: string;
  @IsOptional() @IsEnum(BLOCKER_PARTIES) blockerParty?: (typeof BLOCKER_PARTIES)[number];
  @IsOptional() @IsString() @MaxLength(1000) blockerReason?: string;
  @IsOptional() @IsString() @MaxLength(1000) expectedResolution?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) evidenceIds?: string[];
  @IsOptional() @IsString() approvalId?: string;
  @IsOptional() @IsString() approverId?: string;
  @IsOptional() checklistData?: Record<string, unknown>;
}

export class OpenMilestoneAttemptDto {
  @IsString() @MinLength(1) @MaxLength(1000) reason!: string;
}
