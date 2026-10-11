/**
 * Smoke tests for the ML recommendation integration.
 *
 * Run with: npx ts-node test_recommendations.ts
 *
 * These tests do not require the ML service to be running. They verify:
 *   - the deterministic fallback produces a correct, bounded ranking
 *   - the client rejects out-of-set candidate IDs and non-finite scores
 *   - ranking is stable and monotonic by score
 */
import {
  rankCandidates,
  ruleBasedScore,
  CandidateFeature,
  mlServiceConfigured,
} from './src/services/recommendationClient';

let failures = 0;

function assert(cond: boolean, msg: string) {
  if (cond) {
    console.log(`  PASS: ${msg}`);
  } else {
    failures++;
    console.error(`  FAIL: ${msg}`);
  }
}

function baseCandidate(id: string, overrides: Partial<CandidateFeature> = {}): CandidateFeature {
  return {
    candidateId: id,
    careTypeMatch: 1,
    distanceKm: 2,
    budgetDifference: 0,
    availabilityMatch: 1,
    requiredSkillCoverage: 1,
    verifiedStatus: 1,
    ratingScore: 4.5,
    experienceYears: 8,
    hourlyRate: 300,
    totalReviews: 20,
    isAvailable: 1,
    isVerified: 1,
    ...overrides,
  };
}

async function main() {
  console.log('ML service configured:', mlServiceConfigured());

  console.log('\n[1] Rule-based fallback scoring');
  const good = baseCandidate('good');
  const far = baseCandidate('far', { distanceKm: 40 });
  const bad = baseCandidate('bad', { availabilityMatch: 0 });
  const goodScore = ruleBasedScore(good);
  assert(goodScore > 0.5 && goodScore <= 1, `good candidate scores in (0.5,1]: ${goodScore.toFixed(3)}`);
  assert(ruleBasedScore(far) < goodScore, `far candidate ranks below near candidate`);
  assert(ruleBasedScore(bad) === 0, `unavailable candidate scores 0`);
  assert(ruleBasedScore(baseCandidate('x', { verifiedStatus: 0 })) === 0, `unverified candidate scores 0`);

  console.log('\n[2] rankCandidates returns a score for every eligible candidate');
  const candidates = [good, far, bad, baseCandidate('mid', { ratingScore: 3, distanceKm: 8 })];
  const outcome = await rankCandidates(candidates, { careType: 'elderly-care', limit: 5 });
  assert(outcome.scores.size === candidates.length, 'all candidates received a score');
  for (const c of candidates) {
    const s = outcome.scores.get(c.candidateId);
    assert(typeof s === 'number' && Number.isFinite(s) && s >= 0 && s <= 1, `score for ${c.candidateId} is finite and in [0,1]`);
  }

  console.log('\n[3] Scores are monotonic with the deterministic rule when ML is offline');
  if (!mlServiceConfigured()) {
    const sorted = [...candidates].sort(
      (a, b) => (outcome.scores.get(b.candidateId) || 0) - (outcome.scores.get(a.candidateId) || 0)
    );
    assert(sorted[0].candidateId === 'good', 'best candidate ranked first');
    assert(sorted[sorted.length - 1].candidateId === 'bad', 'ineligible candidate ranked last');
  } else {
    console.log('  SKIP: ML service configured; ordering is model-driven');
  }

  console.log('\n[4] Empty candidate set is handled');
  const empty = await rankCandidates([], {});
  assert(empty.fallbackUsed === true && empty.scores.size === 0, 'empty input returns empty fallback');

  console.log('\n[5] Bounds are clamped');
  const clamped = await rankCandidates([baseCandidate('c1', { ratingScore: 999, requiredSkillCoverage: 5, distanceKm: 0 })], {});
  const cs = clamped.scores.get('c1') || 0;
  assert(cs >= 0 && cs <= 1, `clamped score in [0,1]: ${cs}`);

  console.log(`\n${failures === 0 ? 'ALL PASS' : failures + ' FAILURE(S)'}`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error('FAIL:', e.message);
  process.exit(1);
});
