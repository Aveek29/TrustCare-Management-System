import { Router, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { CaregiverProfile, User } from '../models/index';
import { HealthcareFacility } from '../modules/healthcareAggregator/models/HealthcareFacility';
import { recommendationRequestSchema } from '../validators/recommendation';
import {
  rankCandidates,
  mlServiceConfigured,
  CandidateFeature,
} from '../services/recommendationClient';
import { logActivity } from '../utils/logActivity';

const router = Router();

const DEFAULT_MAX_DISTANCE_KM = 50;

const haversineKm = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const norm = (s: string) => s.toLowerCase().trim();

const careTypeMatches = (careType: string, skills: string[], bio: string): boolean => {
  if (!careType || careType === 'general') return true;
  const tokens = norm(careType).split(/[-_\s]+/).filter((t) => t.length > 2);
  const haystack = [...skills.map(norm), norm(bio || '')].join(' ');
  return tokens.some((t) => haystack.includes(t));
};

const skillCoverage = (required: string[], skills: string[]): number => {
  if (required.length === 0) return 1;
  const have = new Set(skills.map(norm));
  const matched = required.filter((s) => {
    const n = norm(s);
    return [...have].some((h) => h.includes(n) || n.includes(h));
  });
  return matched.length / required.length;
};

router.get('/caregivers', async (req: AuthRequest, res: Response) => {
  try {
    const parsed = recommendationRequestSchema.safeParse({
      careType: req.query.careType,
      location:
        req.query.lat && req.query.lng
          ? { latitude: parseFloat(req.query.lat as string), longitude: parseFloat(req.query.lng as string) }
          : undefined,
      skills:
        typeof req.query.skills === 'string'
          ? (req.query.skills as string).split(',').map((s) => s.trim()).filter(Boolean)
          : [],
      minRating: req.query.minRating ? parseFloat(req.query.minRating as string) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 5,
      budget:
        req.query.maxRate
          ? { maximumHourlyRate: parseFloat(req.query.maxRate as string), currency: 'INR' }
          : undefined,
    });

    if (!parsed.success) {
      return res.status(400).json({ message: 'Invalid request', errors: parsed.error.flatten() });
    }
    const input = parsed.data;

    // Resolve the user's location: explicit query -> stored profile -> default (Delhi).
    let userLat = input.location?.latitude ?? 28.6139;
    let userLng = input.location?.longitude ?? 77.209;
    if (!input.location && req.user?.id) {
      const user = await User.findById(req.user.id);
      if (user?.location) {
        userLat = user.location.lat;
        userLng = user.location.lng;
      }
    }

    // Stage A: hard eligibility constraints applied before any ML call.
    const query: Record<string, unknown> = { isVerified: true, isAvailable: true };
    if (input.minRating) query.rating = { $gte: input.minRating };

    const profiles = await CaregiverProfile.find(query).populate(
      'caregiverId',
      'name email avatar location phone'
    );

    const requiredSkills = input.skills || [];
    const maxRate = input.budget?.maximumHourlyRate;

    const eligible = profiles.filter((p) => {
      if (!p.caregiverId) return false;
      const rate = p.hourlyRate;
      if (maxRate !== undefined && rate > maxRate) return false;
      const caregiver = p.caregiverId as unknown as { location?: { lat: number; lng: number } };
      if (caregiver.location) {
        const d = haversineKm(userLat, userLng, caregiver.location.lat, caregiver.location.lng);
        if (d > DEFAULT_MAX_DISTANCE_KM) return false;
      }
      return true;
    });

    if (eligible.length === 0) {
      return res.json({
        recommendations: [],
        total: 0,
        mlConfigured: mlServiceConfigured(),
        message: 'No eligible caregivers. Try widening distance, budget or skill filters.',
      });
    }

    // Stage B: build candidate features and rank.
    const featureMap = new Map<string, CandidateFeature>();
    for (const p of eligible) {
      const caregiver = p.caregiverId as unknown as {
        _id: string;
        location?: { lat: number; lng: number };
      };
      const distanceKm = caregiver.location
        ? haversineKm(userLat, userLng, caregiver.location.lat, caregiver.location.lng)
        : DEFAULT_MAX_DISTANCE_KM;
      const id = p._id.toString();
      featureMap.set(id, {
        candidateId: id,
        careTypeMatch: careTypeMatches(input.careType, p.skills, p.bio || '') ? 1 : 0,
        distanceKm: Math.round(distanceKm * 100) / 100,
        budgetDifference: maxRate !== undefined ? Math.max(0, p.hourlyRate - maxRate) : 0,
        availabilityMatch: p.isAvailable ? 1 : 0,
        requiredSkillCoverage: skillCoverage(requiredSkills, p.skills),
        verifiedStatus: p.isVerified ? 1 : 0,
        ratingScore: p.rating || 0,
        experienceYears: p.experienceYears || 0,
        hourlyRate: p.hourlyRate,
        totalReviews: p.totalReviews || 0,
        isAvailable: p.isAvailable ? 1 : 0,
        isVerified: p.isVerified ? 1 : 0,
      });
    }

    const candidates = [...featureMap.values()];
    const outcome = await rankCandidates(candidates, {
      careType: input.careType,
      location: input.location,
      budget: input.budget,
      schedule: input.schedule,
      limit: input.limit,
    });

    const reasonCodesFor = (c: CandidateFeature): string[] => {
      const codes: string[] = [];
      if (c.careTypeMatch) codes.push('CARE_TYPE_MATCH');
      if (c.requiredSkillCoverage >= 0.5) codes.push('SKILLS_MATCH');
      if (c.distanceKm <= 10) codes.push('NEARBY');
      else if (c.distanceKm <= DEFAULT_MAX_DISTANCE_KM) codes.push('WITHIN_SERVICE_AREA');
      if (c.verifiedStatus) codes.push('VERIFIED');
      if (c.availabilityMatch) codes.push('AVAILABLE');
      if (c.ratingScore >= 4.5) codes.push('HIGHLY_RATED');
      if ((c.experienceYears || 0) >= 5) codes.push('EXPERIENCED');
      if (c.budgetDifference === 0) codes.push('WITHIN_BUDGET');
      return codes;
    };

    const recommendations = candidates
      .map((c) => {
        const profile = eligible.find((p) => p._id.toString() === c.candidateId)!;
        return {
          ...profile.toObject(),
          score: Math.round((outcome.scores.get(c.candidateId) || 0) * 1000) / 1000,
          distanceKm: c.distanceKm,
          reasonCodes: reasonCodesFor(c),
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, input.limit);

    if (req.user?.id) {
      await logActivity({
        action: 'VIEW_RECOMMENDATIONS',
        category: 'CAREGIVER',
        status: 'SUCCESS',
        req,
        userId: req.user.id,
        userRole: req.user.role,
        description: `Viewed ranked caregiver recommendations (${recommendations.length})`,
        metadata: {
          careType: input.careType,
          candidates: candidates.length,
          modelVersion: outcome.modelVersion,
          fallbackUsed: outcome.fallbackUsed,
        },
      });
    }

    res.json({
      recommendations,
      total: recommendations.length,
      eligible: candidates.length,
      modelVersion: outcome.modelVersion,
      fallbackUsed: outcome.fallbackUsed,
      mlConfigured: mlServiceConfigured(),
    });
  } catch (error) {
    console.error('Recommendations error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/facilities', async (req: AuthRequest, res: Response) => {
  try {
    const parsed = recommendationRequestSchema.safeParse({
      careType: req.query.careType,
      location:
        req.query.lat && req.query.lng
          ? { latitude: parseFloat(req.query.lat as string), longitude: parseFloat(req.query.lng as string) }
          : undefined,
      skills:
        typeof req.query.skills === 'string'
          ? (req.query.skills as string).split(',').map((s) => s.trim()).filter(Boolean)
          : [],
      minRating: req.query.minRating ? parseFloat(req.query.minRating as string) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 5,
    });

    if (!parsed.success) {
      return res.status(400).json({ message: 'Invalid request', errors: parsed.error.flatten() });
    }
    const input = parsed.data;

    let userLat = input.location?.latitude ?? 28.6139;
    let userLng = input.location?.longitude ?? 77.209;
    if (!input.location && req.user?.id) {
      const user = await User.findById(req.user.id);
      if (user?.location) {
        userLat = user.location.lat;
        userLng = user.location.lng;
      }
    }

    const required = input.skills || [];
    const facilities = await HealthcareFacility.find({
      'coordinates.lat': { $ne: 0 },
      'coordinates.lng': { $ne: 0 },
    }).limit(500);

    const eligible = facilities.filter((f) => {
      const d = haversineKm(userLat, userLng, f.coordinates.lat, f.coordinates.lng);
      return d <= DEFAULT_MAX_DISTANCE_KM;
    });

    if (eligible.length === 0) {
      return res.json({
        recommendations: [],
        total: 0,
        mlConfigured: mlServiceConfigured(),
        message: 'No eligible facilities within service distance.',
      });
    }

    const facilityTypeMatches = (careType: string, f: (typeof eligible)[number]): boolean => {
      if (!careType || careType === 'general') return true;
      const tokens = norm(careType).split(/[-_\s]+/).filter((t) => t.length > 2);
      const haystack = [norm(f.facilityType), ...f.services.map(norm), ...f.specialities.map(norm)].join(' ');
      return tokens.some((t) => haystack.includes(t));
    };

    const coverageFor = (f: (typeof eligible)[number]): number => {
      if (required.length === 0) return 1;
      const have = new Set([...f.services, ...f.specialities].map(norm));
      const matched = required.filter((s) => {
        const n = norm(s);
        return [...have].some((h) => h.includes(n) || n.includes(h));
      });
      return matched.length / required.length;
    };

    const candidates: CandidateFeature[] = eligible.map((f) => ({
      candidateId: f._id.toString(),
      careTypeMatch: facilityTypeMatches(input.careType, f) ? 1 : 0,
      distanceKm: Math.round(haversineKm(userLat, userLng, f.coordinates.lat, f.coordinates.lng) * 100) / 100,
      budgetDifference: 0,
      availabilityMatch: 1,
      requiredSkillCoverage: coverageFor(f),
      verifiedStatus: 1,
      ratingScore: f.rating || 0,
      experienceYears: 0,
      hourlyRate: 0,
      totalReviews: f.reviewCount || 0,
      isAvailable: 1,
      isVerified: 1,
      emergencyServices: f.emergencyServices ? 1 : 0,
    }));

    const outcome = await rankCandidates(candidates, {
      careType: input.careType,
      location: input.location,
      limit: input.limit,
    });

    const facilityReasonCodes = (c: CandidateFeature, f: (typeof eligible)[number]): string[] => {
      const codes: string[] = [];
      if (c.careTypeMatch) codes.push('FACILITY_TYPE_MATCH');
      if (c.requiredSkillCoverage >= 0.5) codes.push('SERVICES_MATCH');
      if (c.distanceKm <= 10) codes.push('NEARBY');
      else if (c.distanceKm <= DEFAULT_MAX_DISTANCE_KM) codes.push('WITHIN_SERVICE_AREA');
      if (f.emergencyServices) codes.push('EMERGENCY_SERVICES');
      if (c.ratingScore >= 4) codes.push('HIGHLY_RATED');
      return codes;
    };

    const recommendations = eligible
      .map((f) => {
        const c = candidates.find((x) => x.candidateId === f._id.toString())!;
        return {
          ...f.toObject(),
          score: Math.round((outcome.scores.get(c.candidateId) || 0) * 1000) / 1000,
          distanceKm: c.distanceKm,
          reasonCodes: facilityReasonCodes(c, f),
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, input.limit);

    res.json({
      recommendations,
      total: recommendations.length,
      eligible: candidates.length,
      modelVersion: outcome.modelVersion,
      fallbackUsed: outcome.fallbackUsed,
      mlConfigured: mlServiceConfigured(),
    });
  } catch (error) {
    console.error('Facility recommendations error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/status', (_req, res: Response) => {
  res.json({ mlConfigured: mlServiceConfigured() });
});

export default router;
