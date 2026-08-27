import { ArrayMaxSize, ArrayMinSize, IsArray, IsInt, IsObject, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator';

export class CreateCandidateImportDto {
  @IsString() @MinLength(1) @MaxLength(240) fileName!: string;
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(500) @IsObject({ each: true }) rows!: Record<string, unknown>[];
  @IsOptional() @IsString() @MaxLength(40) mappingVersion?: string;
  @IsInt() @Min(0) version!: number;
}

export class CandidateImportCommandDto {
  @IsString() @MinLength(1) importId!: string;
  @IsString() @MinLength(1) previewToken!: string;
  @IsInt() @Min(0) version!: number;
}

export class DuplicateDecisionDto {
  @IsString() @MinLength(1) action!: 'MARK_REVIEWED' | 'KEEP_SEPARATE' | 'MERGE';
  @IsOptional() @IsString() targetCandidateId?: string;
  @IsOptional() @IsString() @MaxLength(1000) reason?: string;
  @IsOptional() @IsString() @MaxLength(160) approvalId?: string;
  @IsInt() @Min(0) version!: number;
}
