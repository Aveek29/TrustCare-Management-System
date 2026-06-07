import { Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { ScrapingLog } from '../models/ScrapingLog';
import { scrapePublicSource } from '../services/sampleScraper';
import { upsertFacilities, logScrapingRun, updateAggregationMetrics } from '../services/bulkWriteService';
import { isRedisAvailable } from '../queues/queueSetup';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

export function createDiscoveryWorker(): Worker | null {
  if (!isRedisAvailable()) return null;

  const connection = new IORedis(REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    retryStrategy: (times) => Math.min(times * 100, 3000),
  });
  connection.on('error', () => {});

  const worker = new Worker('facility-discovery', async (job: Job) => {
    const { sourceName } = job.data;
    const startedAt = Date.now();
    const jobId = job.id || 'unknown';

    const logEntry = await logScrapingRun({
      jobId,
      jobType: 'facility-discovery',
      sourceName: sourceName || 'unknown',
      status: 'RUNNING',
    });

    try {
      const scrapedData = await scrapePublicSource(sourceName || 'sample-hospital-directory');
      const result = await upsertFacilities(scrapedData, sourceName || 'sample-hospital-directory');
      const duration = Date.now() - startedAt;

      await ScrapingLog.findByIdAndUpdate(logEntry._id, {
        status: 'COMPLETED',
        recordsFound: result.recordsFound,
        recordsInserted: result.recordsInserted,
        duplicatesSkipped: result.duplicatesSkipped || 0,
        errorCount: result.errors,
        errorMessages: result.errorMessages,
        completedAt: new Date(),
        duration,
      });

      await updateAggregationMetrics(result, 'facility-discovery');
      return result;
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
