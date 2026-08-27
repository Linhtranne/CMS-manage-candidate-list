import { IsInt, IsOptional, IsString, Min } from 'class-validator';
export class CreateDocumentUploadDto { @IsString() candidateId!: string; @IsString() title!: string; @IsString() category!: string; @IsString() claimedMime!: string; @IsInt() @Min(1) sizeBytes!: number; @IsString() checksum!: string; }
export class LinkDocumentDto { @IsString() candidateId!: string; @IsOptional() @IsString() journeyId?: string; @IsOptional() @IsString() milestoneId?: string; }
