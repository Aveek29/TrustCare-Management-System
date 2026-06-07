import mongoose, { Document, Schema } from 'mongoose';

export interface IScrapingLog extends Document {
  jobId: string;
  jobType: string;
  sourceName: string;
  status: 'RUNNING' | 'COMPLETED' | 'FAILED' | 'PAUSED';
  recordsFound: number;
  recordsInserted: number;
  duplicatesSkipped: number;
  errorCount: number;
  errorMessages: string[];
  startedAt: Date;
  completedAt: Date;
  duration: number;
  metadata: Record<string, any>;
  createdAt: Date;
}

const scrapingLogSchema = new Schema<IScrapingLog>({
  jobId: { type: String, index: true },
  jobType: { type: String, required: true, index: true },
  sourceName: String,
  status: { type: String, enum: ['RUNNING', 'COMPLETED', 'FAILED', 'PAUSED'], default: 'RUNNING' },
  recordsFound: { type: Number, default: 0 },
  recordsInserted: { type: Number, default: 0 },
  duplicatesSkipped: { type: Number, default: 0 },
  errorCount: { type: Number, default: 0 },
  errorMessages: [String],
  startedAt: { type: Date, default: Date.now },
  completedAt: Date,
  duration: { type: Number, default: 0 },
  metadata: { type: Schema.Types.Mixed, default: {} },
}, { timestamps: true });

scrapingLogSchema.index({ createdAt: -1 });
scrapingLogSchema.index({ status: 1 });

export const ScrapingLog = mongoose.model<IScrapingLog>('ScrapingLog', scrapingLogSchema);
