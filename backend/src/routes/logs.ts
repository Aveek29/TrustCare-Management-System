import { Router, Request, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { ChatLog, AuthLog, ActivityLog } from '../models/index';

const router = Router();

router.get('/activity', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (req.user?.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Access denied. Admin only.' });
    }

    const { page = '1', limit = '20', category, action, status, userId, startDate, endDate } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const query: any = {};
    
    if (category) query.category = category;
    if (action) query.action = action;
    if (status) query.status = status;
    if (userId) query.userId = userId;
    
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate as string);
      if (endDate) query.createdAt.$lte = new Date(endDate as string);
    }

    const [logs, total] = await Promise.all([
      ActivityLog.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      ActivityLog.countDocuments(query)
    ]);

    res.json({
      logs,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('Activity logs error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/activity/stats', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (req.user?.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Access denied. Admin only.' });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [byCategory, byStatus, recentActivity, todayStats] = await Promise.all([
      ActivityLog.aggregate([
        { $group: { _id: '$category', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      ActivityLog.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      ActivityLog.find()
        .sort({ createdAt: -1 })
        .limit(10)
        .lean(),
      ActivityLog.aggregate([
        { $match: { createdAt: { $gte: today } } },
        { $group: { _id: '$category', count: { $sum: 1 } } }
      ])
    ]);

    const totalToday = todayStats.reduce((sum, stat) => sum + stat.count, 0);

    res.json({
      byCategory,
      byStatus,
      recentActivity,
      todayStats: { total: totalToday, byCategory: todayStats }
    });
  } catch (error) {
    console.error('Activity stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/chat', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (req.user?.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Access denied. Admin only.' });
    }

    const { page = '1', limit = '20', userId, sessionId, startDate, endDate } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const query: any = {};
    
    if (userId) query.userId = userId;
    if (sessionId) query.sessionId = sessionId;
    
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate as string);
      if (endDate) query.createdAt.$lte = new Date(endDate as string);
    }

    const [logs, total] = await Promise.all([
      ChatLog.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      ChatLog.countDocuments(query)
    ]);

    const stats = await ChatLog.aggregate([
      { $group: { _id: null, totalSessions: { $addToSet: '$sessionId' }, totalMessages: { $sum: { $size: '$messages' } } } },
      { $project: { totalSessions: { $size: '$totalSessions' }, totalMessages: 1 } }
    ]);

    res.json({
      logs,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      },
      stats: stats[0] || { totalSessions: 0, totalMessages: 0 }
    });
  } catch (error) {
    console.error('Chat logs error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/chat/stats', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (req.user?.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Access denied. Admin only.' });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [totalSessions, todaySessions, messagesToday, byRole, recentActivity] = await Promise.all([
      ChatLog.distinct('sessionId').then(ids => ids.length),
      ChatLog.countDocuments({ createdAt: { $gte: today } }),
      ChatLog.aggregate([
        { $match: { createdAt: { $gte: today } } },
        { $unwind: '$messages' },
        { $count: 'count' }
      ]),
      ChatLog.aggregate([
        { $group: { _id: '$userRole', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      ChatLog.find()
        .sort({ updatedAt: -1 })
        .limit(5)
        .select('sessionId userRole page messages updatedAt')
        .lean()
    ]);

    res.json({
      totalSessions,
      todaySessions,
      messagesToday: messagesToday[0]?.count || 0,
      byRole,
      recentActivity
    });
  } catch (error) {
    console.error('Chat stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/auth', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (req.user?.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Access denied. Admin only.' });
    }

    const { page = '1', limit = '20', action, status, userId, email, startDate, endDate } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const query: any = {};
    
    if (action) query.action = action;
    if (status) query.status = status;
    if (userId) query.userId = userId;
    if (email) query.userEmail = { $regex: email, $options: 'i' };
    
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate as string);
      if (endDate) query.createdAt.$lte = new Date(endDate as string);
    }

    const [logs, total] = await Promise.all([
      AuthLog.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      AuthLog.countDocuments(query)
    ]);

    res.json({
      logs,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('Auth logs error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/auth/stats', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (req.user?.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Access denied. Admin only.' });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const thisWeek = new Date(today);
    thisWeek.setDate(thisWeek.getDate() - 7);

    const [todayStats, weekStats, byAction, failedLogins, recentLogins] = await Promise.all([
      AuthLog.aggregate([
        { $match: { createdAt: { $gte: today } } },
        { $group: { _id: '$action', count: { $sum: 1 } } }
      ]),
      AuthLog.aggregate([
        { $match: { createdAt: { $gte: thisWeek } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } }
      ]),
      AuthLog.aggregate([
        { $group: { _id: '$action', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      AuthLog.countDocuments({ action: 'LOGIN_FAILED', createdAt: { $gte: today } }),
      AuthLog.find({ action: { $in: ['LOGIN_SUCCESS', 'REGISTER_SUCCESS'] } })
        .sort({ createdAt: -1 })
        .limit(10)
        .select('userEmail action role createdAt ipAddress')
        .lean()
    ]);

    const totalToday = todayStats.reduce((sum, stat) => sum + stat.count, 0);
    const totalWeek = weekStats.reduce((sum, stat) => sum + stat.count, 0);

    res.json({
      today: { total: totalToday, byAction: todayStats },
      week: { total: totalWeek, daily: weekStats },
      byAction,
      failedLoginsToday: failedLogins,
      recentLogins
    });
  } catch (error) {
    console.error('Auth stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/chat/:sessionId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (req.user?.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Access denied. Admin only.' });
    }

    const result = await ChatLog.deleteOne({ sessionId: req.params.sessionId });
    
    if (result.deletedCount === 0) {
      return res.status(404).json({ message: 'Session not found' });
    }

    res.json({ message: 'Chat session deleted successfully' });
  } catch (error) {
    console.error('Delete chat session error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/auth/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (req.user?.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Access denied. Admin only.' });
    }

    const result = await AuthLog.deleteOne({ _id: req.params.id });
    
    if (result.deletedCount === 0) {
      return res.status(404).json({ message: 'Log entry not found' });
    }

    res.json({ message: 'Auth log deleted successfully' });
  } catch (error) {
    console.error('Delete auth log error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/activity/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (req.user?.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Access denied. Admin only.' });
    }

    const result = await ActivityLog.deleteOne({ _id: req.params.id });
    
    if (result.deletedCount === 0) {
      return res.status(404).json({ message: 'Activity log not found' });
    }

    res.json({ message: 'Activity log deleted successfully' });
  } catch (error) {
    console.error('Delete activity log error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
