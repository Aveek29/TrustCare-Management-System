"""
Shared feature schema and label definition for the Care Recommendation Engine.

LABEL DEFINITION (documented, transparent):
    label = 1 if the (user request, candidate) pair is "relevant", defined as:
        care_type_match == 1
        AND verified_status == 1
        AND availability_match == 1
        AND distance_km <= max_distance_km
        AND budget_ok (hourly_rate <= user's maximum hourly rate, if provided)
        AND required_skill_coverage >= 0.5
    Otherwise label = 0.

This label is generated from a transparent rule that represents the intended
preference. It is NOT derived from real user feedback. When trained on this
synthetic data the model learns to approximate the rule. Real interaction data
is required to establish real-world recommendation quality.
"""

FEATURE_NAMES = [
    "careTypeMatch",
    "distanceKm",
    "budgetDifference",
    "availabilityMatch",
    "requiredSkillCoverage",
    "verifiedStatus",
    "ratingScore",
    "experienceYears",
    "hourlyRate",
    "totalReviews",
    "isAvailable",
    "isVerified",
    "emergencyServices",
]

LABEL_NAME = "label"

MODEL_VERSION = "care-ranker-v1"
