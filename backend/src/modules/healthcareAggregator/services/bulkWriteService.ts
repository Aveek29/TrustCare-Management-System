import { HealthcareFacility } from '../models/HealthcareFacility';
import { HealthcareProvider } from '../models/HealthcareProvider';
import { ScrapingLog } from '../models/ScrapingLog';
import { AggregationMetrics } from '../models/AggregationMetrics';
import { generateExternalId } from '../utils/hash';
import { facilitySchema, providerSchema, ValidatedFacility, ValidatedProvider } from '../utils/validators';

const BATCH_SIZE = 100;

export interface BulkWriteResult {
  recordsFound: number;
  recordsInserted: number;
  duplicatesSkipped: number;
  errors: number;
  errorMessages: string[];
}

export async function upsertFacilities(rawData: any[], sourceName: string): Promise<BulkWriteResult> {
  const result: BulkWriteResult = { recordsFound: 0, recordsInserted: 0, duplicatesSkipped: 0, errors: 0, errorMessages: [] };
  const validRecords: ValidatedFacility[] = [];
  for (const item of rawData) {
    try {
      const validated = facilitySchema.parse(item);
      validRecords.push(validated);
    } catch (err: any) {
      result.errors++;
      result.errorMessages.push(`Validation error: ${err.message}`);
    }
  }
  result.recordsFound = rawData.length;
  const batches = [];
  for (let i = 0; i < validRecords.length; i += BATCH_SIZE) {
    batches.push(validRecords.slice(i, i + BATCH_SIZE));
  }
  for (const batch of batches) {
    const operations = batch.map(record => {
      const externalId = generateExternalId(record.name, record.address.full || `${record.address.street}, ${record.address.city}`, sourceName);
      return {
        updateOne: {
          filter: { externalId },
          update: {
            $set: {
              ...record,
              externalId,
              sourceName,
              lastSeen: new Date(),
            },
          },
          upsert: true,
        },
      };
    });
    const writeResult = await HealthcareFacility.bulkWrite(operations, { ordered: false });
    result.recordsInserted += writeResult.upsertedCount || 0;
    result.duplicatesSkipped += (operations.length - (writeResult.upsertedCount || 0));
  }
  return result;
}

export async function upsertProviders(rawData: any[], sourceName: string): Promise<BulkWriteResult> {
  const result: BulkWriteResult = { recordsFound: 0, recordsInserted: 0, duplicatesSkipped: 0, errors: 0, errorMessages: [] };
  const validRecords: ValidatedProvider[] = [];
  for (const item of rawData) {
    try {
      const validated = providerSchema.parse(item);
      validRecords.push(validated);
    } catch (err: any) {
      result.errors++;
      result.errorMessages.push(`Validation error: ${err.message}`);
    }
  }
  result.recordsFound = rawData.length;
  const batches = [];
  for (let i = 0; i < validRecords.length; i += BATCH_SIZE) {
    batches.push(validRecords.slice(i, i + BATCH_SIZE));
  }
  for (const batch of batches) {
    const operations = batch.map(record => {
      const addr = record.address.full || `${record.address.street}, ${record.address.city}`;
      const externalId = generateExternalId(record.name, addr, sourceName);
      return {
        updateOne: {
          filter: { externalId },
          update: {
            $set: {
              ...record,
              externalId,
              sourceName,
              lastSeen: new Date(),
            },
          },
          upsert: true,
        },
      };
    });
    const writeResult = await HealthcareProvider.bulkWrite(operations, { ordered: false });
    result.recordsInserted += writeResult.upsertedCount || 0;
    result.duplicatesSkipped += (operations.length - (writeResult.upsertedCount || 0));
  }
  return result;
}

export async function logScrapingRun(params: {
  jobId: string;
  jobType: string;
  sourceName: string;
  status: 'RUNNING' | 'COMPLETED' | 'FAILED' | 'PAUSED';
  recordsFound?: number;
  recordsInserted?: number;
  duplicatesSkipped?: number;
  errorCount?: number;
  errorMessages?: string[];
  duration?: number;
}) {
  return ScrapingLog.create({
    jobId: params.jobId,
    jobType: params.jobType,
    sourceName: params.sourceName,
    status: params.status,
    recordsFound: params.recordsFound || 0,
    recordsInserted: params.recordsInserted || 0,
    duplicatesSkipped: params.duplicatesSkipped || 0,
    errorCount: params.errorCount || 0,
    errorMessages: params.errorMessages || [],
    startedAt: new Date(),
    completedAt: params.status !== 'RUNNING' ? new Date() : undefined,
    duration: params.duration || 0,
  });
}

export async function updateAggregationMetrics(logResult: BulkWriteResult, jobType: string) {
  const today = new Date().toISOString().split('T')[0];
  const totalFacilities = await HealthcareFacility.countDocuments();
  const totalProviders = await HealthcareProvider.countDocuments();
  const totalSources = 1;
  const activeSources = 1;

  await AggregationMetrics.findOneAndUpdate(
    {},
    {
      $set: {
        totalFacilities,
        totalProviders,
        totalSources,
        activeSources,
        lastJobRun: new Date(),
      },
      $inc: {
        totalJobsRun: 1,
        totalRecordsFound: logResult.recordsFound,
        totalRecordsInserted: logResult.recordsInserted,
        totalDuplicatesSkipped: logResult.duplicatesSkipped || 0,
        totalErrors: logResult.errors,
      },
      $push: {
        dailyStats: {
          $each: [{
            date: today,
            recordsFound: logResult.recordsFound,
            recordsInserted: logResult.recordsInserted,
            duplicatesSkipped: logResult.duplicatesSkipped || 0,
            errors: logResult.errors,
          }],
          $slice: -90,
        },
      },
    },
    { upsert: true }
  );
}
