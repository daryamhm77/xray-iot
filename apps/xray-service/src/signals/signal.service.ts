import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CreateXrayDto } from './dto/create-xray.dto';
import { UpdateXrayDto } from './dto/update-xray.dto';
import { XrayData } from './schema/xray-schema';
import {
  PaginationDto,
  paginationGenerator,
  paginationSolver,
} from '@app/common';

@Injectable()
export class SignalService {
  private readonly logger = new Logger(SignalService.name);

  constructor(
    @InjectModel(XrayData.name)
    private readonly xrayModel: Model<XrayData>,
  ) {}

  private validateAndConvertId(id: string): Types.ObjectId {
    if (!Types.ObjectId.isValid(id)) {
      throw new Error(`Invalid ObjectId format: ${id}`);
    }
    return new Types.ObjectId(id);
  }

  private createSuccessResponse<T>(
    message: string,
    data: T,
  ): { message: string; data: T } {
    return { message, data };
  }

  private logSuccess(
    operation: string,
    id: string | Types.ObjectId,
    deviceId: string,
  ): void {
    this.logger.log(
      `✅ Signal ${operation}: ${String(id)} - Device: ${deviceId}`,
    );
  }

  private logError(operation: string, error: Error): void {
    this.logger.error(`Failed to ${operation}: ${error.message}`);
  }

  async processAndSaveSignal(payload: CreateXrayDto): Promise<XrayData> {
    try {
      const processedData = this.processRawSignal(payload);
      return await this.saveSignal(processedData);
    } catch (error) {
      this.logError('process and save signal', error as Error);
      throw error;
    }
  }

  private processRawSignal(payload: CreateXrayDto): CreateXrayDto {
    if (!payload?.deviceId) {
      throw new Error('Invalid x-ray payload: missing deviceId');
    }

    const timeIso = payload.time
      ? new Date(payload.time).toISOString()
      : new Date().toISOString();

    return {
      deviceId: payload.deviceId,
      time: timeIso,
      dataLength: this.calculateDataLength(payload),
      dataVolume: this.calculateDataVolume(payload),
      kV: payload.kV,
      mA: payload.mA,
      exposureTime: payload.exposureTime,
      projectionType: payload.projectionType,
      latitude: payload.latitude,
      longitude: payload.longitude,
      speed: payload.speed,
    };
  }

  private calculateDataLength(payload: CreateXrayDto): number {
    return Buffer.from(JSON.stringify(payload)).length;
  }

  private calculateDataVolume(payload: CreateXrayDto): number {
    return this.calculateDataLength(payload) * 1.5;
  }

  private async saveSignal(processedData: CreateXrayDto): Promise<XrayData> {
    const newSignal = new this.xrayModel(processedData);
    const savedSignal = await newSignal.save();

    this.logger.log(
      `✅ Signal saved: deviceId=${savedSignal.deviceId} time=${savedSignal.time.toISOString()}`,
    );

    return savedSignal;
  }

  async create(
    createXrayDto: CreateXrayDto,
  ): Promise<{ message: string; data: XrayData }> {
    try {
      const createdSignal = new this.xrayModel(createXrayDto);
      const savedSignal = await createdSignal.save();

      this.logSuccess('created', savedSignal._id, savedSignal.deviceId);

      return this.createSuccessResponse(
        'Signal created successfully',
        savedSignal,
      );
    } catch (error) {
      this.logError('create signal', error as Error);
      throw error;
    }
  }

  async findAll(
    filter: Partial<XrayData> = {},
    paginationDto: PaginationDto,
  ): Promise<{ data: XrayData[]; pagination: any }> {
    try {
      const { limit, page, skip } = paginationSolver(paginationDto);
      const [data, total] = await Promise.all([
        this.xrayModel.find(filter).skip(skip).limit(limit).exec(),
        this.xrayModel.countDocuments(filter).exec(),
      ]);

      return {
        data,
        pagination: paginationGenerator(total, page, limit),
      };
    } catch (error) {
      this.logError('fetch signals', error as Error);
      throw error;
    }
  }

