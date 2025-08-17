import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { AbstractDocument } from '@app/common/database/abstract.schema';

@Schema({ versionKey: false, timestamps: true })
export class XrayData extends AbstractDocument {
  @Prop({ required: true })
  deviceId: string;

  @Prop({ required: true })
  time: Date;

  @Prop({ required: true })
  dataLength: number;

  @Prop({ required: true })
  dataVolume: number;

  @Prop({ required: false })
  kV: number; // Kilovoltage - X-ray tube voltage

  @Prop({ required: false })
  mA: number; // Milliamperage - X-ray tube current

  @Prop({ required: false })
  exposureTime: number; // in milliseconds

  @Prop({ type: String })
  projectionType?: string; // e.g., AP, PA, Lateral

  // Add coordinate and speed fields for IoT device tracking
  @Prop({ required: false })
  latitude?: number; // GPS latitude coordinate

  @Prop({ required: false })
  longitude?: number; // GPS longitude coordinate

  @Prop({ required: false })
  speed?: number; // Device movement speed
}

export const XrayDataSchema = SchemaFactory.createForClass(XrayData);
