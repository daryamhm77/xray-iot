import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsNumber, IsOptional, IsString } from 'class-validator';

export class UpdateXrayDto {
  @IsString()
  @IsOptional()
  @ApiProperty({
    description: 'The ID of the device that generated the signal',
    example: '1234567890',
    required: false,
  })
  deviceId?: string;

  @IsDateString()
  @IsOptional()
  @ApiProperty({
    description: 'The time of the signal',
    example: '2021-01-01T00:00:00.000Z',
    required: false,
  })
  time?: string;

  @IsNumber()
  @IsOptional()
  @ApiProperty({
    description: 'The length of the signal',
    example: 100,
    required: false,
  })
  dataLength?: number;

  @IsNumber()
  @IsOptional()
  @ApiProperty({
    description: 'The volume of the signal',
    example: 100,
    required: false,
  })
  dataVolume?: number;

  @IsNumber()
  @IsOptional()
  @ApiProperty({
    description: 'Kilovoltage - X-ray tube voltage',
    example: 100,
    required: false,
  })
  kV?: number;

  @IsNumber()
  @IsOptional()
  @ApiProperty({
    description: 'Milliamperage - X-ray tube current',
    example: 100,
    required: false,
  })
  mA?: number;

  @IsNumber()
  @IsOptional()
  @ApiProperty({
    description: 'Exposure time in milliseconds',
    example: 100,
    required: false,
  })
  exposureTime?: number;

  @IsString()
  @IsOptional()
  @ApiProperty({
    description: 'Projection type (e.g., AP, PA, Lateral, frontal)',
    example: 'frontal',
    required: false,
  })
  projectionType?: string;

  // Add coordinate and speed fields for IoT device tracking
  @IsNumber()
  @IsOptional()
  @ApiProperty({
    description: 'GPS latitude coordinate of the device',
    example: 51.339764,
    required: false,
  })
  latitude?: number;

  @IsNumber()
  @IsOptional()
  @ApiProperty({
    description: 'GPS longitude coordinate of the device',
    example: 12.339223833333334,
    required: false,
  })
  longitude?: number;

  @IsNumber()
  @IsOptional()
  @ApiProperty({
    description: 'Device movement speed',
    example: 1.2038000000000002,
    required: false,
  })
  speed?: number;
}
