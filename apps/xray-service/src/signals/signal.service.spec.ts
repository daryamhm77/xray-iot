import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Logger } from '@nestjs/common';
import { SignalService } from './signal.service';
import { XrayData } from './schema/xray-schema';
import { CreateXrayDto } from './dto/create-xray.dto';
import { UpdateXrayDto } from './dto/update-xray.dto';
import { PaginationDto } from '@app/common';
import { Types } from 'mongoose';

describe('SignalService', () => {
  let service: SignalService;

  const createMockXrayData = (overrides = {}) => ({
    _id: '507f1f77bcf86cd799439011',
    deviceId: 'device-001',
    time: new Date('2024-01-01T10:00:00.000Z'),
    dataLength: 1024,
    dataVolume: 2048,
    kV: 100,
    mA: 200,
    exposureTime: 100,
    projectionType: 'AP',
    ...overrides,
  });

  const mockXrayData = createMockXrayData();

  const createXrayDto = (overrides = {}): CreateXrayDto => ({
    deviceId: 'device-001',
    time: '2024-01-01T10:00:00.000Z',
    dataLength: 1024,
    dataVolume: 2048,
    kV: 100,
    mA: 200,
    exposureTime: 100,
    projectionType: 'AP',
    ...overrides,
  });

  const createPaginationDto = (overrides = {}): PaginationDto => ({
    page: 1,
    limit: 10,
    ...overrides,
  });

  // Create a proper mock query chain for Mongoose methods
  const createMockQueryChain = (result: any) => ({
    exec: jest.fn().mockResolvedValue(result),
    skip: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    find: jest.fn().mockReturnThis(),
  });

  const mockModel = Object.assign(
    jest.fn().mockImplementation(() => ({
      save: jest.fn().mockResolvedValue(mockXrayData),
    })),
    {
      find: jest.fn().mockReturnValue(createMockQueryChain([])),
      findById: jest.fn(),
      findByIdAndUpdate: jest.fn(),
      findByIdAndDelete: jest.fn(),
      findOne: jest.fn(),
      findOneAndUpdate: jest.fn(),
      findOneAndDelete: jest.fn(),
      create: jest.fn(),
      countDocuments: jest.fn(),
    }
  );

  const createMockDocument = (
    data = mockXrayData,
    saveResult = mockXrayData,
  ) => ({
    ...data,
    save: jest.fn().mockResolvedValue(saveResult),
  });

  const mockQueryWithExec = (result: any) => ({
    exec: jest.fn().mockResolvedValue(result),
  });

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SignalService,
        {
          provide: getModelToken(XrayData.name),
          useValue: mockModel,
        },
      ],
    }).compile();

    service = module.get<SignalService>(SignalService);

    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('processAndSaveSignal', () => {
    it('should process and save a valid signal', async () => {
      const dto = createXrayDto();
      const mockDocument = createMockDocument();
      mockModel.mockReturnValue(mockDocument);

      const result = await service.processAndSaveSignal(dto);

      // The service processes the data, so we need to check the processed result
      expect(mockModel).toHaveBeenCalledWith(expect.objectContaining({
        deviceId: dto.deviceId,
        kV: dto.kV,
        mA: dto.mA,
        exposureTime: dto.exposureTime,
        projectionType: dto.projectionType,
      }));
      expect(mockDocument.save).toHaveBeenCalled();
      expect(result).toBe(mockXrayData);
    });
  });

  describe('create', () => {
    it('should create a new signal', async () => {
      const dto = createXrayDto({ deviceId: 'device-005' });
      const mockDocument = createMockDocument();
      mockModel.mockReturnValue(mockDocument);

      const result = await service.create(dto);

      expect(mockModel).toHaveBeenCalledWith(dto);
      expect(mockDocument.save).toHaveBeenCalled();
      // Service returns wrapped response, so check the structure
      expect(result).toEqual({
        message: 'Signal created successfully',
        data: mockXrayData,
      });
    });
  });

  describe('findAll', () => {
    it('should return all signals without filter', async () => {
      const mockSignals = [
        createMockXrayData(),
        createMockXrayData({ deviceId: 'device-002' }),
      ];
      
      // Setup the mock to return a proper query chain
      const mockQueryChain = createMockQueryChain(mockSignals);
      mockModel.find.mockReturnValue(mockQueryChain);
      mockModel.countDocuments.mockReturnValue(mockQueryWithExec(2) as any);

      const paginationDto = createPaginationDto();
      const result = await service.findAll({}, paginationDto);

      expect(mockModel.find).toHaveBeenCalledWith({});
      expect(result).toEqual({
        data: mockSignals,
        pagination: {
          totalCount: 2,
          page: 1,
          limit: 10,
          pageCount: 1,
        },
      });
    });
  });

  describe('findOne', () => {
    const testId = '507f1f77bcf86cd799439011';

    it('should return a signal by id', async () => {
      mockModel.findById.mockReturnValue(
        mockQueryWithExec(mockXrayData) as any,
      );

      const result = await service.findOne(testId);

      // The service converts string ID to ObjectId, so we need to check for ObjectId
      expect(mockModel.findById).toHaveBeenCalledWith(expect.any(Types.ObjectId));
      expect(result).toBe(mockXrayData);
    });

    it('should handle not found', async () => {
      const notFoundId = '507f1f77bcf86cd799439012';
      mockModel.findById.mockReturnValue(mockQueryWithExec(null) as any);
      mockModel.findOne.mockReturnValue(mockQueryWithExec(null) as any);
      mockModel.countDocuments.mockReturnValue(mockQueryWithExec(0) as any);

      await expect(service.findOne(notFoundId)).rejects.toThrow(
        'Signal not found',
      );
    });
  });

  describe('update', () => {
    it('should update a signal', async () => {
      const testId = '507f1f77bcf86cd799439011';
      const updateDto: UpdateXrayDto = { kV: 120, mA: 250 };
      const updatedSignal = createMockXrayData(updateDto);

      mockModel.findByIdAndUpdate.mockReturnValue(
        mockQueryWithExec(updatedSignal) as any,
      );

      const result = await service.update(testId, updateDto);

      // The service converts string ID to ObjectId
      expect(mockModel.findByIdAndUpdate).toHaveBeenCalledWith(
        expect.any(Types.ObjectId),
        updateDto,
        { new: true },
      );
      // Service returns wrapped response, so check the structure
      expect(result).toEqual({
        message: 'Signal updated successfully',
        data: updatedSignal,
      });
    });
  });

  describe('remove', () => {
    it('should delete a signal', async () => {
      const testId = '507f1f77bcf86cd799439011';
      mockModel.findByIdAndDelete.mockReturnValue(
        mockQueryWithExec(mockXrayData) as any,
      );

      await service.remove(testId);

      // The service converts string ID to ObjectId
      expect(mockModel.findByIdAndDelete).toHaveBeenCalledWith(expect.any(Types.ObjectId));
    });
  });

  describe('findWithFilters', () => {
    const mockSignals = [createMockXrayData()];

    it('should find signals with date range filter', async () => {
      const filters = {
        startDate: new Date('2024-01-01T00:00:00.000Z'),
        endDate: new Date('2024-01-02T00:00:00.000Z'),
      };
      mockModel.find.mockReturnValue(mockQueryWithExec(mockSignals) as any);

      const result = await service.findWithFilters(filters);

      expect(mockModel.find).toHaveBeenCalledWith({
        time: {
          $gte: filters.startDate,
          $lte: filters.endDate,
        },
      });
      expect(result).toBe(mockSignals);
    });

    it('should find signals with device filter', async () => {
      const filters = { deviceId: 'device-001' };
      mockModel.find.mockReturnValue(mockQueryWithExec(mockSignals) as any);

      const result = await service.findWithFilters(filters);

      expect(mockModel.find).toHaveBeenCalledWith({
        deviceId: 'device-001',
      });
      expect(result).toBe(mockSignals);
    });

    it('should find signals with projection type filter', async () => {
      const filters = { projectionType: 'AP' };
      mockModel.find.mockReturnValue(mockQueryWithExec(mockSignals) as any);

      const result = await service.findWithFilters(filters);

      expect(mockModel.find).toHaveBeenCalledWith({
        projectionType: 'AP',
      });
      expect(result).toBe(mockSignals);
    });

    it('should find signals with multiple filters', async () => {
      const filters = {
        deviceId: 'device-001',
        projectionType: 'AP',
        startDate: new Date('2024-01-01T00:00:00.000Z'),
      };
      mockModel.find.mockReturnValue(mockQueryWithExec(mockSignals) as any);

      const result = await service.findWithFilters(filters);

      expect(mockModel.find).toHaveBeenCalledWith({
        deviceId: 'device-001',
        projectionType: 'AP',
        time: {
          $gte: filters.startDate,
        },
      });
      expect(result).toBe(mockSignals);
    });

    it('should return empty array when no signals found', async () => {
      const filters = { deviceId: 'nonexistent-device' };
      mockModel.find.mockReturnValue(mockQueryWithExec([]) as any);

      const result = await service.findWithFilters(filters);

      expect(mockModel.find).toHaveBeenCalledWith({
        deviceId: 'nonexistent-device',
      });
      expect(result).toEqual([]);
    });
  });
});
