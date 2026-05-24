import mongoose, { Document, Schema } from 'mongoose';

export interface ICaregiverProfile extends Document {
  caregiverId: mongoose.Types.ObjectId;
  hourlyRate: number;
  experienceYears: number;
  skills: string[];
  bio?: string;
  rating: number;
  totalReviews: number;
  isAvailable: boolean;
  isVerified: boolean;
  availability?: {
    monday: boolean;
    tuesday: boolean;
    wednesday: boolean;
    thursday: boolean;
    friday: boolean;
    saturday: boolean;
    sunday: boolean;
  };
  availabilitySchedule?: {
    [key: string]: { start: string; end: string; available: boolean };
  };
  createdAt: Date;
  updatedAt: Date;
}

const caregiverProfileSchema = new Schema<ICaregiverProfile>({
  caregiverId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  hourlyRate: { type: Number, required: true },
  experienceYears: { type: Number, required: true },
  skills: [{ type: String }],
  bio: String,
  rating: { type: Number, default: 0 },
  totalReviews: { type: Number, default: 0 },
  isAvailable: { type: Boolean, default: true },
  isVerified: { type: Boolean, default: false },
  availability: {
    monday: { type: Boolean, default: true },
    tuesday: { type: Boolean, default: true },
    wednesday: { type: Boolean, default: true },
    thursday: { type: Boolean, default: true },
    friday: { type: Boolean, default: true },
    saturday: { type: Boolean, default: false },
    sunday: { type: Boolean, default: false }
  },
  availabilitySchedule: {
    type: Map,
    of: {
      start: String,
      end: String,
      available: Boolean
    }
  }
}, { timestamps: true });

export const CaregiverProfile = mongoose.model<ICaregiverProfile>('CaregiverProfile', caregiverProfileSchema);
