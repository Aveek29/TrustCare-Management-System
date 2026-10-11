import os
import time
from typing import List, Optional, Tuple
import numpy as np
from pathlib import Path

try:
    import joblib
    from sklearn.ensemble import RandomForestClassifier
except Exception:
    joblib = None
    RandomForestClassifier = None

from .schemas import CandidateFeature, RankResultItem


class CareRanker:
    def __init__(self) -> None:
        self.model = None
        self.model_version = "care-ranker-v1-rulebased"
        self.feature_names = [
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
        self.loaded_at = time.time()
        self._load_model()

    def _load_model(self) -> None:
        model_path = os.getenv("CARE_RANKER_MODEL_PATH", "models/care_ranker.joblib")
        p = Path(model_path)
        if p.exists() and joblib is not None and p.is_file():
            try:
                artifact = joblib.load(p)
                if isinstance(artifact, dict):
                    self.model = artifact.get("model")
                    ver = artifact.get("model_version") or "care-ranker-v1"
                else:
                    self.model = artifact
                    ver = "care-ranker-v1"
                if self.model is not None:
                    self.model_version = ver
                else:
                    self.model_version = "care-ranker-v1-rulebased"
            except Exception:
                self.model = None
                self.model_version = "care-ranker-v1-rulebased"
        else:
            self.model = None
            self.model_version = "care-ranker-v1-rulebased"

    def _rule_based_score(self, c: CandidateFeature) -> float:
        s = 0.0
        s += float(c.careTypeMatch) * 0.30
        dist = float(c.distanceKm)
        dist_score = max(0.0, 1.0 - min(dist / 15.0, 1.0))
        s += dist_score * 0.25
        rating = float(c.ratingScore)
        rating_score = rating / 5.0 if rating >= 0 else 0.0
        s += rating_score * 0.25
        exp_score = min(float(c.experienceYears) / 10.0, 1.0)
        s += exp_score * 0.10
        cov = float(c.requiredSkillCoverage)
        s += cov * 0.10
        s = s * float(c.verifiedStatus)
        s = s * float(c.availabilityMatch)
        s = s * float(c.isAvailable)
        s = max(0.0, min(s, 1.0))
        return float(s)

    def score_candidates(
        self, candidates: List[CandidateFeature]
    ) -> Tuple[List[RankResultItem], bool]:
        if len(candidates) == 0:
            return [], False

        results: List[RankResultItem] = []
        used_ml = False

        if self.model is not None:
            try:
                X = np.array(
                    [
                        [
                            float(c.careTypeMatch),
                            float(c.distanceKm),
                            float(c.budgetDifference),
                            float(c.availabilityMatch),
                            float(c.requiredSkillCoverage),
                            float(c.verifiedStatus),
                            float(c.ratingScore),
                            float(c.experienceYears),
                            float(c.hourlyRate),
                            float(c.totalReviews),
                            float(c.isAvailable),
                            float(c.isVerified),
                            float(c.emergencyServices),
                        ]
                        for c in candidates
                    ],
                    dtype=float,
                )
                if hasattr(self.model, "predict_proba"):
                    proba = self.model.predict_proba(X)
                    if proba.ndim == 2 and proba.shape[1] > 1:
                        scores = proba[:, 1].tolist()
                    else:
                        scores = proba.ravel().tolist()
                elif hasattr(self.model, "decision_function"):
                    df = self.model.decision_function(X)
                    if df.ndim == 1:
                        scores = (1.0 / (1.0 + np.exp(-df))).tolist()
                    else:
                        scores = (1.0 / (1.0 + np.exp(-df[:, -1]))).tolist()
                elif hasattr(self.model, "predict"):
                    preds = self.model.predict(X)
                    scores = preds.astype(float).tolist()
                else:
                    scores = [self._rule_based_score(c) for c in candidates]
                for c, sc in zip(candidates, scores):
                    s = float(max(0.0, min(sc, 1.0)))
                    results.append(
                        RankResultItem(
                            candidateId=c.candidateId,
                            score=s,
                            reasonCodes=[],
                        )
                    )
                used_ml = True
            except Exception:
                results = []
                used_ml = False

        if not results:
            for c in candidates:
                s = self._rule_based_score(c)
                results.append(
                    RankResultItem(
                        candidateId=c.candidateId,
                        score=s,
                        reasonCodes=[],
                    )
                )
            used_ml = False

        results.sort(key=lambda x: x.score, reverse=True)
        return results, used_ml
