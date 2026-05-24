import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  role: 'CUSTOMER' | 'CAREGIVER' | 'ADMIN';
  location?: {
    lat: number;
    lng: number;
    address?: string;
  };
  phone?: string;
  avatar?: string;
  isVerified?: boolean;
  googleId?: string;
  address?: string;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['CUSTOMER', 'CAREGIVER', 'ADMIN'], default: 'CUSTOMER' },
  location: {
    lat: Number,
    lng: Number,
    address: String
  },
  phone: String,
  avatar: String,
  isVerified: { type: Boolean, default: false },
  googleId: String,
  address: String,
}, { timestamps: true });

export const User = mongoose.model<IUser>('User', userSchema);
