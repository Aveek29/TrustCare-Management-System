import { Router, Response } from 'express';
import { authenticate, AuthRequest, authorize } from '../../../middleware/auth';
import { ScrapingSource } from '../models/ScrapingSource';
import { ScrapingLog } from '../models/ScrapingLog';
import { AggregationMetrics } from '../models/AggregationMetrics';
import { HealthcareFacility } from '../models/HealthcareFacility';
import { HealthcareProvider } from '../models/HealthcareProvider';
import { addDiscoveryJob, addUpdateJob, addCleanupJob } from '../queues/queueSetup';

const router = Router();

router.get('/status', authenticate, authorize('ADMIN'), async (_req: AuthRequest, res: Response) => {
  try {
    const [metrics, recentLogs, sources] = await Promise.all([
      AggregationMetrics.findOne().lean(),
      ScrapingLog.find().sort({ createdAt: -1 }).limit(20).lean(),
      ScrapingSource.find().lean(),
    ]);
    res.json({ metrics, recentLogs, sources });
  } catch (error) {
    console.error('Aggregator status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/logs', authenticate, authorize('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const { jobType, status, page = '1', limit = '50' } = req.query;
    const query: any = {};
    if (jobType) query.jobType = jobType;
    if (status) query.status = status;
    const pageNum = Math.max(1, parseInt(page as string));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string)));
    const skip = (pageNum - 1) * limitNum;

    const [logs, total] = await Promise.all([
      ScrapingLog.find(query).sort({ createdAt: -1 }).skip(skip).limit(limitNum).lean(),
      ScrapingLog.countDocuments(query),
    ]);

    res.json({
      logs,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('Aggregator logs error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/sources', authenticate, authorize('ADMIN'), async (_req: AuthRequest, res: Response) => {
  try {
    const sources = await ScrapingSource.find().lean();
    res.json(sources);
  } catch (error) {
    console.error('Get sources error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/sources', authenticate, authorize('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const { name, baseUrl, category, scrapeInterval, config } = req.body;
    const source = await ScrapingSource.create({ name, baseUrl, category, scrapeInterval, config });
    res.status(201).json(source);
  } catch (error) {
    console.error('Create source error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/sources/:id', authenticate, authorize('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const source = await ScrapingSource.findByIdAndUpdate(req.params.id, req.body, { returnDocument: 'after' });
    if (!source) return res.status(404).json({ message: 'Source not found' });
    res.json(source);
  } catch (error) {
    console.error('Update source error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/run/:jobType', authenticate, authorize('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const { jobType } = req.params;
    let jobId: string | undefined;
    switch (jobType) {
      case 'discovery':
        jobId = (await addDiscoveryJob(req.body))?.id;
        break;
      case 'update':
        jobId = (await addUpdateJob())?.id;
        break;
      case 'cleanup':
        jobId = (await addCleanupJob())?.id;
        break;
      default:
        return res.status(400).json({ message: 'Invalid job type. Use: discovery, update, cleanup' });
    }
    res.json({ message: `${jobType} job queued`, jobId: jobId || 'queued' });
  } catch (error) {
    console.error('Run job error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/stats', authenticate, authorize('ADMIN'), async (_req: AuthRequest, res: Response) => {
  try {
    const [facilityCount, providerCount, sourceCount] = await Promise.all([
      HealthcareFacility.countDocuments(),
      HealthcareProvider.countDocuments(),
      ScrapingSource.countDocuments({ isActive: true }),
    ]);
    res.json({ totalFacilities: facilityCount, totalProviders: providerCount, activeSources: sourceCount });
  } catch (error) {
    console.error('Aggregator stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export { router as adminRouter };
