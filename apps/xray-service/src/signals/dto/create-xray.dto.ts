import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateXrayDto {
  @IsString()
  @ApiProperty({
    description: 'The ID of the device that generated the signal',
    example: '1234567890',
  })
  deviceId: string;

  @IsDateString()
  @ApiProperty({
    description: 'The time of the signal',
    example: '2021-01-01T00:00:00.000Z',
  })
  time: string;

  @IsNumber()
  @ApiProperty({
    description: 'The length of the signal',
    example: 100,
  })
  dataLength: number;

  @IsNumber()
  @ApiProperty({
    description: 'The volume of the signal',
    example: 100,
  })
  dataVolume: number;

  @IsNumber()
  @IsOptional()
  @ApiProperty({
    description: 'The kV of the signal',
    example: 100,
  })
  kV?: number;

  @IsNumber()
  @IsOptional()
  @ApiProperty({
    description: 'The mA of the signal',
    example: 100,
  })
  mA?: number;

  @IsNumber()
  @IsOptional()
  @ApiProperty({
    description: 'The exposure time of the signal',
    example: 100,
  })
  exposureTime?: number;

  @IsString()
  @IsOptional()
  @ApiProperty({
    description: 'The projection type of the signal',
    example: 'frontal',
  })
  projectionType?: string;
}
