import { ArrayMinSize, IsArray, IsEmail, IsEnum, IsInt, IsNumber, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';
import { CANDIDATE_CONTACTABILITY_STATUSES, CANDIDATE_READINESS_STATUSES, CANDIDATE_RECORD_STATUSES } from '../domain/candidate.types.js';

export class CreateCandidateDto {
  @IsString() @MinLength(1) @MaxLength(240) name!: string;
  @IsArray() @ArrayMinSize(1) @IsString({ each: true }) industryLabels!: string[];
  @IsString() @MinLength(1) @MaxLength(160) occupation!: string;
  @IsString() @MinLength(1) @MaxLength(40) japaneseLevel!: string;
  @IsOptional() @IsEmail() email?: string | null;
  @IsOptional() @IsString() @MaxLength(40) phone?: string | null;
  @IsOptional() @IsString() @MaxLength(80) passportNumber?: string | null;
  @IsOptional() @IsString() @MaxLength(2000) address?: string | null;
  @IsString() @MinLength(1) @MaxLength(120) source!: string;
  @IsOptional() @IsEnum(CANDIDATE_READINESS_STATUSES) readinessStatus?: typeof CANDIDATE_READINESS_STATUSES[number];
  @IsOptional() @IsEnum(CANDIDATE_CONTACTABILITY_STATUSES) contactabilityStatus?: typeof CANDIDATE_CONTACTABILITY_STATUSES[number];
  @IsOptional() @IsEnum(CANDIDATE_RECORD_STATUSES) recordStatus?: typeof CANDIDATE_RECORD_STATUSES[number];
  @IsOptional() @IsInt() @Min(0) version?: number;
}

export class UpdateCandidateDto extends CreateCandidateDto {
  @IsInt() @Min(1) declare version: number;
}

export class CreateOccupationProfileDto {
  @IsString() @MinLength(1) @MaxLength(160) industryLabel!: string;
  @IsString() @MinLength(1) @MaxLength(160) occupation!: string;
  @IsNumber() @Min(0) @Max(80) yearsExperience!: number;
  @IsArray() @IsString({ each: true }) skills!: string[];
  @IsOptional() @IsString() @MaxLength(160) desiredLocation?: string;
  @IsOptional() attributes?: Record<string, unknown>;
  @IsOptional() @IsString() @MaxLength(120) schemaVersionId?: string;
}

export class ArchiveCandidateDto {
  @IsInt() @Min(1) version!: number;
  @IsString() @MinLength(1) @MaxLength(1000) reason!: string;
  @IsOptional() @IsString() @MaxLength(160) approvalId?: string;
}
