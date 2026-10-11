# Dataset Card — Care Recommendation Pairs

## Summary
Synthetic dataset of `(user request, candidate)` pairs used to train and evaluate the
Care Recommendation Engine (Model A). **All rows are synthetic.** They are generated from
documented domain rules and do not contain real user, caregiver or booking data.

- **Rows:** 12,000 (`data/synthetic/care_pairs.csv`)
- **Query groups:** 1,500 (each group is one synthetic user request with 8 candidates)
- **Positive labels:** 1,375 (11.5%) — see the label rule below
- **License:** generated in-house for this project; no external redistribution

## Purpose
A row answers one question: *given this user request and this candidate listing,
is the candidate a relevant match?* It trains a supervised ranker that generalises the
label rule, so the ML service can score candidates that were never seen in training.

## Column schema
| Column | Type | Meaning |
|---|---|---|
| `careTypeMatch` | 0/1 | Candidate offers the requested type of care |
| `distanceKm` | float | Haversine distance between user and caregiver |
| `budgetDifference` | float | `hourlyRate - maxRate` (0 if no budget) |
| `availabilityMatch` | 0/1 | Candidate can serve the requested slot |
| `requiredSkillCoverage` | [0,1] | Fraction of required skills supported |
| `verifiedStatus` | 0/1 | Candidate verification confirmed |
| `ratingScore` | [0,5] | Average rating from reviews |
| `experienceYears` | int | Years of caregiving experience |
| `hourlyRate` | INR/hr | Candidate hourly rate |
| `totalReviews` | int | Number of reviews |
| `isAvailable` | 0/1 | Availability flag |
| `isVerified` | 0/1 | Verification flag |
| `emergencyServices` | 0/1 | Emergency-capable flag |
| `label` | 0/1 | Relevance label (see rule) |
| `_request_id` | string | Query group id (used only for leakage-safe splitting) |

## Label definition (documented rule)
A pair is **positive (1)** when **all** of these hold:

1. `careTypeMatch == 1`
2. `verifiedStatus == 1`
3. `availabilityMatch == 1`
4. `distanceKm <= maxDist` (drawn from 5–50 km per request)
5. budget satisfied: `hourlyRate <= maxRate` when the request sets a `maxRate`
6. `requiredSkillCoverage >= 0.5`

Otherwise the pair is **negative (0)**. A small fraction (8%) of labels are randomly
flipped by a fixed-seed RNG so the model cannot perfectly memorise the rule.

## Generation
- Cities: Delhi, Mumbai, Bangalore, Chennai, Hyderabad, Pune, Kolkata.
- Requests: random care type, 1–4 required skills, max rate (sometimes unset),
  max distance, start time, duration.
- Candidates: 60% located near the request; skill overlap drawn probabilistically;
  availability/verification/care-type flags sampled so both classes are well represented.
- Seeded with `random.Random(42)` / `random.Random(43)` for reproducibility.
- Pipeline: `ml-service/training/build_dataset.py` → `validate_data.py` → `train.py`.

## Known limitations
- **Synthetic, not real feedback.** The model learns to approximate the label rule;
  it has not learned real user preferences.
- No genuine satisfaction signal (no real ratings driven by user behaviour).
- No geographic pin-precision; coordinates are jittered city centres.
- Real interaction data (completed bookings, ratings, explicit preferences) is required
  before the model can claim real-world recommendation quality.

## Second, optional experiment (not used for recommendations)
The public **Medical Appointment No Shows** dataset (approx. 110,527 records, 14 variables,
CC BY-NC-SA 4.0) targets appointment *no-show* probability, a different prediction task.
If adopted, it must be handled under its own dataset card, its own license compliance
workflow, and its own evaluation (ROC-AUC, calibration) — not as recommendation training data.