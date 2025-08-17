import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { XrayConsumer } from './xray-consumer';
import { SignalService } from '../signals/signal.service';
import { RmqService } from '@app/common/rmq/rmq.service';
import { XrayData } from '../signals/schema/xray-schema';

describe('XrayConsumer', () => {
  let consumer: XrayConsumer;
  let signalService: jest.Mocked<SignalService>;
  let rmqService: jest.Mocked<RmqService>;

  const createTestPayload = (overrides = {}) => ({
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

  const createTestDeviceId = (suffix = '001') => `device-${suffix}`;

  const mockSignalService = {
    processAndSaveSignal: jest.fn(),
  };

  const mockRmqService = {
    consume: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        XrayConsumer,
        {
          provide: SignalService,
          useValue: mockSignalService,
        },
        {
          provide: RmqService,
          useValue: mockRmqService,
        },
      ],
    }).compile();

    consumer = module.get<XrayConsumer>(XrayConsumer);
    signalService = module.get(SignalService);
    rmqService = module.get(RmqService);

    jest.clearAllMocks();

    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('onApplicationBootstrap', () => {
    it('should set up queue consumer', () => {
      consumer.onApplicationBootstrap();

      expect(rmqService.consume).toHaveBeenCalledWith(
        'xray_queue',
        expect.any(Function),
      );
    });
  });

  describe('message processing', () => {
    let messageHandler: (payload: unknown) => Promise<void>;

    beforeEach(() => {
      consumer.onApplicationBootstrap();
      messageHandler = rmqService.consume.mock.calls[0][1];
    });

    it('should process valid x-ray message successfully', async () => {
      const payload = createTestPayload();
      signalService.processAndSaveSignal.mockResolvedValue(
        payload as unknown as XrayData,
      );

      await messageHandler(payload);

      expect(signalService.processAndSaveSignal).toHaveBeenCalledWith(
        expect.objectContaining({
          deviceId: payload.deviceId,
          time: payload.time,
          dataLength: payload.dataLength,
          dataVolume: payload.dataVolume,
        }),
      );
    });

    it('should calculate dataLength if not provided', async () => {
      const payload = createTestPayload({
        deviceId: createTestDeviceId('002'),
        dataLength: undefined,
      });
      const { dataLength, ...payloadWithoutDataLength } = payload;

      signalService.processAndSaveSignal.mockResolvedValue({} as XrayData);
      await messageHandler(payload);

      expect(signalService.processAndSaveSignal).toHaveBeenCalledWith(
        expect.objectContaining({
          deviceId: payload.deviceId,
          dataLength: expect.any(Number) as number | undefined,
        }),
      );

      const calledWith = signalService.processAndSaveSignal.mock.calls[0][0];
      expect(calledWith.dataLength).toBeGreaterThan(0);
    });

    it('should handle valid payload without dataLength', async () => {
      const payload = {
        deviceId: 'device-003',
        time: '2024-01-01T10:00:00.000Z',
        dataVolume: 2048,
      };

      signalService.processAndSaveSignal.mockResolvedValue({} as XrayData);

      await messageHandler(payload);

      expect(signalService.processAndSaveSignal).toHaveBeenCalledWith(
        expect.objectContaining({
          deviceId: 'device-003',
          dataLength: expect.any(Number) as number | undefined,
        }),
      );
    });

    it('should handle payload with all optional fields', async () => {
      const payload = {
        deviceId: 'device-004',
        time: '2024-01-01T10:00:00.000Z',
        dataLength: 1024,
        dataVolume: 2048,
        kV: 100,
        mA: 200,
        exposureTime: 150,
        projectionType: 'AP',
      };

      signalService.processAndSaveSignal.mockResolvedValue({} as XrayData);

      await messageHandler(payload);

      expect(signalService.processAndSaveSignal).toHaveBeenCalledWith(
        expect.objectContaining({
          deviceId: 'device-004',
          kV: 100,
          mA: 200,
          projectionType: 'AP',
        }),
      );
    });

    it('should log successful processing', async () => {
      const validPayload = {
        deviceId: 'device-005',
        time: '2024-01-01T10:00:00.000Z',
        dataLength: 1024,
        dataVolume: 2048,
      };

      const logSpy = jest.spyOn(Logger.prototype, 'log');
      signalService.processAndSaveSignal.mockResolvedValue({} as XrayData);

      await messageHandler(validPayload);

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          `Received x-ray data from device: ${validPayload.deviceId}`,
        ),
      );
    });

    it('should handle invalid JSON payload', async () => {
      const invalidPayload = 'invalid-json-string';
      const errorSpy = jest.spyOn(Logger.prototype, 'error');

      await messageHandler(invalidPayload);

      expect(signalService.processAndSaveSignal).not.toHaveBeenCalled();
      expect(errorSpy).toHaveBeenCalledWith(
        'Error processing x-ray message',
        expect.any(Error),
      );
    });

    it('should handle payload without deviceId', async () => {
      const invalidPayload = {
        time: '2024-01-01T10:00:00.000Z',
        dataLength: 1024,
        dataVolume: 2048,
      };

      const errorSpy = jest.spyOn(Logger.prototype, 'error');

      await messageHandler(invalidPayload);

      expect(signalService.processAndSaveSignal).not.toHaveBeenCalled();
      expect(errorSpy).toHaveBeenCalledWith(
        'Error processing x-ray message',
        expect.any(Error),
      );
    });

    it('should handle null payload', async () => {
      const errorSpy = jest.spyOn(Logger.prototype, 'error');

      await messageHandler(null);

      expect(signalService.processAndSaveSignal).not.toHaveBeenCalled();
      expect(errorSpy).toHaveBeenCalledWith(
        'Error processing x-ray message',
        expect.any(Error),
      );
    });

    it('should handle undefined payload', async () => {
      const errorSpy = jest.spyOn(Logger.prototype, 'error');

      await messageHandler(undefined);

      expect(signalService.processAndSaveSignal).not.toHaveBeenCalled();
      expect(errorSpy).toHaveBeenCalledWith(
        'Error processing x-ray message',
        expect.any(Error),
      );
    });

    it('should handle service processing errors', async () => {
      const validPayload = {
        deviceId: 'device-006',
        time: '2024-01-01T10:00:00.000Z',
        dataLength: 1024,
        dataVolume: 2048,
      };

      const processingError = new Error('Database connection failed');
      signalService.processAndSaveSignal.mockRejectedValue(processingError);

      const errorSpy = jest.spyOn(Logger.prototype, 'error');

      await messageHandler(validPayload);

      expect(errorSpy).toHaveBeenCalledWith(
        'Error processing x-ray message',
        processingError,
      );
    });

    it('should handle complex x-ray data with all optional fields', async () => {
      const complexPayload = {
        deviceId: 'device-007',
        time: '2024-01-01T10:00:00.000Z',
        dataLength: 2048,
        dataVolume: 4096,
        kV: 120,
        mA: 300,
        exposureTime: 150,
        projectionType: 'Lateral',
        additionalField: 'should be ignored',
      };

      signalService.processAndSaveSignal.mockResolvedValue({} as XrayData);

      await messageHandler(complexPayload);

      expect(signalService.processAndSaveSignal).toHaveBeenCalledWith(
        expect.objectContaining({
          deviceId: complexPayload.deviceId,
          time: complexPayload.time,
          dataLength: complexPayload.dataLength,
          dataVolume: complexPayload.dataVolume,
          kV: complexPayload.kV,
          mA: complexPayload.mA,
          exposureTime: complexPayload.exposureTime,
          projectionType: complexPayload.projectionType,
        }),
      );
    });

    it('should handle payload with numeric string values', async () => {
      const payloadWithStringNumbers = {
        deviceId: 'device-008',
        time: '2024-01-01T10:00:00.000Z',
        dataLength: '1024',
        dataVolume: '2048',
        kV: '100',
        mA: '200',
      };

      signalService.processAndSaveSignal.mockResolvedValue({} as XrayData);

      await messageHandler(payloadWithStringNumbers);

      expect(signalService.processAndSaveSignal).toHaveBeenCalledWith(
        expect.objectContaining({
          deviceId: payloadWithStringNumbers.deviceId,
          dataLength: 121,
          dataVolume: 0,
          kV: undefined,
          mA: undefined,
        }),
      );
    });
  });

  describe('data validation and transformation', () => {
    let messageHandler: (payload: unknown) => Promise<void>;

    beforeEach(() => {
      consumer.onApplicationBootstrap();
      messageHandler = rmqService.consume.mock.calls[0][1];
      signalService.processAndSaveSignal.mockResolvedValue({} as XrayData);
    });

    it('should preserve valid date strings', async () => {
      const payload = {
        deviceId: 'device-009',
        time: '2024-12-25T15:30:45.123Z',
        dataLength: 1024,
        dataVolume: 2048,
      };

      await messageHandler(payload);

      const calledWith = signalService.processAndSaveSignal.mock.calls[0][0];
      expect(calledWith.time).toBe(payload.time);
    });

    it('should handle different date formats', async () => {
      const payload = {
        deviceId: 'device-010',
        time: '2024-01-01T10:00:00Z',
        dataLength: 1024,
        dataVolume: 2048,
      };

      await messageHandler(payload);

      const calledWith = signalService.processAndSaveSignal.mock.calls[0][0];
      expect(calledWith.time).toBe('2024-01-01T10:00:00.000Z');
    });
  });
});
