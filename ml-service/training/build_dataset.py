"""
Build a reproducible synthetic training dataset for the Care Recommendation Engine.

Every row is a (user request, candidate) pair. Labels are generated from the
documented transparent rule in schema.py, with optional noise so the model does
not trivially memorize the exact rule.

Output: data/synthetic/care_pairs.csv
"""
import os
import sys
import csv
import random
import math
from datetime import datetime, timedelta

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from schema import FEATURE_NAMES, LABEL_NAME

RANDOM_SEED = 42

CARE_TYPES = [
    "elderly-care",
    "child-care",
    "medical-assistance",
    "post-surgery-care",
    "dementia-care",
    "palliative-care",
    "companionship",
    "physical-therapy",
]

CITIES = [
    ("Delhi", 28.7041, 77.1025),
    ("Mumbai", 19.0760, 72.8777),
    ("Bangalore", 12.9716, 77.5946),
    ("Chennai", 13.0827, 80.2707),
    ("Hyderabad", 17.3850, 78.4867),
    ("Pune", 18.5204, 73.8567),
    ("Kolkata", 22.5726, 88.3639),
]

SKILLS = [
    "Elderly Care",
    "Child Care",
    "Medical Assistance",
    "Physical Therapy",
    "Post-Surgery Care",
    "Dementia Care",
    "Palliative Care",
    "Companionship",
    "Medication Management",
    "Wound Care",
]


def haversine(lat1, lon1, lat2, lon2):
    r = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return r * c


def make_request(rng):
    city, lat, lng = rng.choice(CITIES)
    care_type = rng.choice(CARE_TYPES)
    num_req_skills = rng.randint(1, 4)
    required_skills = rng.sample(SKILLS, num_req_skills)
    max_rate = rng.choice([200, 300, 400, 500, 700, 1000, None])
    max_dist = rng.choice([5, 10, 15, 25, 50])
    start = datetime(2026, 10, 15) + timedelta(hours=rng.randint(0, 10))
    duration = rng.choice([1, 2, 4, 6, 8])
    return {
        "city": city,
        "lat": lat,
        "lng": lng,
        "care_type": care_type,
        "required_skills": required_skills,
        "max_rate": max_rate,
        "max_dist": max_dist,
        "start": start,
        "duration": duration,
    }


def make_candidate(rng, req):
    """Generate a candidate; sometimes deliberately far / unavailable / wrong type
    so the dataset contains both positives and negatives."""
    # 60% of candidates are "near" the request city; 40% random
    if rng.random() < 0.6:
        clat = req["lat"] + rng.uniform(-0.25, 0.25)
        clng = req["lng"] + rng.uniform(-0.25, 0.25)
    else:
        _, clat, clng = rng.choice(CITIES)
        clat += rng.uniform(-0.3, 0.3)
        clng += rng.uniform(-0.3, 0.3)

    distance_km = haversine(req["lat"], req["lng"], clat, clng)

    # Candidate skills: overlap with required skills with some probability
    if rng.random() < 0.65:
        k = rng.randint(1, len(req["required_skills"]))
        req_covered = rng.sample(req["required_skills"], k)
    else:
        req_covered = []
    extra = rng.sample(SKILLS, rng.randint(0, 3))
    candidate_skills = list(set(req_covered + extra))

    coverage = (
        len(set(s.lower() for s in candidate_skills) & set(s.lower() for s in req["required_skills"]))
        / max(1, len(req["required_skills"]))
    )

    # Care type match: candidate has an explicit specialisation flag
    care_type_match = 1 if rng.random() < 0.7 else 0

    hourly_rate = rng.choice([150, 200, 250, 300, 400, 500, 600, 800, 1000])
    budget_difference = (
        max(0.0, hourly_rate - req["max_rate"]) if req["max_rate"] is not None else 0.0
    )

    availability_match = 1 if rng.random() < 0.75 else 0
    is_available = 1 if rng.random() < 0.85 else 0
    verified_status = 1 if rng.random() < 0.7 else 0
    is_verified = verified_status if rng.random() < 0.9 else (1 if rng.random() < 0.5 else 0)
    rating = round(rng.uniform(2.5, 5.0), 1)
    experience = rng.randint(0, 15)
    total_reviews = rng.randint(0, 60)
    emergency = 1 if rng.random() < 0.3 else 0

    return {
        "careTypeMatch": care_type_match,
        "distanceKm": round(distance_km, 3),
        "budgetDifference": round(budget_difference, 2),
        "availabilityMatch": availability_match,
        "requiredSkillCoverage": round(coverage, 3),
        "verifiedStatus": verified_status,
        "ratingScore": rating,
        "experienceYears": experience,
        "hourlyRate": hourly_rate,
        "totalReviews": total_reviews,
        "isAvailable": is_available,
        "isVerified": is_verified,
        "emergencyServices": emergency,
        "_request_id": req["_request_id"],
    }


def generate_label(cand, req, noise_rng, noise_rate=0.08):
    rule_positive = (
        cand["careTypeMatch"] == 1
        and cand["verifiedStatus"] == 1
        and cand["availabilityMatch"] == 1
        and cand["distanceKm"] <= req["max_dist"]
        and (req["max_rate"] is None or cand["hourlyRate"] <= req["max_rate"])
        and cand["requiredSkillCoverage"] >= 0.5
    )
    label = 1 if rule_positive else 0
    # Flip a small fraction so the model cannot perfectly memorize the rule.
    if noise_rng.random() < noise_rate:
        label = 1 - label
    return label


def build(num_requests=1500, candidates_per_request=8, noise_rate=0.08, output_path=None):
    rng = random.Random(RANDOM_SEED)
    noise_rng = random.Random(RANDOM_SEED + 1)

    rows = []
    for i in range(num_requests):
        req = make_request(rng)
        req["_request_id"] = f"req_{i:05d}"
        for _ in range(candidates_per_request):
            cand = make_candidate(rng, req)
            label = generate_label(cand, req, noise_rng, noise_rate)
            row = {name: cand[name] for name in FEATURE_NAMES}
            row["_request_id"] = cand["_request_id"]
            row[LABEL_NAME] = label
            rows.append(row)

    if output_path:
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        fieldnames = FEATURE_NAMES + ["_request_id", LABEL_NAME]
        with open(output_path, "w", newline="", encoding="utf-8") as fh:
            writer = csv.DictWriter(fh, fieldnames=fieldnames)
            writer.writeheader()
            for row in rows:
                writer.writerow(row)

    positives = sum(r[LABEL_NAME] for r in rows)
    print(f"Built {len(rows)} rows ({positives} positive, {len(rows) - positives} negative)")
    return rows


if __name__ == "__main__":
    default_out = os.path.join(
        os.path.dirname(os.path.abspath(__file__)),
        "..",
        "..",
        "data",
        "synthetic",
        "care_pairs.csv",
    )
    out = sys.argv[1] if len(sys.argv) > 1 else default_out
    build(output_path=os.path.abspath(out))
