import mongoose, { Document, Schema } from 'mongoose';

export interface IBooking extends Document {
  customerId: mongoose.Types.ObjectId;
  caregiverId: mongoose.Types.ObjectId;
  date: Date;
  hours: number;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'COMPLETED' | 'CANCELLED';
  totalAmount: number;
  notes?: string;
  address?: string;
  paymentId?: string;
  paymentStatus: 'PENDING' | 'ESCROW' | 'PAID_OUT' | 'REFUNDED';
  createdAt: Date;
  updatedAt: Date;
}

const bookingSchema = new Schema<IBooking>({
  customerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  caregiverId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: Date, required: true },
  hours: { type: Number, required: true },
  status: { 
    type: String, 
    enum: ['PENDING', 'ACCEPTED', 'REJECTED', 'COMPLETED', 'CANCELLED'], 
    default: 'PENDING' 
  },
  totalAmount: { type: Number, required: true },
  notes: String,
  address: String,
  paymentId: String,
  paymentStatus: { 
    type: String, 
    enum: ['PENDING', 'ESCROW', 'PAID_OUT', 'REFUNDED'], 
    default: 'PENDING' 
  }
}, { timestamps: true });

export const Booking = mongoose.model<IBooking>('Booking', bookingSchema);
