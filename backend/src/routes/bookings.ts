import { Router, Response } from 'express';
import mongoose from 'mongoose';
import { authenticate, AuthRequest, authorize } from '../middleware/auth';
import { Booking, CaregiverProfile, User } from '../models/index';
import { logActivity, bookingActions } from '../utils/logActivity';

const router = Router();

router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { caregiverId, date, hours, notes, address } = req.body;

    const profile = await CaregiverProfile.findById(caregiverId);
    
    if (!profile) {
      await logActivity({
        action: bookingActions.BOOKING_CREATED,
        category: 'BOOKING',
        status: 'FAILED',
        req: req,
        userId: req.user?.id,
        userRole: req.user?.role,
        description: 'Booking creation failed - caregiver not found'
      });
      return res.status(404).json({ message: 'Caregiver not found' });
    }

    let caregiverUserId: string;
    const caregiverIdField = (profile as any).caregiverId;
    
    if (typeof caregiverIdField === 'object' && caregiverIdField !== null) {
      caregiverUserId = caregiverIdField._id ? caregiverIdField._id.toString() : caregiverIdField.toString();
    } else if (mongoose.Types.ObjectId.isValid(caregiverIdField)) {
      caregiverUserId = caregiverIdField.toString();
    } else {
      return res.status(400).json({ message: 'Invalid caregiver ID' });
    }
    
    const totalAmount = profile.hourlyRate * hours;

    const booking = new Booking({
      customerId: req.user?.id,
      caregiverId: caregiverUserId,
      date,
      hours,
      totalAmount,
      notes,
      address,
      status: 'PENDING'
    });

    await booking.save();

    const user = await User.findById(req.user?.id);
    
    await logActivity({
      action: bookingActions.BOOKING_CREATED,
      category: 'BOOKING',
      status: 'SUCCESS',
      req: req,
      userId: req.user?.id,
      userEmail: user?.email,
      userRole: req.user?.role,
      resourceType: 'Booking',
      resourceId: booking._id.toString(),
      description: `Booking created for ${hours} hours - ₹${totalAmount}`,
      metadata: { caregiverId: caregiverUserId, totalAmount, hours, date }
    });
    
    const populatedBooking = await Booking.findById(booking._id)
      .populate('customerId', 'name email')
      .populate('caregiverId', 'name email avatar');
    
    res.status(201).json(populatedBooking);
  } catch (error) {
    console.error('Create booking error:', error);
    await logActivity({
      action: bookingActions.BOOKING_CREATED,
      category: 'BOOKING',
      status: 'FAILED',
      req: req,
      userId: req.user?.id,
      userRole: req.user?.role,
      description: 'Booking creation failed - server error'
    });
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/customer', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    await logActivity({
      action: 'VIEW_MY_BOOKINGS',
      category: 'BOOKING',
      status: 'SUCCESS',
      req: req,
      userId: req.user?.id,
      userRole: req.user?.role,
      description: 'Viewed customer bookings'
    });
    
    const bookings = await Booking.find({ customerId: req.user?.id })
      .populate('caregiverId', 'name email avatar')
      .sort({ createdAt: -1 });
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/caregiver', authenticate, authorize('CAREGIVER'), async (req: AuthRequest, res: Response) => {
  try {
    await logActivity({
      action: 'VIEW_MY_BOOKINGS',
      category: 'BOOKING',
      status: 'SUCCESS',
      req: req,
      userId: req.user?.id,
      userRole: req.user?.role,
      description: 'Viewed caregiver bookings'
    });
    
    const profile = await CaregiverProfile.findOne({ caregiverId: req.user?.id });
    if (!profile) {
      return res.status(404).json({ message: 'Caregiver profile not found' });
    }

    const bookings = await Booking.find({ caregiverId: profile._id })
      .populate('customerId', 'name email phone avatar')
      .sort({ createdAt: -1 });
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/:id/status', authenticate, authorize('CAREGIVER', 'ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const { status } = req.body;
    const booking = await Booking.findByIdAndUpdate(
      req.params.id,
      { status },
      { returnDocument: 'after' }
    ).populate('customerId caregiverId', 'name email');
    
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    const action = status === 'ACCEPTED' ? bookingActions.BOOKING_ACCEPTED :
                   status === 'REJECTED' ? bookingActions.BOOKING_REJECTED :
                   status === 'COMPLETED' ? bookingActions.BOOKING_COMPLETED :
                   bookingActions.BOOKING_UPDATED;

    await logActivity({
      action,
      category: 'BOOKING',
      status: 'SUCCESS',
      req: req,
      userId: req.user?.id,
      userRole: req.user?.role,
      resourceType: 'Booking',
      resourceId: req.params.id as string,
      description: `Booking ${status.toLowerCase()}`,
      metadata: { previousStatus: booking.status, newStatus: status }
    });
    
    res.json(booking);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const booking = await Booking.findByIdAndDelete(req.params.id);
    
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    await logActivity({
      action: bookingActions.BOOKING_CANCELLED,
      category: 'BOOKING',
      status: 'SUCCESS',
      req: req,
      userId: req.user?.id,
      userRole: req.user?.role,
      resourceType: 'Booking',
      resourceId: req.params.id as string,
      description: `Booking cancelled`,
      metadata: { bookingId: req.params.id }
    });
    
    res.json({ message: 'Booking cancelled successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/', authenticate, authorize('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    await logActivity({
      action: 'VIEW_ALL_BOOKINGS',
      category: 'BOOKING',
      status: 'SUCCESS',
      req: req,
      userId: req.user?.id,
      userRole: req.user?.role,
      description: 'Admin viewed all bookings'
    });
    
    const bookings = await Booking.find()
      .populate('customerId', 'name email')
      .populate('caregiverId', 'name email')
      .sort({ createdAt: -1 });
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('customerId', 'name email phone avatar')
      .populate('caregiverId', 'name email phone avatar');
    
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    await logActivity({
      action: 'VIEW_BOOKING_DETAILS',
      category: 'BOOKING',
      status: 'SUCCESS',
      req: req,
      userId: req.user?.id,
      userRole: req.user?.role,
      resourceType: 'Booking',
      resourceId: req.params.id as string,
      description: 'Viewed booking details'
    });
    
    res.json(booking);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
