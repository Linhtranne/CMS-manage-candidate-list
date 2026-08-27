import { IsEnum, IsInt, IsString, MaxLength, Min, MinLength } from 'class-validator';
import { CATALOG_TYPES } from '../domain/catalog.rules.js';

export class CreateCatalogDto {
  @IsEnum(CATALOG_TYPES)
  type!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(80)
  code!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(240)
  label!: string;
}

export class VersionedCatalogActionDto {
  @IsInt()
  @Min(1)
  version!: number;
}
