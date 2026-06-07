import mongoose, { Document, Schema } from 'mongoose';

export interface IHealthcareFacility extends Document {
  name: string;
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
  phone: string;
  email: string;
  website: string;
  facilityType: string;
  description: string;
  services: string[];
  specialities: string[];
  rating: number;
  reviewCount: number;
  operationalHours: string;
  emergencyServices: boolean;
  externalId: string;
  sourceUrl: string;
  sourceName: string;
  lastSeen: Date;
  createdAt: Date;
  updatedAt: Date;
}

const healthcareFacilitySchema = new Schema<IHealthcareFacility>({
  name: { type: String, required: true, index: true },
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
  phone: String,
  email: String,
  website: String,
  facilityType: { type: String, index: true },
  description: { type: String, default: '' },
  services: [{ type: String, index: true }],
  specialities: [{ type: String, index: true }],
  rating: { type: Number, default: 0 },
  reviewCount: { type: Number, default: 0 },
  operationalHours: String,
  emergencyServices: { type: Boolean, default: false },
  externalId: { type: String, required: true, unique: true },
  sourceUrl: String,
  sourceName: String,
  lastSeen: { type: Date, default: Date.now },
}, { timestamps: true });

healthcareFacilitySchema.index({ 'coordinates.lat': 1, 'coordinates.lng': 1 });
healthcareFacilitySchema.index({ updatedAt: 1 });
healthcareFacilitySchema.index({ name: 'text', 'address.full': 'text', specialities: 'text' });

export const HealthcareFacility = mongoose.model<IHealthcareFacility>('HealthcareFacility', healthcareFacilitySchema);
