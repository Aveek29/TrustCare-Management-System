import { Queue } from 'bullmq';
import IORedis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

let connection: IORedis | null = null;
let discoveryQueue: Queue | null = null;
let updateQueue: Queue | null = null;
let cleanupQueue: Queue | null = null;
let redisAvailable = false;

async function checkRedisConnection(): Promise<boolean> {
  if (redisAvailable && connection) return true;
  let testConn: IORedis | null = null;
  try {
    testConn = new IORedis(REDIS_URL, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      retryStrategy: () => null,
      lazyConnect: true,
    });
    testConn.on('error', () => {});
    await testConn.connect();
    await testConn.quit();
    testConn = null;
    redisAvailable = true;
    return true;
  } catch {
    redisAvailable = false;
    return false;
  } finally {
    if (testConn) {
      try { testConn.disconnect(); } catch {}
    }
  }
}

function getConnection(): IORedis | null {
  if (!redisAvailable) return null;
  if (!connection) {
    connection = new IORedis(REDIS_URL, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      retryStrategy: (times) => Math.min(times * 100, 3000),
    });
    connection.on('error', (err) => {
      if ((err as any)?.code === 'ECONNREFUSED') {
        redisAvailable = false;
      }
    });
  }
  return connection;
}

export async function initializeQueues() {
  const available = await checkRedisConnection();
  if (!available) {
    console.warn('Redis not available, queues will not be initialized');
    return { discoveryQueue: null, updateQueue: null, cleanupQueue: null };
  }
  const conn = getConnection();
  if (!conn) {
    return { discoveryQueue: null, updateQueue: null, cleanupQueue: null };
  }
  discoveryQueue = new Queue('facility-discovery', { connection: conn as any });
  updateQueue = new Queue('facility-update', { connection: conn as any });
  cleanupQueue = new Queue('facility-cleanup', { connection: conn as any });
  return { discoveryQueue, updateQueue, cleanupQueue };
}

export function getDiscoveryQueue(): Queue | null {
  return discoveryQueue;
}

export function getUpdateQueue(): Queue | null {
  return updateQueue;
}

export function getCleanupQueue(): Queue | null {
  return cleanupQueue;
}

export async function addDiscoveryJob(data?: any) {
  if (!discoveryQueue) return null;
  return discoveryQueue.add('discover-facilities', data || { sourceName: 'sample-hospital-directory' }, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
  });
}

export async function addUpdateJob() {
  if (!updateQueue) return null;
  return updateQueue.add('update-facilities', {}, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
  });
}

export async function addCleanupJob() {
  if (!cleanupQueue) return null;
  return cleanupQueue.add('cleanup-stale', {}, {
    attempts: 2,
    backoff: { type: 'fixed', delay: 10000 },
  });
}

export async function closeQueues() {
  await discoveryQueue?.close();
  await updateQueue?.close();
  await cleanupQueue?.close();
  await connection?.quit();
}

export function isRedisAvailable(): boolean {
  return redisAvailable;
}
