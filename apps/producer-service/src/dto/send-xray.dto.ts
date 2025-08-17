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

  // Add coordinate and speed fields for IoT device tracking
  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;

  @IsOptional()
  @IsNumber()
  speed?: number;

  // Raw data field for handling coordinate arrays from IoT devices
  @IsOptional()
  rawData?: any[];
}


