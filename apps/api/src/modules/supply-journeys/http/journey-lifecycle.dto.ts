import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
export class JourneyLifecycleCommandDto { @IsInt() @Min(1) version!: number; @IsOptional() @IsString() @MaxLength(1000) reason?: string; }
