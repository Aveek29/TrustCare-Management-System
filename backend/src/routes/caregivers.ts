import { Router, Response } from 'express';
import { authenticate, AuthRequest, authorize } from '../middleware/auth';
import { CaregiverProfile, User, Review } from '../models/index';
import { logActivity, caregiverActions } from '../utils/logActivity';

const router = Router();

router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { skills, minRating, maxRate, available } = req.query;
    console.log(`[${new Date().toISOString()}] Fetching caregivers with filters:`, req.query);
    
    const query: any = { isVerified: true };
    
    if (skills) {
      const skillList = (skills as string).split(',');
      query.skills = { $in: skillList };
    }
    
    if (minRating) {
      query.rating = { $gte: parseFloat(minRating as string) };
    }
    
    if (maxRate) {
      query.hourlyRate = { $lte: parseFloat(maxRate as string) };
    }
    
    if (available === 'true') {
      query.isAvailable = true;
    }

    const profiles = await CaregiverProfile.find(query)
      .populate('caregiverId', 'name email avatar location phone')
      .sort({ rating: -1, totalReviews: -1 });
    
    const caregiversWithReviews = await Promise.all(profiles.map(async (profile) => {
      const reviews = await Review.find({ caregiverId: profile.caregiverId._id })
        .sort({ createdAt: -1 })
        .limit(5);
      
      return {
        ...profile.toObject(),
        totalReviews: profile.totalReviews || 0,
        reviews: reviews
      };
    }));
    
    if (req.user?.id) {
      await logActivity({
        action: 'SEARCH_CAREGIVERS',
        category: 'CAREGIVER',
        status: 'SUCCESS',
        req: req,
        userId: req.user?.id,
        userRole: req.user?.role,
        description: `Searched caregivers with filters: ${JSON.stringify(req.query)}`,
        metadata: { filters: req.query, resultsCount: caregiversWithReviews.length }
      });
    }
    
    console.log(`[${new Date().toISOString()}] Found ${caregiversWithReviews.length} caregivers`);
    res.json(caregiversWithReviews);
  } catch (error) {
    console.error('Get caregivers error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/me', authenticate, authorize('CAREGIVER'), async (req: AuthRequest, res: Response) => {
  try {
    await logActivity({
      action: caregiverActions.PROFILE_VIEWED,
      category: 'CAREGIVER',
      status: 'SUCCESS',
      req: req,
      userId: req.user?.id,
      userRole: req.user?.role,
      description: 'Viewed own caregiver profile'
    });
    
    const profile = await CaregiverProfile.findOne({ caregiverId: req.user?.id }).populate('caregiverId', 'name email avatar location phone');
    res.json(profile);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/profile', authenticate, authorize('CAREGIVER'), async (req: AuthRequest, res: Response) => {
  try {
    const { hourlyRate, experienceYears, skills, bio, availabilitySchedule } = req.body;

    let profile = await CaregiverProfile.findOne({ caregiverId: req.user?.id });
    const isNew = !profile;

    if (profile) {
      profile.hourlyRate = hourlyRate;
      profile.experienceYears = experienceYears;
      profile.skills = skills;
      profile.bio = bio;
      profile.availabilitySchedule = availabilitySchedule;
      await profile.save();
    } else {
      profile = new CaregiverProfile({
        caregiverId: req.user?.id,
        hourlyRate,
        experienceYears,
        skills,
        bio,
        availabilitySchedule
      });
      await profile.save();
    }

    const user = await User.findById(req.user?.id);

    await logActivity({
      action: isNew ? caregiverActions.PROFILE_CREATED : caregiverActions.PROFILE_UPDATED,
      category: 'CAREGIVER',
      status: 'SUCCESS',
      req: req,
      userId: req.user?.id,
      userEmail: user?.email,
      userRole: req.user?.role,
      resourceType: 'CaregiverProfile',
      resourceId: profile._id.toString(),
      description: isNew ? 'Created caregiver profile' : 'Updated caregiver profile',
      metadata: { hourlyRate, experienceYears, skillsCount: skills?.length || 0 }
    });

    res.json(profile);
  } catch (error) {
    console.error('Create profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/availability', authenticate, authorize('CAREGIVER'), async (req: AuthRequest, res: Response) => {
  try {
    const { isAvailable } = req.body;
    const profile = await CaregiverProfile.findOneAndUpdate(
      { caregiverId: req.user?.id },
      { isAvailable },
      { returnDocument: 'after' }
    );

    await logActivity({
      action: caregiverActions.PROFILE_UPDATED,
      category: 'CAREGIVER',
      status: 'SUCCESS',
      req: req,
      userId: req.user?.id,
      userRole: req.user?.role,
      resourceType: 'CaregiverProfile',
      resourceId: profile?._id.toString(),
      description: `Updated availability to ${isAvailable ? 'available' : 'unavailable'}`,
      metadata: { isAvailable }
    });

    res.json(profile);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/pending', authenticate, authorize('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    await logActivity({
      action: 'VIEW_PENDING_CAREGIVERS',
      category: 'CAREGIVER',
      status: 'SUCCESS',
      req: req,
      userId: req.user?.id,
      userRole: req.user?.role,
      description: 'Viewed pending caregiver verifications'
    });
    
    const profiles = await CaregiverProfile.find({ isVerified: false }).populate('caregiverId', 'name email avatar location phone');
    res.json(profiles);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/:id/availability', authenticate, authorize('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const { isAvailable } = req.body;
    const profile = await CaregiverProfile.findByIdAndUpdate(
      req.params.id,
      { isAvailable },
      { returnDocument: 'after' }
    );

    if (!profile) {
      return res.status(404).json({ message: 'Caregiver profile not found' });
    }

    res.json(profile);
  } catch (error) {
    console.error('Update caregiver availability error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/verify/:id', authenticate, authorize('ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const { isVerified } = req.body;
    const profile = await CaregiverProfile.findByIdAndUpdate(
      req.params.id,
      { isVerified },
      { returnDocument: 'after' }
    ).populate('caregiverId', 'name email');
    
    if (profile) {
      await User.findByIdAndUpdate(profile.caregiverId, { isVerified });
    }

    const user = await User.findById(req.user?.id);

    await logActivity({
      action: isVerified ? caregiverActions.VERIFICATION_APPROVED : caregiverActions.VERIFICATION_REJECTED,
      category: 'CAREGIVER',
      status: 'SUCCESS',
      req: req,
      userId: req.user?.id,
      userEmail: user?.email,
      userRole: req.user?.role,
      resourceType: 'CaregiverProfile',
      resourceId: req.params.id as string,
      description: isVerified ? 'Caregiver verification approved' : 'Caregiver verification rejected',
      metadata: { caregiverId: profile?.caregiverId?._id, isVerified }
    });
    
    res.json(profile);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const profile = await CaregiverProfile.findById(req.params.id).populate('caregiverId', 'name email avatar location phone');
    if (!profile) {
      return res.status(404).json({ message: 'Caregiver not found' });
    }

    if (req.user?.id) {
      const user = await User.findById(req.user?.id);
      await logActivity({
        action: caregiverActions.PROFILE_VIEWED,
        category: 'CAREGIVER',
        status: 'SUCCESS',
        req: req,
        userId: req.user?.id,
        userEmail: user?.email,
        userRole: req.user?.role,
        resourceType: 'CaregiverProfile',
        resourceId: req.params.id as string,
        description: `Viewed caregiver profile`,
        metadata: { caregiverId: profile.caregiverId?._id }
      });
    }

    res.json(profile);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
