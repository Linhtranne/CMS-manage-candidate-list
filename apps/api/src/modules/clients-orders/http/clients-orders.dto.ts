import { IsArray, IsDateString, IsEnum, IsInt, IsOptional, IsString, IsUUID, MaxLength, Min, MinLength } from 'class-validator';
import { CLIENT_STATUSES, JOB_ORDER_STATUSES } from '../domain/order.types.js';

export class CreateClientDto {
  @IsString() @MinLength(2) @MaxLength(240) name!: string;
  @IsString() @MinLength(2) @MaxLength(120) organizationType!: string;
  @IsArray() @IsString({ each: true }) industryLabels!: string[];
  @IsString() @MinLength(2) @MaxLength(160) region!: string;
  @IsUUID() ownerId!: string;
  @IsOptional() @IsUUID() teamId?: string;
  @IsOptional() @IsString() @MinLength(2) @MaxLength(160) contactName?: string;
  @IsOptional() @IsString() @MaxLength(320) contactEmail?: string;
  @IsOptional() @IsString() @MaxLength(40) contactPhone?: string;
  @IsOptional() @IsString() @MaxLength(2000) notes?: string;
}

export class UpdateClientDto extends CreateClientDto {
  @IsInt() @Min(1) version!: number;
  @IsOptional() @IsEnum(CLIENT_STATUSES) status?: typeof CLIENT_STATUSES[number];
}

export class CreateOrderDto {
  @IsString() @MinLength(2) @MaxLength(240) position!: string;
  @IsUUID() clientId!: string;
  @IsString() @MinLength(2) @MaxLength(160) industryLabel!: string;
  @IsString() @MinLength(2) @MaxLength(160) occupation!: string;
  @IsString() @MinLength(2) @MaxLength(160) location!: string;
  @IsInt() @Min(1) target!: number;
  @IsDateString() deadline!: string;
  @IsUUID() ownerId!: string;
  @IsOptional() @IsUUID() teamId?: string;
  @IsOptional() @IsUUID() occupationCatalogVersionId?: string;
  @IsOptional() @IsString() @MaxLength(160) salary?: string;
  @IsOptional() @IsString() @MaxLength(120) contractType?: string;
  @IsOptional() @IsString() @MaxLength(40) japaneseLevel?: string;
  @IsArray() @IsString({ each: true }) criteria!: string[];
}

export class UpdateOrderDto {
  @IsString() @MinLength(2) @MaxLength(240) position!: string;
  @IsString() @MinLength(2) @MaxLength(160) industryLabel!: string;
  @IsString() @MinLength(2) @MaxLength(160) occupation!: string;
  @IsString() @MinLength(2) @MaxLength(160) location!: string;
  @IsInt() @Min(1) target!: number;
  @IsDateString() deadline!: string;
  @IsUUID() occupationCatalogVersionId!: string;
  @IsOptional() @IsString() @MaxLength(160) salary?: string;
  @IsOptional() @IsString() @MaxLength(120) contractType?: string;
  @IsOptional() @IsString() @MaxLength(40) japaneseLevel?: string;
  @IsArray() @IsString({ each: true }) criteria!: string[];
  @IsInt() @Min(1) version!: number;
}

export class UpdateOrderRequirementDto {
  @IsInt() @Min(1) version!: number;
  @IsUUID() occupationCatalogVersionId!: string;
  @IsString() @MinLength(2) @MaxLength(160) occupation!: string;
  @IsArray() @IsString({ each: true }) criteria!: string[];
}

export class OrderStatusUpdateDto {
  @IsEnum(JOB_ORDER_STATUSES) status!: typeof JOB_ORDER_STATUSES[number];
  @IsInt() @Min(1) version!: number;
  @IsString() @MinLength(1) @MaxLength(1000) reasonCode!: string;
}
