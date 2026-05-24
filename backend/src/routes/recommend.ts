import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { CaregiverProfile, User, Booking } from '../models/index';

const router = Router();

const calculateEuclideanDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  return Math.sqrt(Math.pow(lat2 - lat1, 2) + Math.pow(lon2 - lon1, 2));
};

const calculateHaversineDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

const skillMatchScore = (requiredSkills: string[], caregiverSkills: string[]): number => {
  if (!requiredSkills || requiredSkills.length === 0) return 100;
  const matches = requiredSkills.filter(skill => 
    caregiverSkills.some(cs => cs.toLowerCase().includes(skill.toLowerCase()) || 
                          skill.toLowerCase().includes(cs.toLowerCase()))
  );
  return (matches.length / requiredSkills.length) * 100;
};

router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { lat, lng, skills, minRating, maxDistance, minExperience } = req.query;
    console.log(`[${new Date().toISOString()}] Recommendations request - user: ${req.user?.id || 'anonymous'}, lat: ${lat}, lng: ${lng}`);

    let userLat = lat ? parseFloat(lat as string) : 28.6139;
    let userLng = lng ? parseFloat(lng as string) : 77.209;

    if (req.user?.id) {
      const user = await User.findById(req.user?.id);
      if (user?.location) {
        userLat = lat ? parseFloat(lat as string) : user.location.lat;
        userLng = lng ? parseFloat(lng as string) : user.location.lng;
      }
    }
    
    const requiredSkills = skills ? (skills as string).split(',').map(s => s.trim()) : [];

    const query: any = { isVerified: true, isAvailable: true };
    
    if (requiredSkills.length > 0) {
      query.skills = { $in: requiredSkills };
    }
    
    if (minRating) {
      query.rating = { $gte: parseFloat(minRating as string) };
    }
    
    if (minExperience) {
      query.experienceYears = { $gte: parseInt(minExperience as string) };
    }

    console.log(`[${new Date().toISOString()}] Query:`, JSON.stringify(query));

    const profiles = await CaregiverProfile.find(query).populate('caregiverId', 'name email avatar location');

    console.log(`[${new Date().toISOString()}] Found ${profiles.length} verified caregivers`);

    let pastCaregiverIds: string[] = [];
    if (req.user?.id) {
      const bookings = await Booking.find({ customerId: req.user?.id, status: 'COMPLETED' });
      pastCaregiverIds = bookings.map(b => b.caregiverId.toString());
    }
    
    const userPreferences = {
      preferredDistance: maxDistance ? parseFloat(maxDistance as string) : 50,
      skillWeight: 0.3,
      distanceWeight: 0.25,
      ratingWeight: 0.25,
      experienceWeight: 0.15,
      availabilityWeight: 0.05
    };

    const scored = profiles.map(profile => {
      const caregiver = profile.caregiverId as any;
      
      const euclideanDist = calculateEuclideanDistance(
        userLat, userLng,
        caregiver.location?.lat || 0, 
        caregiver.location?.lng || 0
      );
      
      const haversineDist = calculateHaversineDistance(
        userLat, userLng,
        caregiver.location?.lat || 0, 
        caregiver.location?.lng || 0
      );

      const skillScore = skillMatchScore(requiredSkills, profile.skills);
      
      const distanceScore = Math.max(0, Math.min(100, (1 - (euclideanDist / userPreferences.preferredDistance)) * 100));
      const ratingScore = (profile.rating / 5) * 100;
      const experienceScore = Math.min(100, (profile.experienceYears / 15) * 100);
      
      const isPreviouslyUsed = pastCaregiverIds.includes(profile.caregiverId._id.toString());
      const repeatScore = isPreviouslyUsed ? 80 : 50;
      
      const totalScore = (
        (skillScore * userPreferences.skillWeight) +
        (distanceScore * userPreferences.distanceWeight) +
        (ratingScore * userPreferences.ratingWeight) +
        (experienceScore * userPreferences.experienceWeight) +
        (repeatScore * userPreferences.availabilityWeight)
      );

      return {
        ...profile.toObject(),
        distance: Math.round(haversineDist * 10) / 10,
        euclideanDistance: Math.round(euclideanDist * 1000) / 1000,
        scores: {
          skillMatch: Math.round(skillScore),
          distance: Math.round(distanceScore),
          rating: Math.round(ratingScore),
          experience: Math.round(experienceScore),
          repeatCustomer: Math.round(repeatScore),
          total: Math.round(totalScore)
        },
        recommendation: {
          score: Math.round(totalScore),
          label: totalScore >= 80 ? 'Highly Recommended' : 
                 totalScore >= 60 ? 'Recommended' : 
                 totalScore >= 40 ? 'Good Match' : 'Available',
          reasons: [
            skillScore >= 50 && requiredSkills.length > 0 ? 'Skills match your requirements' : null,
            distanceScore >= 60 ? 'Convenient location' : null,
            ratingScore >= 80 ? 'Highly rated' : null,
            experienceScore >= 60 ? 'Experienced caregiver' : null,
            isPreviouslyUsed ? 'Previously booked by you' : null
          ].filter(Boolean)
        }
      };
    });

    scored.sort((a, b) => b.scores.total - a.scores.total);

    const topMatches = scored.slice(0, 10);
    const recommendations = {
      topMatches,
      totalAvailable: profiles.length,
      filters: {
        skills: requiredSkills,
        minRating: minRating || null,
        maxDistance: maxDistance || 50,
        location: { lat: userLat, lng: userLng }
      }
    };

    res.json(recommendations);
  } catch (error) {
    console.error('Recommendation error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/similar/:caregiverId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const profile = await CaregiverProfile.findById(req.params.caregiverId);
    if (!profile) {
      return res.status(404).json({ message: 'Caregiver not found' });
    }

    const user = await User.findById(req.user?.id);
    const userLat = user?.location?.lat || 28.6139;
    const userLng = user?.location?.lng || 77.209;

    const similarProfiles = await CaregiverProfile.find({
      _id: { $ne: profile._id },
      isVerified: true,
      skills: { $in: profile.skills },
      rating: { $gte: profile.rating - 1 }
    }).populate('caregiverId', 'name email avatar location');

    const scored = similarProfiles.map(p => {
      const caregiver = p.caregiverId as any;
      const distance = calculateHaversineDistance(
        userLat, userLng,
        caregiver.location?.lat || 0, 
        caregiver.location?.lng || 0
      );
      
      const ratingDiff = Math.abs(p.rating - profile.rating);
      
      return {
        ...p.toObject(),
        distance: Math.round(distance * 10) / 10,
        similarityScore: Math.round((1 - ratingDiff / 5) * 100)
      };
    });

    scored.sort((a, b) => b.similarityScore - a.similarityScore);

    res.json(scored.slice(0, 5));
  } catch (error) {
    console.error('Similar caregivers error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
