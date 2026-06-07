import { Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { ScrapingLog } from '../models/ScrapingLog';
import { HealthcareFacility } from '../models/HealthcareFacility';
import { HealthcareProvider } from '../models/HealthcareProvider';
import { logScrapingRun } from '../services/bulkWriteService';
import { isRedisAvailable } from '../queues/queueSetup';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const STALE_DAYS = parseInt(process.env.SCRAPER_STALE_DAYS || '30', 10);

export function createCleanupWorker(): Worker | null {
  if (!isRedisAvailable()) return null;

  const connection = new IORedis(REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    retryStrategy: (times) => Math.min(times * 100, 3000),
  });
  connection.on('error', () => {});

  const worker = new Worker('facility-cleanup', async (job: Job) => {
    const startedAt = Date.now();
    const jobId = job.id || 'unknown';
    const cutoff = new Date(Date.now() - STALE_DAYS * 24 * 60 * 60 * 1000);

    const logEntry = await logScrapingRun({
      jobId,
      jobType: 'facility-cleanup',
      sourceName: 'system',
      status: 'RUNNING',
    });

    try {
      const staleFacilities = await HealthcareFacility.deleteMany({ lastSeen: { $lt: cutoff } });
      const staleProviders = await HealthcareProvider.deleteMany({ lastSeen: { $lt: cutoff } });
      const duration = Date.now() - startedAt;

      await ScrapingLog.findByIdAndUpdate(logEntry._id, {
        status: 'COMPLETED',
        recordsFound: staleFacilities.deletedCount + staleProviders.deletedCount,
        recordsInserted: 0,
        duplicatesSkipped: 0,
        errorCount: 0,
        completedAt: new Date(),
        duration,
      });

      return { staleFacilitiesRemoved: staleFacilities.deletedCount, staleProvidersRemoved: staleProviders.deletedCount };
    } catch (error: any) {
      const duration = Date.now() - startedAt;
      await ScrapingLog.findByIdAndUpdate(logEntry._id, {
        status: 'FAILED',
        errorCount: 1,
        errorMessages: [error.message],
        completedAt: new Date(),
        duration,
      });
      throw error;
    }
  }, { connection: connection as any, concurrency: 1 });

  return worker;
}
