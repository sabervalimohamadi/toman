import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type DriverCodeDocument = HydratedDocument<DriverCode>;

@Schema({
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: (_doc, ret: Record<string, unknown>) => {
      Reflect.deleteProperty(ret, '_id');
      Reflect.deleteProperty(ret, '__v');
      return ret;
    },
  },
})
export class DriverCode {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, unique: true, index: true })
  driverId: Types.ObjectId;

  @Prop({ required: true, unique: true, index: true })
  code: string;

  @Prop({ default: true })
  isActive: boolean;

  createdAt: Date;
  updatedAt: Date;
}

export const DriverCodeSchema = SchemaFactory.createForClass(DriverCode);
