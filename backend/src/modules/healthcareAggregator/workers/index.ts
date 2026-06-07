import { Worker } from 'bullmq';
import { createDiscoveryWorker } from './facilityDiscoveryWorker';
import { createUpdateWorker } from './facilityUpdateWorker';
import { createCleanupWorker } from './facilityCleanupWorker';
import { addDiscoveryJob, addUpdateJob, addCleanupJob, isRedisAvailable } from '../queues/queueSetup';

let discoveryWorker: Worker | null = null;
let updateWorker: Worker | null = null;
let cleanupWorker: Worker | null = null;

const DISCOVERY_INTERVAL = parseInt(process.env.SCRAPER_DISCOVERY_INTERVAL || '21600000', 10);
const UPDATE_INTERVAL = parseInt(process.env.SCRAPER_UPDATE_INTERVAL || '3600000', 10);
const CLEANUP_INTERVAL = parseInt(process.env.SCRAPER_CLEANUP_INTERVAL || '604800000', 10);

let discoveryTimer: NodeJS.Timeout | null = null;
let updateTimer: NodeJS.Timeout | null = null;
let cleanupTimer: NodeJS.Timeout | null = null;

export function initializeWorkers() {
  if (!isRedisAvailable()) {
    console.warn('Redis not available, workers will not be initialized');
    return { discoveryWorker: null, updateWorker: null, cleanupWorker: null };
  }

  discoveryWorker = createDiscoveryWorker();
  updateWorker = createUpdateWorker();
  cleanupWorker = createCleanupWorker();

  if (discoveryWorker) {
    discoveryWorker.on('completed', (job) => {
      console.log(`[Aggregator] Discovery job ${job.id} completed`);
    });
    discoveryWorker.on('failed', (job, err) => {
      console.error(`[Aggregator] Discovery job ${job?.id} failed:`, err.message);
    });
  }
  if (updateWorker) {
    updateWorker.on('completed', (job) => {
      console.log(`[Aggregator] Update job ${job.id} completed`);
    });
    updateWorker.on('failed', (job, err) => {
      console.error(`[Aggregator] Update job ${job?.id} failed:`, err.message);
    });
  }
  if (cleanupWorker) {
    cleanupWorker.on('completed', (job) => {
      console.log(`[Aggregator] Cleanup job ${job.id} completed`);
    });
    cleanupWorker.on('failed', (job, err) => {
      console.error(`[Aggregator] Cleanup job ${job?.id} failed:`, err.message);
    });
  }

  scheduleJobs();

  return { discoveryWorker, updateWorker, cleanupWorker };
}

function scheduleJobs() {
  discoveryTimer = setInterval(() => {
    addDiscoveryJob().catch(err => console.error('[Aggregator] Failed to schedule discovery job:', err));
  }, DISCOVERY_INTERVAL);

  updateTimer = setInterval(() => {
    addUpdateJob().catch(err => console.error('[Aggregator] Failed to schedule update job:', err));
  }, UPDATE_INTERVAL);

  cleanupTimer = setInterval(() => {
    addCleanupJob().catch(err => console.error('[Aggregator] Failed to schedule cleanup job:', err));
  }, CLEANUP_INTERVAL);

  addDiscoveryJob().catch(err => console.error('[Aggregator] Initial discovery job failed:', err));
}

export async function stopWorkers() {
  if (discoveryTimer) clearInterval(discoveryTimer);
  if (updateTimer) clearInterval(updateTimer);
  if (cleanupTimer) clearInterval(cleanupTimer);
  await discoveryWorker?.close();
  await updateWorker?.close();
  await cleanupWorker?.close();
}
