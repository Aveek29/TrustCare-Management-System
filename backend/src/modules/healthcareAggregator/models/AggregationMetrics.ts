import mongoose, { Document, Schema } from 'mongoose';

export interface IAggregationMetrics extends Document {
  totalFacilities: number;
  totalProviders: number;
  totalSources: number;
  activeSources: number;
  totalJobsRun: number;
  totalRecordsFound: number;
  totalRecordsInserted: number;
  totalDuplicatesSkipped: number;
  totalErrors: number;
  lastJobRun: Date;
  lastError: string;
  dailyStats: {
    date: string;
    recordsFound: number;
    recordsInserted: number;
    duplicatesSkipped: number;
    errors: number;
  }[];
  updatedAt: Date;
}

const aggregationMetricsSchema = new Schema<IAggregationMetrics>({
  totalFacilities: { type: Number, default: 0 },
  totalProviders: { type: Number, default: 0 },
  totalSources: { type: Number, default: 0 },
  activeSources: { type: Number, default: 0 },
  totalJobsRun: { type: Number, default: 0 },
  totalRecordsFound: { type: Number, default: 0 },
  totalRecordsInserted: { type: Number, default: 0 },
  totalDuplicatesSkipped: { type: Number, default: 0 },
  totalErrors: { type: Number, default: 0 },
  lastJobRun: Date,
  lastError: String,
  dailyStats: [{
    date: String,
    recordsFound: Number,
    recordsInserted: Number,
    duplicatesSkipped: Number,
    errors: Number,
  }],
}, { timestamps: true });

export const AggregationMetrics = mongoose.model<IAggregationMetrics>('AggregationMetrics', aggregationMetricsSchema);
