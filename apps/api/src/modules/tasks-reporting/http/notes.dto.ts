import { IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class CreateEntityNoteDto {
  @IsString() @MinLength(1) @MaxLength(64) entityType!: string;
  @IsUUID() entityId!: string;
  @IsString() @MinLength(1) @MaxLength(5000) content!: string;
}
