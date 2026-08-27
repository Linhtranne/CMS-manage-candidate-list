import { IsEnum, IsObject, IsString, MaxLength, MinLength } from 'class-validator';

export const SAVED_VIEW_VISIBILITIES = ['PRIVATE', 'TEAM'] as const;
export type SavedViewVisibility = typeof SAVED_VIEW_VISIBILITIES[number];

export class SaveViewDto {
  @IsString() @MinLength(1) @MaxLength(80) resource!: string;
  @IsString() @MinLength(1) @MaxLength(160) name!: string;
  @IsObject() query!: Record<string, string | string[]>;
  @IsEnum(SAVED_VIEW_VISIBILITIES) visibility!: SavedViewVisibility;
}
