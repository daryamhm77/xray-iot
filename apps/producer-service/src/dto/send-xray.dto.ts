import { IsNumber, IsOptional, IsString } from 'class-validator';

export class SendXrayDto {
  @IsString()
  deviceId!: string;

  @IsOptional()
  @IsNumber()
  kV?: number;

  @IsOptional()
  @IsNumber()
  mA?: number;

  @IsOptional()
  @IsNumber()
  exposureTime?: number; // ms

  @IsOptional()
  @IsString()
  projectionType?: string;
}


