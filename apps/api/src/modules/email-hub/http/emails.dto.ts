import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsEmail, IsEnum, IsInt, IsOptional, IsString, IsUUID, MaxLength, Min, MinLength, ValidateNested } from 'class-validator';

export class EmailRecipientDto {
  @IsEnum(['TO', 'CC', 'BCC']) kind!: 'TO' | 'CC' | 'BCC';
  @IsEmail() address!: string;
}

export class CreateEmailPreviewDto {
  @IsUUID() mailboxId!: string;
  @IsEmail() from!: string;
  @IsArray() @ArrayMinSize(1) @ValidateNested({ each: true }) @Type(() => EmailRecipientDto) recipients!: EmailRecipientDto[];
  @IsString() @MinLength(1) @MaxLength(998) subject!: string;
  @IsString() @MinLength(1) bodyText!: string;
  @IsOptional() @IsString() sanitizedHtml?: string;
  @IsOptional() @IsUUID() templateId?: string;
  @IsOptional() @IsString() @MaxLength(128) templateChecksum?: string;
  @IsOptional() @IsUUID() candidateId?: string;
  @IsOptional() @IsUUID() conversationId?: string;
  @IsOptional() @IsUUID() applicationId?: string;
  @IsOptional() @IsUUID() journeyId?: string;
}

export class EnqueueEmailDto extends CreateEmailPreviewDto {
  @IsString() @MinLength(8) @MaxLength(240) idempotencyKey!: string;
  @IsString() @MinLength(1) previewToken!: string;
}

export class EmailCommandVersionDto {
  @IsInt() @Min(1) version!: number;
}

export class ResolveEmailMatchDto {
  @IsUUID() candidateId!: string;
  @IsString() @MinLength(1) @MaxLength(1000) reason!: string;
  @IsOptional() @IsUUID() applicationId?: string;
  @IsOptional() @IsUUID() journeyId?: string;
}

export class EmailActionDto {
  @IsOptional() @IsString() @MaxLength(1000) reason?: string;
}

export class SendConversationDto {
  @IsArray() @ArrayMinSize(1) @IsEmail({}, { each: true }) to!: string[];
  @IsOptional() @IsArray() @IsEmail({}, { each: true }) cc?: string[];
  @IsString() @MinLength(1) @MaxLength(998) subject!: string;
  @IsString() @MinLength(1) body!: string;
  @IsOptional() @IsString() @MaxLength(160) templateId?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) attachmentIds?: string[];
  @IsString() @MinLength(8) @MaxLength(240) idempotencyKey!: string;
  @IsInt() @Min(0) version!: number;
}

export class LinkConversationDto {
  @IsUUID() candidateId!: string;
  @IsOptional() @IsUUID() applicationId?: string;
  @IsOptional() @IsUUID() journeyId?: string;
  @IsInt() @Min(0) version!: number;
}

export class CreateEmailDraftDto {
  @IsUUID() mailboxId!: string;
  @IsOptional() @IsUUID() conversationId?: string;
  @IsArray() @ArrayMinSize(1) @IsEmail({}, { each: true }) to!: string[];
  @IsOptional() @IsArray() @IsEmail({}, { each: true }) cc?: string[];
  @IsString() @MinLength(1) @MaxLength(998) subject!: string;
  @IsString() @MinLength(1) body!: string;
  @IsOptional() @IsUUID() candidateId?: string;
  @IsOptional() @IsUUID() applicationId?: string;
  @IsOptional() @IsUUID() journeyId?: string;
  @IsOptional() @IsString() @MinLength(8) @MaxLength(240) idempotencyKey?: string;
  @IsOptional() @IsInt() @Min(1) version?: number;
}
