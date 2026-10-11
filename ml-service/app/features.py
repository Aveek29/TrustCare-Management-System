from typing import List
from .schemas import CandidateFeature


def candidate_to_feature_vector(cand: CandidateFeature) -> List[float]:
    return [
        float(cand.careTypeMatch),
        float(cand.distanceKm),
        float(cand.budgetDifference),
        float(cand.availabilityMatch),
        float(cand.requiredSkillCoverage),
        float(cand.verifiedStatus),
        float(cand.ratingScore),
        float(cand.experienceYears),
        float(cand.hourlyRate),
        float(cand.totalReviews),
        float(cand.isAvailable),
        float(cand.isVerified),
        float(cand.emergencyServices),
    ]


def candidates_to_matrix(candidates: List[CandidateFeature]) -> List[List[float]]:
    return [candidate_to_feature_vector(c) for c in candidates]
