import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { Review, Booking, CaregiverProfile, User } from '../models/index';
import { logActivity, reviewActions } from '../utils/logActivity';

const router = Router();

router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { bookingId, rating, comment } = req.body;

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    if (booking.customerId.toString() !== req.user?.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    if (booking.status !== 'COMPLETED') {
      return res.status(400).json({ message: 'Can only review completed bookings' });
    }

    const existingReview = await Review.findOne({ bookingId });
    if (existingReview) {
      return res.status(400).json({ message: 'Already reviewed' });
    }

    const review = new Review({
      bookingId,
      reviewerId: req.user?.id,
      caregiverId: booking.caregiverId,
      rating,
      comment
    });

    await review.save();

    const reviews = await Review.find({ caregiverId: booking.caregiverId });
    const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
    
    await CaregiverProfile.findOneAndUpdate(
      { caregiverId: booking.caregiverId },
      { 
        rating: avgRating,
        totalReviews: reviews.length
      }
    );

    const user = await User.findById(req.user?.id);

    await logActivity({
      action: reviewActions.REVIEW_CREATED,
      category: 'REVIEW',
      status: 'SUCCESS',
      req: req,
      userId: req.user?.id,
      userEmail: user?.email,
      userRole: req.user?.role,
      resourceType: 'Review',
      resourceId: review._id.toString(),
      description: `Review created - ${rating} stars`,
      metadata: { bookingId, rating, caregiverId: booking.caregiverId }
    });

    res.status(201).json(review);
  } catch (error) {
    console.error('Create review error:', error);
    await logActivity({
      action: reviewActions.REVIEW_CREATED,
      category: 'REVIEW',
      status: 'FAILED',
      req: req,
      userId: req.user?.id,
      userRole: req.user?.role,
      description: 'Failed to create review',
      metadata: { bookingId: req.body.bookingId }
    });
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/caregiver/:caregiverId', async (req: AuthRequest, res: Response) => {
  try {
    if (req.user?.id) {
      await logActivity({
        action: 'VIEW_CAREGIVER_REVIEWS',
        category: 'REVIEW',
        status: 'SUCCESS',
        req: req,
        userId: req.user?.id,
        userRole: req.user?.role,
        resourceType: 'CaregiverProfile',
        resourceId: req.params.caregiverId as string,
        description: 'Viewed caregiver reviews'
      });
    }
    
    const reviews = await Review.find({ caregiverId: req.params.caregiverId })
      .populate('reviewerId', 'name avatar')
      .sort({ createdAt: -1 });
    res.json(reviews);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/customer', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    await logActivity({
      action: 'VIEW_MY_REVIEWS',
      category: 'REVIEW',
      status: 'SUCCESS',
      req: req,
      userId: req.user?.id,
      userRole: req.user?.role,
      description: 'Viewed own reviews'
    });
    
    const reviews = await Review.find({ reviewerId: req.user?.id })
      .populate('caregiverId', 'name avatar')
      .sort({ createdAt: -1 });
    res.json(reviews);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
