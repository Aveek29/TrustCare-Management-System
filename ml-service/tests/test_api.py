import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi.testclient import TestClient  # noqa: E402
from app.main import app  # noqa: E402

client = TestClient(app)


def _candidate(cid, **overrides):
    base = {
        "candidateId": cid,
        "careTypeMatch": 1,
        "distanceKm": 2.0,
        "budgetDifference": 0.0,
        "availabilityMatch": 1,
        "requiredSkillCoverage": 1.0,
        "verifiedStatus": 1,
        "ratingScore": 4.5,
        "experienceYears": 8,
        "hourlyRate": 300,
        "totalReviews": 20,
        "isAvailable": 1,
        "isVerified": 1,
        "emergencyServices": 0,
    }
    base.update(overrides)
    return base


def test_health():
    r = client.get("/health")
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "ok"
    assert "modelVersion" in body


def test_ready():
    r = client.get("/ready")
    assert r.status_code == 200
    assert "ready" in r.json()


def test_rank_empty():
    r = client.post("/predict/rank", json={"candidates": [], "limit": 5})
    assert r.status_code == 200
    body = r.json()
    assert body["results"] == []
    assert body["totalCandidates"] == 0


def test_rank_ordering_and_bounds():
    payload = {
        "careType": "elderly-care",
        "limit": 10,
        "candidates": [
            _candidate("good"),
            _candidate("far", distanceKm=40.0),
            _candidate("unavailable", availabilityMatch=0, isAvailable=0),
        ],
    }
    r = client.post("/predict/rank", json=payload)
    assert r.status_code == 200
    body = r.json()
    assert body["ranked"] == 3
    scores = {item["candidateId"]: item["score"] for item in body["results"]}
    assert all(0.0 <= s <= 1.0 for s in scores.values())
    assert scores["good"] > scores["far"]
    assert scores["good"] > scores["unavailable"]


def test_rule_based_fallback_hard_zero():
    """With no model loaded the deterministic fallback must score ineligible
    candidates as exactly zero."""
    from app.ranker import CareRanker
    from app.schemas import CandidateFeature

    r = CareRanker()
    r.model = None
    c = CandidateFeature(**_candidate("unavailable", availabilityMatch=0, isAvailable=0))
    results, used_ml = r.score_candidates([c])
    assert used_ml is False
    assert results[0].score == 0.0


def test_rank_rejects_invalid():
    r = client.post(
        "/predict/rank",
        json={"candidates": [_candidate("x", ratingScore=99)]},
    )
    assert r.status_code == 422


def test_limit_applied():
    payload = {
        "limit": 1,
        "candidates": [_candidate("a"), _candidate("b"), _candidate("c")],
    }
    r = client.post("/predict/rank", json=payload)
    assert r.status_code == 200
    assert len(r.json()["results"]) == 1
