import { Test, TestingModule } from '@nestjs/testing';
import { HttpException, HttpStatus } from '@nestjs/common';
import { Types } from 'mongoose';
import { SignalController } from './signal.controller';
import { SignalService } from './signal.service';
import { CreateXrayDto } from './dto/create-xray.dto';
import { UpdateXrayDto } from './dto/update-xray.dto';
import { XrayData } from './schema/xray-schema';

describe('SignalController', () => {
  let controller: SignalController;
  let service: jest.Mocked<SignalService>;

  const mockXrayData = {
    _id: new Types.ObjectId('507f1f77bcf86cd799439011'),
    deviceId: 'device-001',
    time: new Date('2024-01-01T10:00:00.000Z'),
    dataLength: 1024,
    dataVolume: 2048,
    kV: 100,
    mA: 200,
    exposureTime: 100,
    projectionType: 'AP',
  };

  const baseCreateDto: CreateXrayDto = {
    deviceId: 'device-001',
    time: '2024-01-01T10:00:00.000Z',
    dataLength: 1024,
    dataVolume: 2048,
  };

  const testId = '507f1f77bcf86cd799439011';

  const mockSignalService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    findWithFilters: jest.fn(),
  };

  const createHttpException = (message: string, status: HttpStatus) =>
    new HttpException(message, status);

  const expectServiceCall = (method: keyof SignalService, args?: unknown[]) => {
    const mockMethod = service[method] as jest.Mock;
    if (args) {
      expect(mockMethod).toHaveBeenCalledWith(...args);
    } else {
      expect(mockMethod).toHaveBeenCalled();
    }
  };

  const testErrorHandling = async (
    method: keyof SignalController,
    args: unknown[],
    expectedStatus: HttpStatus,
    errorMessage?: string,
  ) => {
    const serviceError = new Error(errorMessage || 'Service error');
    const mockMethod = service[method] as jest.Mock;
    mockMethod.mockRejectedValue(serviceError);

    const controllerMethod = controller[method] as (
      ...args: unknown[]
    ) => Promise<unknown>;
    await expect(controllerMethod.apply(controller, args)).rejects.toThrow(
      createHttpException(errorMessage || 'Service error', expectedStatus),
    );
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SignalController],
      providers: [
        {
          provide: SignalService,
          useValue: mockSignalService,
        },
      ],
    }).compile();

    controller = module.get<SignalController>(SignalController);
    service = module.get(SignalService);

    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new signal', async () => {
      const createXrayDto: CreateXrayDto = {
        ...baseCreateDto,
        kV: 100,
        mA: 200,
        exposureTime: 100,
        projectionType: 'AP',
      };

      service.create.mockResolvedValue(mockXrayData as XrayData);

      const result = await controller.create(createXrayDto);

      expectServiceCall('create', [createXrayDto]);
      expect(result).toBe(mockXrayData);
    });

    it('should throw HttpException when service fails', async () => {
      await testErrorHandling(
        'create',
        [baseCreateDto],
        HttpStatus.BAD_REQUEST,
        'Database connection failed',
      );
    });

    it('should throw HttpException with generic message when no error message', async () => {
      await testErrorHandling(
        'create',
        [baseCreateDto],
        HttpStatus.BAD_REQUEST,
        '',
      );
    });
  });

  describe('findAll', () => {
    it('should return all signals', async () => {
      const mockSignals = [
        mockXrayData,
        { ...mockXrayData, deviceId: 'device-002' },
      ];
      service.findAll.mockResolvedValue(mockSignals as XrayData[]);

      const result = await controller.findAll();

      expectServiceCall('findAll');
      expect(result).toBe(mockSignals);
    });

    it('should throw HttpException when service fails', async () => {
      await testErrorHandling(
        'findAll',
        [],
        HttpStatus.INTERNAL_SERVER_ERROR,
        'Database query failed',
      );
    });

    it('should throw HttpException with generic message when no error message', async () => {
      await testErrorHandling(
        'findAll',
        [],
        HttpStatus.INTERNAL_SERVER_ERROR,
        '',
      );
    });
  });

  describe('findWithFilters', () => {
    const testFilters = {
      startDate: '2024-01-01T00:00:00.000Z',
      endDate: '2024-01-02T00:00:00.000Z',
      deviceId: 'device-001',
      projectionType: 'AP',
    };

    it('should return filtered signals with all parameters', async () => {
      const mockSignals = [mockXrayData];
      service.findWithFilters.mockResolvedValue(mockSignals as XrayData[]);

      const result = await controller.findWithFilters(
        testFilters.startDate,
        testFilters.endDate,
        testFilters.deviceId,
        testFilters.projectionType,
      );

      expectServiceCall('findWithFilters', [
        {
          startDate: new Date(testFilters.startDate),
          endDate: new Date(testFilters.endDate),
          deviceId: testFilters.deviceId,
          projectionType: testFilters.projectionType,
        },
      ]);
      expect(result).toBe(mockSignals);
    });

    it('should handle partial filters', async () => {
      const mockSignals = [mockXrayData];
      const deviceId = 'device-001';

      service.findWithFilters.mockResolvedValue(mockSignals as XrayData[]);

      const result = await controller.findWithFilters(
        undefined,
        undefined,
        deviceId,
        undefined,
      );

      expectServiceCall('findWithFilters', [{ deviceId }]);
      expect(result).toBe(mockSignals);
    });

    it('should handle no filters', async () => {
      const mockSignals = [mockXrayData];
      service.findWithFilters.mockResolvedValue(mockSignals as XrayData[]);

      const result = await controller.findWithFilters();

      expectServiceCall('findWithFilters', [{}]);
      expect(result).toBe(mockSignals);
    });

    it('should throw HttpException when service fails', async () => {
      await testErrorHandling(
        'findWithFilters',
        ['2024-01-01'],
        HttpStatus.INTERNAL_SERVER_ERROR,
        'Filter query failed',
      );
    });
  });

  describe('findOne', () => {
    it('should return a signal by id', async () => {
      service.findOne.mockResolvedValue(mockXrayData as XrayData);

      const result = await controller.findOne(testId);

      expectServiceCall('findOne', [testId]);
      expect(result).toBe(mockXrayData);
    });

    it('should throw HttpException when service fails', async () => {
      await testErrorHandling(
        'findOne',
        [testId],
        HttpStatus.INTERNAL_SERVER_ERROR,
        'Signal not found',
      );
    });
  });

  describe('update', () => {
    it('should update a signal', async () => {
      const updateXrayDto: UpdateXrayDto = {
        kV: 120,
        mA: 250,
      };

      const updatedSignal = { ...mockXrayData, ...updateXrayDto };
      service.update.mockResolvedValue(updatedSignal as XrayData);

      const result = await controller.update(testId, updateXrayDto);

      expectServiceCall('update', [testId, updateXrayDto]);
      expect(result).toBe(updatedSignal);
    });

    it('should throw HttpException when service fails', async () => {
      const updateXrayDto: UpdateXrayDto = { kV: 120 };
      await testErrorHandling(
        'update',
        [testId, updateXrayDto],
        HttpStatus.INTERNAL_SERVER_ERROR,
        'Update failed',
      );
    });
  });

  describe('remove', () => {
    it('should delete a signal', async () => {
      service.remove.mockResolvedValue(undefined);

      const result = await controller.remove(testId);

      expectServiceCall('remove', [testId]);
      expect(result).toEqual({ message: 'Signal deleted successfully' });
    });

    it('should throw HttpException when service fails', async () => {
      await testErrorHandling(
        'remove',
        [testId],
        HttpStatus.INTERNAL_SERVER_ERROR,
        'Delete failed',
      );
    });
  });
});
