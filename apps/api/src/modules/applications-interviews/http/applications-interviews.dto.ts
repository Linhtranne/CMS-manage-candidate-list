import { ArrayMinSize, IsArray, IsDateString, IsEnum, IsInt, IsOptional, IsString, IsUUID, MaxLength, Min, MinLength } from 'class-validator';
import { APPLICATION_SOURCES, APPLICATION_STATUSES } from '../domain/application.types.js';
import { INTERVIEW_RESULTS } from '../domain/interview.types.js';

export class AddCandidatesToOrderDto {
  @IsArray() @ArrayMinSize(1) @IsUUID('4', { each: true }) candidateIds!: string[];
  @IsEnum(APPLICATION_SOURCES) source!: typeof APPLICATION_SOURCES[number];
}

export class ApplicationDecisionDto {
  @IsEnum(['PASSED', 'FAILED', 'WITHDRAWN']) status!: 'PASSED' | 'FAILED' | 'WITHDRAWN';
  @IsOptional() @IsString() @MaxLength(1000) reasonCode?: string;
  @IsOptional() @IsString() @MaxLength(2000) note?: string;
  @IsDateString() decidedAt!: string;
  @IsInt() @Min(1) version!: number;
}

export class ApplicationTransitionDto {
  @IsEnum(APPLICATION_STATUSES) status!: typeof APPLICATION_STATUSES[number];
  @IsOptional() @IsString() @MaxLength(1000) reason?: string;
  @IsInt() @Min(1) version!: number;
}

export class CreateInterviewDto {
  @IsDateString() scheduledAt!: string;
  @IsDateString() scheduledEndAt!: string;
  @IsString() @MinLength(1) timeZone!: string;
  @IsEnum(['ONLINE', 'IN_PERSON']) mode!: 'ONLINE' | 'IN_PERSON';
  @IsOptional() @IsString() @MaxLength(1000) meetingUrl?: string;
  @IsOptional() @IsString() @MaxLength(240) location?: string;
  @IsArray() @ArrayMinSize(1) @IsUUID('4', { each: true }) participants!: string[];
  @IsInt() @Min(1) version!: number;
}

export class RescheduleInterviewDto extends CreateInterviewDto {
  @IsString() @MinLength(1) @MaxLength(1000) reason!: string;
}

export class CancelInterviewDto {
  @IsString() @MinLength(1) @MaxLength(1000) reason!: string;
  @IsInt() @Min(1) version!: number;
}

export class SaveInterviewResultDto {
  @IsEnum(INTERVIEW_RESULTS) result!: typeof INTERVIEW_RESULTS[number];
  @IsString() @MinLength(1) @MaxLength(5000) feedback!: string;
  @IsArray() @IsString({ each: true }) strengths!: string[];
  @IsArray() @IsString({ each: true }) concerns!: string[];
  @IsOptional() @IsString() @MaxLength(1000) nextStep?: string;
  @IsDateString() recordedAt!: string;
  @IsInt() @Min(1) version!: number;
}
