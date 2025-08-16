import { Test, TestingModule } from '@nestjs/testing';
import { ProducerController } from './producer.controller';
import { ProducerService, XrayPayload } from './producer.service';
import { SendXrayDto } from './dto/send-xray.dto';

describe('ProducerController', () => {
  let controller: ProducerController;
  let service: jest.Mocked<ProducerService>;

  const mockProducerService = {
    sendSample: jest.fn(),
    sendBatch: jest.fn(),
    generateSample: jest.fn(),
  };

  const mockXrayPayload: XrayPayload = {
    deviceId: 'device-001',
    time: '2024-01-01T10:00:00.000Z',
    dataLength: 1024,
    dataVolume: 2048,
    kV: 100,
    mA: 200,
    exposureTime: 100,
    projectionType: 'AP',
  };

  // Helper functions to reduce repetition
  const createSendXrayDto = (
    overrides: Partial<SendXrayDto> = {},
  ): SendXrayDto => ({
    deviceId: 'device-001',
    ...overrides,
  });

  const createMockXrayPayload = (
    overrides: Partial<XrayPayload> = {},
  ): XrayPayload => ({
    ...mockXrayPayload,
    ...overrides,
  });

  const expectSuccessResponse = (result: any) => {
    expect(result).toEqual({ success: true });
  };

  const expectBatchSuccessResponse = (result: any, expectedCount: number) => {
    expect(result).toEqual({ success: true, count: expectedCount });
  };

  const expectServiceCall = (method: keyof typeof service, ...args: any[]) => {
    expect(service[method]).toHaveBeenCalledWith(...args);
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProducerController],
      providers: [
        {
          provide: ProducerService,
          useValue: mockProducerService,
        },
      ],
    }).compile();

    controller = module.get<ProducerController>(ProducerController);
    service = module.get(ProducerService);

    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe('health', () => {
    const timestampRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

    it('should return health status', () => {
      const result = controller.health();

      expect(result).toEqual({
        status: 'ok',
        ts: expect.stringMatching(timestampRegex),
      });
    });

    it('should return different timestamps on multiple calls', () => {
      const result1 = controller.health();
      const result2 = controller.health();

      expect(result1.status).toBe('ok');
      expect(result2.status).toBe('ok');
      expect(result1.ts).toMatch(timestampRegex);
      expect(result2.ts).toMatch(timestampRegex);
    });
  });

  describe('send', () => {
    it('should send x-ray sample with minimal data', () => {
      const sendXrayDto = createSendXrayDto();

      const result = controller.send(sendXrayDto);

      expectServiceCall('sendSample', sendXrayDto.deviceId, sendXrayDto);
      expectSuccessResponse(result);
    });

    it('should send x-ray sample with all optional fields', () => {
      const sendXrayDto = createSendXrayDto({
        deviceId: 'device-002',
        kV: 120,
        mA: 300,
        exposureTime: 150,
        projectionType: 'Lateral',
      });

      const result = controller.send(sendXrayDto);

      expectServiceCall('sendSample', sendXrayDto.deviceId, sendXrayDto);
      expectSuccessResponse(result);
    });

    it('should pass DTO as overrides to service', () => {
      const sendXrayDto = createSendXrayDto({
        deviceId: 'device-003',
        kV: 90,
        projectionType: 'PA',
      });

      controller.send(sendXrayDto);

      expectServiceCall(
        'sendSample',
        'device-003',
        expect.objectContaining({
          deviceId: 'device-003',
          kV: 90,
          projectionType: 'PA',
        }),
      );
    });
  });

  describe('sendBatch', () => {
    const testBatchScenarios = [
      { count: undefined, expected: 5, description: 'default count' },
      { count: '10', expected: 10, description: 'specified count' },
      { count: 'invalid', expected: 5, description: 'invalid count' },
      { count: '0', expected: 0, description: 'zero count' },
      { count: '-5', expected: -5, description: 'negative count' },
      { count: '3.7', expected: 3.7, description: 'decimal count' },
    ];

    beforeEach(() => {
      service.sendBatch.mockResolvedValue();
    });

    testBatchScenarios.forEach(({ count, expected, description }) => {
      it(`should handle ${description}`, async () => {
        const deviceId = `device-${Math.random().toString(36).substr(2, 9)}`;

        const result = await controller.sendBatch(deviceId, count);

        expectServiceCall('sendBatch', deviceId, expected);
        expectBatchSuccessResponse(result, expected);
      });
    });

    it('should handle service errors', async () => {
      const deviceId = 'device-011';
      const serviceError = new Error('RabbitMQ connection failed');
      service.sendBatch.mockRejectedValue(serviceError);

      await expect(controller.sendBatch(deviceId)).rejects.toThrow(
        'RabbitMQ connection failed',
      );
    });
  });

  describe('preview', () => {
    it('should return generated sample for device', () => {
      const deviceId = 'device-012';
      service.generateSample.mockReturnValue(mockXrayPayload);

      const result = controller.preview(deviceId);

      expectServiceCall('generateSample', deviceId);
      expect(result).toBe(mockXrayPayload);
    });

    it('should call service with correct device ID', () => {
      const deviceId = 'special-device-123';
      const customPayload = createMockXrayPayload({ deviceId });
      service.generateSample.mockReturnValue(customPayload);

      const result = controller.preview(deviceId);

      expectServiceCall('generateSample', deviceId);
      expect(result.deviceId).toBe(deviceId);
    });

    it('should return different samples for different devices', () => {
      const device1 = 'device-001';
      const device2 = 'device-002';
      const payload1 = createMockXrayPayload({ deviceId: device1, kV: 100 });
      const payload2 = createMockXrayPayload({ deviceId: device2, kV: 120 });

      service.generateSample
        .mockReturnValueOnce(payload1)
        .mockReturnValueOnce(payload2);

      const result1 = controller.preview(device1);
      const result2 = controller.preview(device2);

      expectServiceCall('generateSample', device1);
      expectServiceCall('generateSample', device2);
      expect(result1.deviceId).toBe(device1);
      expect(result2.deviceId).toBe(device2);
      expect(result1.kV).toBe(100);
      expect(result2.kV).toBe(120);
    });
  });

  describe('integration', () => {
    it('should handle multiple operations in sequence', async () => {
      const deviceId = 'device-013';

      // Health check
      const healthResult = controller.health();
      expect(healthResult.status).toBe('ok');

      // Preview
      service.generateSample.mockReturnValue(mockXrayPayload);
      const previewResult = controller.preview(deviceId);
      expect(previewResult).toBe(mockXrayPayload);

      // Send single
      const sendResult = controller.send({ deviceId });
      expectSuccessResponse(sendResult);

      // Send batch
      service.sendBatch.mockResolvedValue();
      const batchResult = await controller.sendBatch(deviceId, '3');
      expectBatchSuccessResponse(batchResult, 3);

      expectServiceCall('generateSample', deviceId);
      expectServiceCall('sendSample', deviceId, { deviceId });
      expectServiceCall('sendBatch', deviceId, 3);
    });

    it('should maintain service call consistency', () => {
      const deviceId = 'device-014';
      const dto = createSendXrayDto({
        deviceId,
        kV: 110,
        mA: 250,
      });

      // Preview should not affect send operations
      service.generateSample.mockReturnValue(mockXrayPayload);
      controller.preview(deviceId);

      // Send should use the DTO data
      controller.send(dto);

      expectServiceCall('generateSample', deviceId);
      expectServiceCall('sendSample', deviceId, dto);
    });
  });
});
