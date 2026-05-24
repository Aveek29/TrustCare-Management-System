import { Router, Request, Response } from 'express';
import { authenticate, AuthRequest, authorize } from '../middleware/auth';
import { Booking, Payment, User } from '../models/index';
import { logActivity, paymentActions } from '../utils/logActivity';

const router = Router();

router.post('/create-order', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { bookingId } = req.body;

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    if (booking.customerId.toString() !== req.user?.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const user = await User.findById(req.user?.id);

    await logActivity({
      action: paymentActions.PAYMENT_INITIATED,
      category: 'PAYMENT',
      status: 'PENDING',
      req: req,
      userId: req.user?.id,
      userEmail: user?.email,
      userRole: req.user?.role,
      resourceType: 'Booking',
      resourceId: bookingId,
      description: `Payment initiated for ₹${booking.totalAmount}`,
      metadata: { bookingId, amount: booking.totalAmount }
    });

    const mockOrder = {
      id: `order_${Date.now()}`,
      amount: booking.totalAmount * 100,
      currency: 'INR',
      status: 'created'
    };

    res.json(mockOrder);
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/verify', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { bookingId, paymentId } = req.body;

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    const user = await User.findById(req.user?.id);

    await Booking.findByIdAndUpdate(
      bookingId,
      { 
        paymentId,
        paymentStatus: 'ESCROW',
        status: 'ACCEPTED'
      },
      { returnDocument: 'after' }
    );

    await Payment.create({
      bookingId,
      transactionId: paymentId || `PAY_${Date.now()}`,
      amount: booking.totalAmount,
      status: 'ESCROW',
      paymentMethod: 'Credit/Debit Card',
      customerId: booking.customerId,
      caregiverId: booking.caregiverId
    });

    await logActivity({
      action: paymentActions.PAYMENT_COMPLETED,
      category: 'PAYMENT',
      status: 'SUCCESS',
      req: req,
      userId: req.user?.id,
      userEmail: user?.email,
      userRole: req.user?.role,
      resourceType: 'Booking',
      resourceId: bookingId,
      description: `Payment completed - ₹${booking.totalAmount} held in escrow`,
      metadata: { bookingId, amount: booking.totalAmount, paymentId }
    });

    res.json({ success: true, message: 'Payment verified. Funds held in escrow.' });
  } catch (error) {
    console.error('Verify payment error:', error);
    await logActivity({
      action: paymentActions.PAYMENT_FAILED,
      category: 'PAYMENT',
      status: 'FAILED',
      req: req,
      userId: req.user?.id,
      userRole: req.user?.role,
      description: 'Payment verification failed',
      metadata: { bookingId: req.body.bookingId }
    });
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/release/:bookingId', authenticate, authorize('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const booking = await Booking.findById(req.params.bookingId);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    if (booking.paymentStatus !== 'ESCROW') {
      return res.status(400).json({ message: 'No escrow to release' });
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

    const user = await User.findById(req.user?.id);

    await logActivity({
      action: paymentActions.ESCROW_RELEASED,
      category: 'PAYMENT',
      status: 'SUCCESS',
      req: req,
      userId: req.user?.id,
      userEmail: user?.email,
      userRole: req.user?.role,
      resourceType: 'Booking',
      resourceId: req.params.bookingId as string,
      description: `Escrow released - ₹${booking.totalAmount} paid to caregiver`,
      metadata: { bookingId: req.params.bookingId, amount: booking.totalAmount }
    });

    res.json({ success: true, message: 'Payment released to caregiver' });
  } catch (error) {
    console.error('Release error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/refund/:bookingId', authenticate, authorize('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const { amount } = req.body;
    const booking = await Booking.findById(req.params.bookingId);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    booking.paymentStatus = 'REFUNDED';
    await booking.save();

    await Payment.create({
      bookingId: booking._id,
      transactionId: `REFUND_${Date.now()}`,
      amount: amount || booking.totalAmount,
      status: 'REFUNDED',
      paymentMethod: 'Admin Refund',
      customerId: booking.customerId,
      caregiverId: booking.caregiverId
    });

    const user = await User.findById(req.user?.id);

    await logActivity({
      action: paymentActions.PAYMENT_REFUNDED,
      category: 'PAYMENT',
      status: 'SUCCESS',
      req: req,
      userId: req.user?.id,
      userEmail: user?.email,
      userRole: req.user?.role,
      resourceType: 'Booking',
      resourceId: req.params.bookingId as string,
      description: `Refund processed - ₹${amount || booking.totalAmount}`,
      metadata: { bookingId: req.params.bookingId, amount: amount || booking.totalAmount }
    });

    res.json({ success: true, message: 'Refund processed' });
  } catch (error) {
    console.error('Refund error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/methods', (req: Request, res: Response) => {
  res.json({
    methods: [
      { id: 'card', name: 'Credit/Debit Card', icon: 'card' },
      { id: 'upi', name: 'UPI', icon: 'upi' },
      { id: 'netbanking', name: 'Net Banking', icon: 'bank' },
      { id: 'wallet', name: 'Wallet', icon: 'wallet' }
    ]
  });
});

export default router;
