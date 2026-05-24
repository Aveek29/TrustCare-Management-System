import mongoose, { Schema, Document } from 'mongoose';

export interface IPayment extends Document {
  bookingId: mongoose.Types.ObjectId;
  transactionId: string;
  amount: number;
  status: 'ESCROW' | 'RELEASED' | 'REFUNDED' | 'PENDING';
  paymentMethod?: string;
  customerId: mongoose.Types.ObjectId;
  caregiverId: mongoose.Types.ObjectId;
  createdAt: Date;
}

const PaymentSchema = new Schema<IPayment>({
  bookingId: { type: Schema.Types.ObjectId, ref: 'Booking' },
  transactionId: { type: String, required: true, unique: true },
  amount: { type: Number, required: true },
  status: { 
    type: String, 
    enum: ['ESCROW', 'RELEASED', 'REFUNDED', 'PENDING'],
    default: 'PENDING'
  },
  paymentMethod: String,
  customerId: { type: Schema.Types.ObjectId, ref: 'User' },
  caregiverId: { type: Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now }
});

export const Payment = mongoose.model<IPayment>('Payment', PaymentSchema);
