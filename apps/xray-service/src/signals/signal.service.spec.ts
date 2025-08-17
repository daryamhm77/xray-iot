import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Logger } from '@nestjs/common';
import { SignalService } from './signal.service';
import { XrayData } from './schema/xray-schema';
import { CreateXrayDto } from './dto/create-xray.dto';
import { UpdateXrayDto } from './dto/update-xray.dto';

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

  const mockModel = Object.assign(
    jest.fn().mockImplementation(() => ({
      save: jest.fn().mockResolvedValue(mockXrayData),
    })),
    {
      find: jest.fn(),
      findById: jest.fn(),
      findByIdAndUpdate: jest.fn(),
      findByIdAndDelete: jest.fn(),
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

      expect(mockModel).toHaveBeenCalledWith(
        expect.objectContaining({
          deviceId: dto.deviceId,
          time: dto.time,
        }),
      );
      expect(mockDocument.save).toHaveBeenCalled();
      expect(result).toBe(mockXrayData);
    });

    it('should throw error for invalid payload', async () => {
      const invalidDto = createXrayDto({
        deviceId: undefined,
      });

      await expect(service.processAndSaveSignal(invalidDto)).rejects.toThrow(
        'Invalid x-ray payload: missing deviceId',
      );
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
      expect(result).toBe(mockXrayData);
    });
  });

  describe('findAll', () => {
    it('should return all signals without filter', async () => {
      const mockSignals = [
        createMockXrayData(),
        createMockXrayData({ deviceId: 'device-002' }),
      ];
      mockModel.find.mockReturnValue(mockQueryWithExec(mockSignals) as any);

      const result = await service.findAll();

      expect(mockModel.find).toHaveBeenCalledWith({});
      expect(result).toBe(mockSignals);
    });
  });

  describe('findOne', () => {
    const testId = '507f1f77bcf86cd799439011';

    it('should return a signal by id', async () => {
      mockModel.findById.mockReturnValue(
        mockQueryWithExec(mockXrayData) as any,
      );

      const result = await service.findOne(testId);

      expect(mockModel.findById).toHaveBeenCalledWith(testId);
      expect(result).toBe(mockXrayData);
    });

    it('should handle not found', async () => {
      const notFoundId = '507f1f77bcf86cd799439012';
      mockModel.findById.mockReturnValue(mockQueryWithExec(null) as any);

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

      expect(mockModel.findByIdAndUpdate).toHaveBeenCalledWith(
        testId,
        updateDto,
        { new: true },
      );
      expect(result).toBe(updatedSignal);
    });
  });

  describe('remove', () => {
    it('should delete a signal', async () => {
      const testId = '507f1f77bcf86cd799439011';
      mockModel.findByIdAndDelete.mockReturnValue(
        mockQueryWithExec(mockXrayData) as any,
      );

      await service.remove(testId);

      expect(mockModel.findByIdAndDelete).toHaveBeenCalledWith(testId);
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

      expect(mockModel.find).toHaveBeenCalledWith(filters);
      expect(result).toBe(mockSignals);
    });
  });
});
