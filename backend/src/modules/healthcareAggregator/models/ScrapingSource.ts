import mongoose, { Document, Schema } from 'mongoose';

export interface IScrapingSource extends Document {
  name: string;
  baseUrl: string;
  category: string;
  isActive: boolean;
  scrapeInterval: number;
  lastScrapedAt: Date;
  totalRecords: number;
  errorCount: number;
  config: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const scrapingSourceSchema = new Schema<IScrapingSource>({
  name: { type: String, required: true, unique: true },
  baseUrl: { type: String, required: true },
  category: { type: String, required: true, index: true },
  isActive: { type: Boolean, default: true },
  scrapeInterval: { type: Number, default: 21600000 },
  lastScrapedAt: Date,
  totalRecords: { type: Number, default: 0 },
  errorCount: { type: Number, default: 0 },
  config: { type: Schema.Types.Mixed, default: {} },
}, { timestamps: true });

export const ScrapingSource = mongoose.model<IScrapingSource>('ScrapingSource', scrapingSourceSchema);