  async findOne(id: string): Promise<XrayData> {
    try {
      this.logger.log(`Looking for signal with ID: ${id}`);

      const objectId = this.validateAndConvertId(id);

      let signal = await this.xrayModel.findById(objectId).exec();

      if (!signal) {
        this.logger.log(`findById failed, trying string-based query...`);
        signal = await this.xrayModel.findOne({ _id: id }).exec();
      }

      if (!signal) {
        const totalCount = await this.xrayModel.countDocuments().exec();
        this.logger.log(`Total documents in collection: ${totalCount}`);
        throw new Error(`Signal not found with ID: ${id}`);
      }

      this.logSuccess('found', signal._id, signal.deviceId);
      return signal;
    } catch (error) {
      this.logError('fetch signal', error as Error);
      throw error;
    }
  }

  async update(
    id: string,
    updateXrayDto: UpdateXrayDto,
  ): Promise<{ message: string; data: XrayData }> {
    try {
      this.logger.log(`Attempting to update signal with ID: ${id}`);

      const objectId = this.validateAndConvertId(id);

      let updatedSignal = await this.xrayModel
        .findByIdAndUpdate(objectId, updateXrayDto, { new: true })
        .exec();

      if (!updatedSignal) {
        this.logger.log(
          `findByIdAndUpdate failed, trying string-based query...`,
        );
        const fallbackResult = await this.xrayModel
          .findOneAndUpdate({ _id: id }, updateXrayDto, { new: true })
          .exec();

        if (fallbackResult) {
          updatedSignal = new this.xrayModel(fallbackResult);
        }
      }

      if (!updatedSignal) {
        throw new Error(`Signal not found with ID: ${id} - cannot update`);
      }

      this.logSuccess('updated', updatedSignal._id, updatedSignal.deviceId);

      return this.createSuccessResponse(
        'Signal updated successfully',
        updatedSignal,
      );
    } catch (error) {
      this.logError('update signal', error as Error);
      throw error;
    }
  }

  async remove(id: string): Promise<void> {
    try {
      this.logger.log(`Attempting to delete signal with ID: ${id}`);

      const objectId = this.validateAndConvertId(id);

      let result = await this.xrayModel.findByIdAndDelete(objectId).exec();

      if (!result) {
        this.logger.log(
          `findByIdAndDelete failed, trying string-based query...`,
        );
        const fallbackResult = await this.xrayModel
          .findOneAndDelete({ _id: id })
          .exec();

        if (fallbackResult) {
          result = new this.xrayModel(fallbackResult);
        }
      }

      if (!result) {
        throw new Error(`Signal not found with ID: ${id} - cannot delete`);
      }

      this.logSuccess('deleted', result._id, result.deviceId);
    } catch (error) {
      this.logError('delete signal', error as Error);
      throw error;
    }
  }

  async findWithFilters(filters: {
    startDate?: Date;
    endDate?: Date;
    deviceId?: string;
    projectionType?: string;
    latitude?: number | { $gte: number; $lte: number };
    longitude?: number | { $gte: number; $lte: number };
    speed?: number | { $gte: number; $lte: number };
  }): Promise<XrayData[]> {
    try {
      const query: Record<string, unknown> = {};

      if (filters.startDate || filters.endDate) {
        query.time = {};
        if (filters.startDate) {
          (query.time as Record<string, Date>).$gte = filters.startDate;
        }
        if (filters.endDate) {
          (query.time as Record<string, Date>).$lte = filters.endDate;
        }
      }

      if (filters.deviceId) {
        query.deviceId = filters.deviceId;
      }

      if (filters.projectionType) {
        query.projectionType = filters.projectionType;
      }

      // Handle coordinate filters
      if (filters.latitude) {
        query.latitude = filters.latitude;
      }

      if (filters.longitude) {
        query.longitude = filters.longitude;
      }

      if (filters.speed) {
        query.speed = filters.speed;
      }

      return await this.xrayModel.find(query).exec();
    } catch (error) {
      this.logError('fetch filtered signals', error as Error);
      throw error;
    }
  }
}
