import { Type } from 'class-transformer';
import { IsArray, IsDateString, IsEnum, IsInt, IsObject, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator';
import { JOURNEY_CASE_TYPES, RESIDENCE_CONTEXTS } from '../domain/journey-template.js';

export class CreateJourneyTemplateDto {
  @IsString() @MinLength(2) @MaxLength(80) code!: string;
  @IsString() @MinLength(2) @MaxLength(160) name!: string;
  @IsInt() @Min(1) version!: number;
  @IsEnum(RESIDENCE_CONTEXTS) residenceContext!: string;
  @IsOptional() @IsString() visaRouteVersionId?: string | null;
  @IsEnum(JOURNEY_CASE_TYPES) caseType!: string;
  @IsOptional() @IsString() sectorVersionId?: string | null;
  @IsOptional() @IsString() occupationVersionId?: string | null;
  @IsOptional() @IsObject() applicability?: Record<string, unknown> | null;
  @IsArray() @Type(() => Object) milestones!: Record<string, unknown>[];
  @IsOptional() @IsDateString() effectiveFrom?: string | null;
  @IsOptional() @IsDateString() effectiveTo?: string | null;
}

export class VersionedJourneyTemplateActionDto {
  @IsInt() @Min(1) version!: number;
}

