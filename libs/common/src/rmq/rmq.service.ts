import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as amqp from 'amqplib';
import type { Channel, ConsumeMessage } from 'amqplib';

type AmqpConnection = {
  createChannel: () => Promise<Channel>;
  on: (
    event: 'error' | 'close',
    listener: (...args: unknown[]) => void,
  ) => void;
  close: () => Promise<void>;
};

@Injectable()
export class RmqService implements OnModuleInit, OnModuleDestroy {
  private connection: AmqpConnection;
  private channel: Channel;
  private readonly logger = new Logger(RmqService.name);
  private readonly queues: string[] = ['xray_data_queue', 'xray_queue'];
  private isConnected = false;
  private reconnectAttempts = 0;
  private readonly maxReconnectDelay = 30000; // 30s max backoff

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit(): Promise<void> {
    await this.connect();
  }

  /**
   * Connect to RabbitMQ with exponential backoff on failures.
   */
  private async connect(): Promise<void> {
    const RABBITMQ_URL =
      this.configService.get<string>('RABBIT_MQ_URI') ??
      'amqp://localhost:5672';

    try {
      this.logger.log(`Connecting to RabbitMQ at ${RABBITMQ_URL}...`);
      this.connection = (await amqp.connect(
        RABBITMQ_URL,
      )) as unknown as AmqpConnection;

      this.connection.on('error', (err) => {
        this.logger.error('RabbitMQ connection error', err);
        this.isConnected = false;
      });

      this.connection.on('close', () => {
        void this.handleReconnect();
      });

      this.channel = await this.connection.createChannel();
      await this.channel.prefetch(1);

      for (const queue of this.queues) {
        await this.channel.assertQueue(queue, { durable: true });
        this.logger.log(`✅ Queue asserted: ${queue}`);
      }

      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.logger.log('✅ RabbitMQ connected successfully');
    } catch (error) {
      this.logger.error(
        `Failed to connect to RabbitMQ: ${(error as Error).message}`,
      );
      await this.handleReconnect();
    }
  }

  /**
   * Handle reconnection with exponential backoff.
   */
  private async handleReconnect(): Promise<void> {
    this.isConnected = false;
    this.reconnectAttempts += 1;

    const delay = Math.min(
      this.maxReconnectDelay,
      Math.pow(2, this.reconnectAttempts) * 1000, // exponential
    );

    this.logger.warn(`Reconnecting to RabbitMQ in ${delay / 1000}s...`);
    await new Promise((res) => setTimeout(res, delay));

    await this.connect();
  }

  /**
   * Send a message to a queue.
   */
  sendToQueue<T>(queueName: string, data: T): void {
    if (!this.isConnected || !this.channel) {
      throw new Error(
        'RabbitMQ not connected. Please ensure the service is initialized.',
      );
    }

    try {
      const buffer = Buffer.from(JSON.stringify(data));
      this.channel.sendToQueue(queueName, buffer, { persistent: true });
      this.logger.log(`📤 Sent to queue [${queueName}]`, data);
    } catch (error) {
      this.logger.error(
        `Failed to send message to queue [${queueName}]`,
        error,
      );
      throw error;
    }
  }

  /**
   * Start consuming messages from a queue.
   */
  consume<T>(queueName: string, callback: (msg: T) => Promise<void>): void {
    if (!this.isConnected || !this.channel) {
      throw new Error(
        'RabbitMQ not connected. Please ensure the service is initialized.',
      );
    }

    try {
      void this.channel.consume(queueName, (msg: ConsumeMessage | null) => {
        void (async () => {
          if (msg) {
            try {
              const content: T = JSON.parse(msg.content.toString());
              await callback(content);
              this.channel.ack(msg);
            } catch (parseError) {
              this.logger.error('Failed to process message', parseError);
              this.channel.nack(msg, false, false);
            }
          }
        })();
      });

      this.logger.log(`👂 Listening to queue [${queueName}]`);
    } catch (error) {
      this.logger.error(
        `Failed to start consuming from queue [${queueName}]`,
        error,
      );
      throw error;
    }
  }

  /**
   * Clean up connections on shutdown.
   */
  async onModuleDestroy(): Promise<void> {
    try {
      if (this.channel) {
        await this.channel.close();
        this.logger.log('✅ RabbitMQ channel closed');
      }
      if (this.connection) {
        await this.connection.close();
        this.logger.log('✅ RabbitMQ connection closed');
      }
      this.isConnected = false;
    } catch (error) {
      this.logger.error('Error during RabbitMQ cleanup', error);
    }
  }
}
