import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ValidationPipe,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { SignalService } from './signal.service';
import { CreateXrayDto } from './dto/create-xray.dto';
import { UpdateXrayDto } from './dto/update-xray.dto';
import {
  ApiOperation,
  ApiParam,
  ApiBody,
  ApiResponse,
  ApiConsumes,
  ApiQuery,
} from '@nestjs/swagger';
import { XrayData } from './schema/xray-schema';
import { FormType } from '@app/common/enums/form-type.enum';
import { Pagination } from '@app/common/decorators/pagination.decorator';
import { PaginationDto } from '@app/common/dto/pagination.dto';

@Controller('signals')
export class SignalController {
  constructor(private readonly signalService: SignalService) {}

  @Post()
  @ApiConsumes(FormType.Json, FormType.Urlencoded)
  @ApiOperation({
    summary: 'Create a new signal',
    description:
      'Create a new X-ray signal with all required and optional fields.',
  })
  @ApiBody({
    type: CreateXrayDto,
    description: 'Signal data to create',
    examples: {
      'Basic signal': {
        summary: 'Basic signal with required fields',
        description: 'Create a signal with only the required fields',
        value: {
          deviceId: '1234567890',
          time: '2021-01-01T00:00:00.000Z',
          dataLength: 100,
          dataVolume: 100,
        },
      },
      'Full signal': {
        summary: 'Complete signal with all fields',
        description: 'Create a signal with all available fields',
        value: {
          deviceId: '1234567890',
          time: '2021-01-01T00:00:00.000Z',
          dataLength: 100,
          dataVolume: 100,
          kV: 100,
          mA: 100,
          exposureTime: 100,
          projectionType: 'frontal',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Signal created successfully',
    type: XrayData,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data',
  })
  async create(@Body(ValidationPipe) createXrayDto: CreateXrayDto) {
    try {
      return await this.signalService.create(createXrayDto);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to create signal',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get()
  @ApiOperation({
    summary: 'Get all signals with pagination',
    description: 'Retrieve a paginated list of all X-ray signals.',
  })
  @ApiQuery({
    name: 'page',
    type: Number,
    required: false,
    description: 'Page number for pagination (default: 1)',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    type: Number,
    required: false,
    description: 'Number of items per page (default: 10)',
    example: 10,
  })
  @Pagination()
  async findAll(@Query() paginationDto: PaginationDto) {
    try {
      return await this.signalService.findAll({}, paginationDto);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to fetch signals',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('filter')
  async findWithFilters(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('deviceId') deviceId?: string,
    @Query('projectionType') projectionType?: string,
  ) {
    try {
      const filters = {
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        deviceId,
        projectionType,
      };
      return await this.signalService.findWithFilters(filters);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to fetch filtered signals',
        HttpStatus.BAD_REQUEST,
      );
    }
  }
  @Get(':id')
  async findOne(@Param('id') id: string) {
    try {
      return await this.signalService.findOne(id);
    } catch (error) {
      throw new HttpException(
        error.message || 'Signal not found',
        HttpStatus.NOT_FOUND,
      );
    }
  }

  @Patch(':id')
  @ApiConsumes(FormType.Json, FormType.Urlencoded)
  @ApiOperation({
    summary: 'Update a signal',
    description:
      'Update an existing X-ray signal by ID. Only the fields you want to update need to be provided.',
  })
  @ApiParam({
    name: 'id',
    description: 'The ID of the signal to update',
    example: '689daf9d3caa2bf2e5eb4dba',
  })
  @ApiBody({
    type: UpdateXrayDto,
    description:
      'Signal data to update. Only include the fields you want to change.',
    examples: {
      'Update kV and mA': {
        summary: 'Update voltage and current',
        description: 'Update only the kilovoltage and milliamperage values',
        value: {
          kV: 120,
          mA: 200,
        },
      },
      'Update projection type': {
        summary: 'Update projection type',
        description: 'Change the projection type of the X-ray',
        value: {
          projectionType: 'Lateral',
        },
      },
      'Full update': {
        summary: 'Update all fields',
        description: 'Update all available fields with new values',
        value: {
          deviceId: 'device-002',
          time: '2021-01-02T00:00:00.000Z',
          dataLength: 150,
          dataVolume: 225,
          kV: 110,
          mA: 180,
          exposureTime: 120,
          projectionType: 'PA',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Signal updated successfully',
    type: XrayData,
  })
  @ApiResponse({
    status: 404,
    description: 'Signal not found',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid input data',
  })
  async update(
    @Param('id') id: string,
    @Body(ValidationPipe) updateXrayDto: UpdateXrayDto,
  ) {
    try {
      return await this.signalService.update(id, updateXrayDto);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to update signal',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    try {
      await this.signalService.remove(id);
      return { message: 'Signal deleted successfully' };
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to delete signal',
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}
