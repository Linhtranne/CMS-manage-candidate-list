import { IsDateString, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class StartApplicationSupplyJourneyDto {
  @IsString() @MinLength(1) templateId!: string;
  @IsString() @MinLength(1) templateVersion!: string;
  @IsString() @MinLength(1) ownerUserId!: string;
  @IsDateString() startedAt!: string;
}

export class StartSupplyJourneyDto {
  @IsString() @MinLength(1) previewToken!: string;
  @IsString() @MinLength(8) @MaxLength(320) idempotencyKey!: string;
  @IsOptional() @IsString() ownerUserId?: string;
  @IsOptional() @IsDateString() startedAt?: string;
}
