import { Router, Response } from 'express';
import { authenticate, AuthRequest, authorize } from '../middleware/auth';
import { User, Booking, Payment, CaregiverProfile, Review } from '../models/index';

const router = Router();

router.get('/stats', authenticate, authorize('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalCustomers = await User.countDocuments({ role: 'CUSTOMER' });
    const totalCaregivers = await User.countDocuments({ role: 'CAREGIVER' });
    const verifiedCaregivers = await CaregiverProfile.countDocuments({ isVerified: true });
    const pendingCaregivers = await CaregiverProfile.countDocuments({ isVerified: false });
    
    const totalBookings = await Booking.countDocuments();
    const activeBookings = await Booking.countDocuments({ status: { $in: ['PENDING', 'ACCEPTED'] } });
    const completedBookings = await Booking.countDocuments({ status: 'COMPLETED' });
    
    const totalRevenue = await Booking.aggregate([
      { $match: { paymentStatus: 'PAID_OUT' } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);
    
    const escrowAmount = await Booking.aggregate([
      { $match: { paymentStatus: 'ESCROW' } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);
    
    const monthlyRevenue = await Booking.aggregate([
      { 
        $match: { 
          status: 'COMPLETED',
          createdAt: { $gte: new Date(new Date().setDate(1)) }
        }
      },
      { $group: { _id: null, total: { $sum: '$totalAmount' }, count: { $sum: 1 } } }
    ]);
    
    const recentBookings = await Booking.find()
      .populate('customerId', 'name email')
      .populate('caregiverId', 'name email')
      .sort({ createdAt: -1 })
      .limit(10);
    
    res.json({
      users: {
        total: totalUsers,
        customers: totalCustomers,
        caregivers: totalCaregivers,
        verifiedCaregivers,
        pendingCaregivers
      },
      bookings: {
        total: totalBookings,
        active: activeBookings,
        completed: completedBookings
      },
      revenue: {
        total: totalRevenue[0]?.total || 0,
        escrow: escrowAmount[0]?.total || 0,
        thisMonth: monthlyRevenue[0]?.total || 0,
        bookingsThisMonth: monthlyRevenue[0]?.count || 0
      },
      recentBookings
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/revenue', authenticate, authorize('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const { period = 'all' } = req.query;
    
    let dateFilter = {};
    if (period === 'week') {
      dateFilter = { createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } };
    } else if (period === 'month') {
      dateFilter = { createdAt: { $gte: new Date(new Date().setDate(1)) } };
    } else if (period === 'year') {
      dateFilter = { createdAt: { $gte: new Date(new Date().setFullYear(new Date().getFullYear() - 1)) } };
    }
    
    const revenueData = await Booking.aggregate([
      { $match: { ...dateFilter, paymentStatus: 'PAID_OUT' } },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
          },
          amount: { $sum: '$totalAmount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    
    const topCaregivers = await Booking.aggregate([
      { $match: { ...dateFilter, status: 'COMPLETED' } },
      {
        $group: {
          _id: '$caregiverId',
          totalEarnings: { $sum: '$totalAmount' },
          totalBookings: { $sum: 1 }
        }
      },
      { $sort: { totalEarnings: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'caregiver'
        }
      },
      { $unwind: '$caregiver' },
      {
        $project: {
          name: '$caregiver.name',
          email: '$caregiver.email',
          totalEarnings: 1,
          totalBookings: 1
        }
      }
    ]);
    
    res.json({
      chartData: revenueData,
      topCaregivers
    });
  } catch (error) {
    console.error('Revenue error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/disputes', authenticate, authorize('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const { status = 'all' } = req.query;
    
    const query: any = {};
    if (status === 'open') {
      query.status = { $in: ['PENDING', 'ACCEPTED'] };
    } else if (status === 'resolved') {
      query.status = 'COMPLETED';
    }
    
    const disputes = await Booking.find({ 
      ...query,
      notes: { $exists: true, $ne: '' }
    })
      .populate('customerId', 'name email phone')
      .populate('caregiverId', 'name email phone')
      .sort({ updatedAt: -1 });
    
    const disputeCount = await Booking.countDocuments({
      notes: { $exists: true, $ne: '' },
      status: { $in: ['PENDING', 'ACCEPTED'] }
    });
    
    res.json({
      disputes,
      openDisputes: disputeCount
    });
  } catch (error) {
    console.error('Disputes error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/disputes/:id/resolve', authenticate, authorize('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const { resolution, refundAmount } = req.body;
    
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    
    if (refundAmount && refundAmount > 0) {
      booking.paymentStatus = 'REFUNDED';
      await Payment.create({
        bookingId: booking._id,
        transactionId: `REFUND_${Date.now()}`,
        amount: refundAmount,
        status: 'REFUNDED',
        paymentMethod: 'Refund',
        customerId: booking.customerId,
        caregiverId: booking.caregiverId
      });
    }
    
    booking.status = 'COMPLETED';
    booking.notes = `${booking.notes}\n\n--- Resolution ---\n${resolution}\nRefund: ₹${refundAmount || 0}`;
    await booking.save();
    
    res.json({ success: true, booking });
  } catch (error) {
    console.error('Resolve dispute error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/users/:id', authenticate, authorize('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    if (user.role === 'ADMIN') {
      return res.status(403).json({ message: 'Cannot delete admin user' });
    }
    
    await User.findByIdAndDelete(req.params.id);
    await Booking.deleteMany({ 
      $or: [{ customerId: req.params.id }, { caregiverId: req.params.id }]
    });
    
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/release-payment/:bookingId', authenticate, authorize('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const booking = await Booking.findById(req.params.bookingId);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    
    if (booking.paymentStatus !== 'ESCROW') {
      return res.status(400).json({ message: 'No escrow payment to release' });
    }
    
    booking.paymentStatus = 'PAID_OUT';
    await booking.save();
    
    await Payment.create({
      bookingId: booking._id,
      transactionId: `RELEASE_${Date.now()}`,
      amount: booking.totalAmount,
      status: 'RELEASED',
      paymentMethod: 'Admin Release',
      customerId: booking.customerId,
      caregiverId: booking.caregiverId
    });
    
    res.json({ success: true, booking });
  } catch (error) {
    console.error('Release payment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/payments/escrow', authenticate, authorize('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const escrowPayments = await Booking.find({ paymentStatus: 'ESCROW' })
      .populate('customerId', 'name email')
      .populate('caregiverId', 'name email')
      .sort({ createdAt: -1 });
    
    const totalEscrow = escrowPayments.reduce((sum, b) => sum + b.totalAmount, 0);
    
    res.json({
      payments: escrowPayments,
      totalEscrow
    });
  } catch (error) {
    console.error('Escrow payments error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/users', authenticate, authorize('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    const caregiverProfiles = await CaregiverProfile.find().populate('caregiverId', 'name email');
    
    const usersWithProfiles = users.map(user => {
      const profile = caregiverProfiles.find(p => p.caregiverId._id.toString() === user._id.toString());
      return {
        ...user.toObject(),
        profile: profile || null
      };
    });
    
    res.json(usersWithProfiles);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/users/:id/status', authenticate, authorize('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const { isActive } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isActive },
      { returnDocument: 'after' }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ success: true, user });
  } catch (error) {
    console.error('Update user status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/users/:id/verify', authenticate, authorize('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const { isVerified } = req.body;
    
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    user.isVerified = isVerified;
    await user.save();
    
    if (user.role === 'CAREGIVER') {
      await CaregiverProfile.findOneAndUpdate(
        { caregiverId: user._id },
        { isVerified },
        { returnDocument: 'after' }
      );
    }
    
    res.json({ success: true, user });
  } catch (error) {
    console.error('Verify user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/users/:id', authenticate, authorize('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    let profile = null;
    if (user.role === 'CAREGIVER') {
      profile = await CaregiverProfile.findOne({ caregiverId: user._id });
    }
    
    const bookings = await Booking.find({
      $or: [{ customerId: user._id }, { caregiverId: user._id }]
    }).sort({ createdAt: -1 }).limit(10);
    
    res.json({ user, profile, bookings });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
