import { rankResponseSchema, RankResponse } from '../validators/recommendation';

export interface CandidateFeature {
  candidateId: string;
  careTypeMatch: number;
  distanceKm: number;
  budgetDifference: number;
  availabilityMatch: number;
  requiredSkillCoverage: number;
  verifiedStatus: number;
  ratingScore: number;
  experienceYears?: number;
  hourlyRate?: number;
  totalReviews?: number;
  isAvailable?: number;
  isVerified?: number;
  emergencyServices?: number;
}

export interface RankContext {
  careType?: string;
  location?: { latitude: number; longitude: number };
  budget?: { maximumHourlyRate?: number; currency?: string };
  schedule?: { start?: string; durationHours?: number };
  limit?: number;
}

// Read configuration lazily. ES imports are hoisted above `dotenv.config()` in
// index.ts, so reading process.env at module load would miss values loaded from
// `.env` in local development.
const getMlServiceUrl = (): string => process.env.ML_SERVICE_URL || '';
const getMlServiceToken = (): string => process.env.ML_SERVICE_TOKEN || '';
const getMlTimeoutMs = (): number => {
  const parsed = parseInt(process.env.ML_TIMEOUT_MS || '800', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 800;
};

/**
 * Deterministic rule-based score used as the fallback whenever the ML service is
 * unavailable, times out, or returns an invalid payload. Mirrors the documented
 * scoring contract so ranking stays correct without ML.
 */
export const ruleBasedScore = (c: CandidateFeature): number => {
  const distScore = Math.max(0, 1 - Math.min(c.distanceKm / 15, 1));
  const ratingScore = Math.max(0, Math.min(c.ratingScore / 5, 1));
  const expScore = Math.min((c.experienceYears || 0) / 10, 1);
  let score =
    c.careTypeMatch * 0.3 +
    distScore * 0.25 +
    ratingScore * 0.25 +
    expScore * 0.1 +
    Math.max(0, Math.min(c.requiredSkillCoverage, 1)) * 0.1;
  score *= c.verifiedStatus;
  score *= c.availabilityMatch;
  score *= c.isAvailable === undefined ? 1 : c.isAvailable;
  return Math.max(0, Math.min(score, 1));
};

export interface RankOptions {
  candidates: CandidateFeature[];
  context?: RankContext;
}

export interface RankOutcome {
  modelVersion: string;
  fallbackUsed: boolean;
  scores: Map<string, number>;
}

/**
 * Calls the private Python ML inference service to score a batch of candidates.
 * Always resolves: on any failure it returns the deterministic fallback ranking.
 * The caller must still re-validate candidate IDs against its own eligible set.
 */
export const rankCandidates = async (
  candidates: CandidateFeature[],
  context: RankContext = {}
): Promise<RankOutcome> => {
  const fallback = (): RankOutcome => {
    const scores = new Map<string, number>();
    for (const c of candidates) scores.set(c.candidateId, ruleBasedScore(c));
    return { modelVersion: 'rule-based-fallback', fallbackUsed: true, scores };
  };

  const mlServiceUrl = getMlServiceUrl();
  if (!mlServiceUrl || candidates.length === 0) {
    return fallback();
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), getMlTimeoutMs());
  try {
    const token = getMlServiceToken();
    const response = await fetch(`${mlServiceUrl.replace(/\/$/, '')}/predict/rank`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        careType: context.careType || 'general',
        location: context.location,
        budget: context.budget,
        schedule: context.schedule,
        candidates,
        limit: context.limit || candidates.length,
      }),
      signal: controller.signal,
    });

    if (!response.ok) return fallback();

    const json = await response.json();
    const parsed = rankResponseSchema.safeParse(json);
    if (!parsed.success) return fallback();

    const valid: RankResponse = parsed.data;
    const eligibleIds = new Set(candidates.map((c) => c.candidateId));
    const scores = new Map<string, number>();
    for (const item of valid.results) {
      // Reject any candidate the model invented that was not in our eligible set.
      if (eligibleIds.has(item.candidateId) && Number.isFinite(item.score)) {
        scores.set(item.candidateId, Math.max(0, Math.min(item.score, 1)));
      }
    }

    if (scores.size === 0) return fallback();

    // Any eligible candidate missing from the model response keeps its fallback score.
    for (const c of candidates) {
      if (!scores.has(c.candidateId)) scores.set(c.candidateId, ruleBasedScore(c));
    }

    return { modelVersion: valid.modelVersion, fallbackUsed: valid.fallbackUsed, scores };
  } catch {
    return fallback();
  } finally {
    clearTimeout(timer);
  }
};

export const mlServiceConfigured = (): boolean => Boolean(getMlServiceUrl());
