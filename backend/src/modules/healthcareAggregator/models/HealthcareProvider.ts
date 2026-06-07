import mongoose, { Document, Schema } from 'mongoose';

export interface IHealthcareProvider extends Document {
  name: string;
  title: string;
  specialities: string[];
  education: string[];
  experience: number;
  phone: string;
  email: string;
  facilityId: mongoose.Types.ObjectId;
  facilityName: string;
  address: {
    street: string;
    city: string;
    state: string;
    zip: string;
    full: string;
  };
  coordinates: {
    lat: number;
    lng: number;
  };
  rating: number;
  reviewCount: number;
  externalId: string;
  sourceUrl: string;
  sourceName: string;
  lastSeen: Date;
  createdAt: Date;
  updatedAt: Date;
}

const healthcareProviderSchema = new Schema<IHealthcareProvider>({
  name: { type: String, required: true, index: true },
  title: String,
  specialities: [{ type: String, index: true }],
  education: [String],
  experience: { type: Number, default: 0 },
  phone: String,
  email: String,
  facilityId: { type: Schema.Types.ObjectId, ref: 'HealthcareFacility', index: true },
  facilityName: String,
  address: {
    street: String,
    city: { type: String, index: true },
    state: { type: String, index: true },
    zip: String,
    full: String,
  },
  coordinates: {
    lat: Number,
    lng: Number,
  },
  rating: { type: Number, default: 0 },
  reviewCount: { type: Number, default: 0 },
  externalId: { type: String, required: true, unique: true },
  sourceUrl: String,
  sourceName: String,
  lastSeen: { type: Date, default: Date.now },
}, { timestamps: true });

healthcareProviderSchema.index({ updatedAt: 1 });
healthcareProviderSchema.index({ name: 'text', specialities: 'text' });

export const HealthcareProvider = mongoose.model<IHealthcareProvider>('HealthcareProvider', healthcareProviderSchema);
