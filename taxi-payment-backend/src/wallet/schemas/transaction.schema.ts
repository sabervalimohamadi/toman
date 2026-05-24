import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type TransactionDocument = HydratedDocument<Transaction>;

export enum TransactionType {
  DEPOSIT = 'deposit',
  DEDUCT = 'deduct',
  REFUND = 'refund',
}

export enum TransactionStatus {
  SUCCESS = 'success',
  FAILED = 'failed',
}

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
export class Transaction {
  @Prop({ type: Types.ObjectId, ref: 'Wallet', required: true, index: true })
  walletId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ type: String, enum: TransactionType, required: true })
  type: TransactionType;

  @Prop({ required: true, min: 1 })
  amount: number;

  @Prop({ required: true })
  balanceBefore: number;

  @Prop({ required: true })
  balanceAfter: number;

  @Prop()
  description?: string;

  @Prop()
  referenceId?: string;

  @Prop({ type: String, enum: TransactionStatus, default: TransactionStatus.SUCCESS })
  status: TransactionStatus;

  createdAt: Date;
  updatedAt: Date;
}

export const TransactionSchema = SchemaFactory.createForClass(Transaction);

TransactionSchema.index({ referenceId: 1 }, { unique: true, sparse: true });
