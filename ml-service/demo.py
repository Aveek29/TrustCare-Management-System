"""
TrustCare - Care Recommendation Engine demo.

A single, presentation-friendly walkthrough of the ML feature:

    1. Dataset summary        (data/synthetic/care_pairs.csv)
    2. Model artifact          (ml-service/models/care_ranker.joblib)
    3. Offline evaluation      (docs/model-evaluation.json)
    4. Classification metrics  (recomputed on the held-out test split)
    5. Live ranking example    (ML vs deterministic rule baseline)
    6. Optional live HTTP call (FastAPI service on :8000)

Usage (from the repo root):
    python ml-service/demo.py
    python ml-service/demo.py --no-live
    python ml-service/demo.py --data path/to/care_pairs.csv

No network access is required unless the live ML service is running.
"""
import os
import sys
import csv
import json
import math
import argparse
import urllib.request
import urllib.error

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(BASE_DIR, ".."))
DEFAULT_DATA = os.path.join(ROOT, "data", "synthetic", "care_pairs.csv")
DEFAULT_MODEL = os.path.join(BASE_DIR, "models", "care_ranker.joblib")
DEFAULT_METRICS = os.path.join(ROOT, "docs", "model-evaluation.json")

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


def rule_score(c):
    """The same deterministic baseline used in training/evaluation."""
    dist_score = max(0.0, 1.0 - min(c["distanceKm"] / 15.0, 1.0))
    rating_score = c["ratingScore"] / 5.0
    exp_score = min(c["experienceYears"] / 10.0, 1.0)
    s = (
        c["careTypeMatch"] * 0.30
        + dist_score * 0.25
        + rating_score * 0.25
        + exp_score * 0.10
        + c["requiredSkillCoverage"] * 0.10
    )
    s *= c["verifiedStatus"] * c["availabilityMatch"] * c["isAvailable"]
    return float(max(0.0, min(s, 1.0)))


def banner(title):
    print()
    print("=" * 68)
    print(f" {title}")
    print("=" * 68)


def load_dataset(path):
    rows = []
    with open(path, newline="", encoding="utf-8") as fh:
        for r in csv.DictReader(fh):
            rows.append(r)
    return rows


def dataset_summary(rows):
    positives = sum(1 for r in rows if int(float(r["label"])) == 1)
    groups = {r["_request_id"] for r in rows}
    pct = (positives / len(rows) * 100) if rows else 0.0
    print(f"  File            : {os.path.relpath(DEFAULT_DATA, ROOT) if os.path.exists(DEFAULT_DATA) else 'n/a'}")
    print(f"  Rows            : {len(rows):,}  (user request, candidate pairs)")
    print(f"  Query groups    : {len(groups):,}")
    print(f"  Positive labels : {positives:,} ({pct:.1f}%)")
    print(f"  Label source    : documented synthetic relevance rule + seeded noise")
    print(f"  Features ({len(FEATURE_NAMES):>2})  : {', '.join(FEATURE_NAMES)}")


def model_summary(artifact):
    model = artifact["model"] if isinstance(artifact, dict) else artifact
    print(f"  Version         : {artifact.get('model_version', 'unknown') if isinstance(artifact, dict) else 'unknown'}")
    print(f"  Type            : {type(model).__name__}")
    print(f"  Trained at      : {artifact.get('trained_at', 'unknown') if isinstance(artifact, dict) else 'unknown'}")
    params = getattr(model, "get_params", lambda: {})()
    keys = ["n_estimators", "max_depth", "min_samples_leaf", "class_weight", "random_state"]
    shown = {k: params.get(k) for k in keys if k in params}
    if shown:
        print("  Hyperparameters : " + ", ".join(f"{k}={v}" for k, v in shown.items()))
    print(f"  Artifact        : {os.path.relpath(DEFAULT_MODEL, ROOT)}")
    return model


def offline_metrics(path):
    if not os.path.exists(path):
        print("  (metrics file not found - run training/train.py)")
        return
    with open(path, encoding="utf-8") as fh:
        report = json.load(fh)
    print(f"  Split           : train={report['split']['train']:,}  test={report['split']['test']:,}")
    print()
    print(f"  {'Model':<22}{'P@5':>8}{'R@5':>8}{'NDCG@5':>10}{'ROC-AUC':>10}")
    print("  " + "-" * 56)
    for r in report["test_results"]:
        name = r["model"].replace("_", " ").title()
        print(f"  {name:<22}{r['precision_at_k']:>8.4f}{r['recall_at_k']:>8.4f}"
              f"{r['ndcg_at_k']:>10.4f}{r['roc_auc']:>10.4f}")
    print()
    print(f"  Selected model  : {report['selected_model']}")
    print("  Note            : synthetic labels - proves pipeline + ranking skill,")
    print("                    not real-world quality.")


def classification_metrics(rows, model):
    """Recompute the exact held-out test split used by train.py."""
    try:
        import numpy as np
        from sklearn.model_selection import GroupShuffleSplit
        from sklearn.metrics import (
            accuracy_score, precision_score, recall_score, f1_score,
            roc_auc_score, confusion_matrix,
        )
    except Exception:
        print("  (scikit-learn not available - skipping)")
        return

    X = np.array([[float(r[c]) for c in FEATURE_NAMES] for r in rows], dtype=float)
    y = np.array([int(float(r["label"])) for r in rows], dtype=int)
    groups = np.array([r["_request_id"] for r in rows])
    gss = GroupShuffleSplit(n_splits=1, test_size=0.2, random_state=42)
    _, test_idx = next(gss.split(X, y, groups))
    Xte, yte = X[test_idx], y[test_idx]
    scores = model.predict_proba(Xte)[:, 1]
    preds = (scores >= 0.5).astype(int)

    tn, fp, fn, tp = confusion_matrix(yte, preds).ravel()
    majority = max(int(yte.sum()), int(len(yte) - yte.sum())) / len(yte)
    print(f"  Decision threshold : 0.50")
    print(f"  Accuracy           : {accuracy_score(yte, preds):.4f}   (majority-class baseline {majority:.3f})")
    print(f"  Precision          : {precision_score(yte, preds, zero_division=0):.4f}")
    print(f"  Recall             : {recall_score(yte, preds, zero_division=0):.4f}")
    print(f"  F1                 : {f1_score(yte, preds, zero_division=0):.4f}")
    print(f"  ROC-AUC            : {roc_auc_score(yte, scores):.4f}")
    print(f"  Confusion          : TP={tp}  FP={fp}  FN={fn}  TN={tn}")
    print("  Caveat             : the label is rare (~11.5%), so accuracy is not")
    print("                       the headline metric. Ranking (NDCG@5) and ROC-AUC are.")


def demo_candidates():
    """Small, readable candidate set for the live ranking example."""
    return [
        {"candidateId": "cg_001", "careTypeMatch": 1, "distanceKm": 2.4, "budgetDifference": 0,
         "availabilityMatch": 1, "requiredSkillCoverage": 1.0, "verifiedStatus": 1,
         "ratingScore": 4.8, "experienceYears": 8, "hourlyRate": 700, "totalReviews": 64,
         "isAvailable": 1, "isVerified": 1, "emergencyServices": 0},
        {"candidateId": "cg_002", "careTypeMatch": 1, "distanceKm": 4.1, "budgetDifference": 50,
         "availabilityMatch": 1, "requiredSkillCoverage": 0.8, "verifiedStatus": 1,
         "ratingScore": 4.5, "experienceYears": 5, "hourlyRate": 750, "totalReviews": 31,
         "isAvailable": 1, "isVerified": 1, "emergencyServices": 1},
        {"candidateId": "cg_003", "careTypeMatch": 1, "distanceKm": 9.7, "budgetDifference": 0,
         "availabilityMatch": 1, "requiredSkillCoverage": 0.6, "verifiedStatus": 1,
         "ratingScore": 4.9, "experienceYears": 12, "hourlyRate": 640, "totalReviews": 120,
         "isAvailable": 1, "isVerified": 1, "emergencyServices": 1},
        {"candidateId": "cg_004", "careTypeMatch": 0, "distanceKm": 1.2, "budgetDifference": 100,
         "availabilityMatch": 1, "requiredSkillCoverage": 0.4, "verifiedStatus": 1,
         "ratingScore": 4.7, "experienceYears": 9, "hourlyRate": 600, "totalReviews": 88,
         "isAvailable": 1, "isVerified": 1, "emergencyServices": 0},
        {"candidateId": "cg_005", "careTypeMatch": 1, "distanceKm": 12.8, "budgetDifference": 0,
         "availabilityMatch": 0, "requiredSkillCoverage": 0.9, "verifiedStatus": 0,
         "ratingScore": 3.9, "experienceYears": 2, "hourlyRate": 520, "totalReviews": 12,
         "isAvailable": 1, "isVerified": 0, "emergencyServices": 0},
        {"candidateId": "cg_006", "careTypeMatch": 1, "distanceKm": 6.0, "budgetDifference": 150,
         "availabilityMatch": 1, "requiredSkillCoverage": 0.7, "verifiedStatus": 1,
         "ratingScore": 4.1, "experienceYears": 3, "hourlyRate": 800, "totalReviews": 19,
         "isAvailable": 1, "isVerified": 1, "emergencyServices": 0},
    ]


def local_ranking(model, candidates):
    import numpy as np
    X = np.array([[c[k] for k in FEATURE_NAMES] for c in candidates], dtype=float)
    ml = list(model.predict_proba(X)[:, 1])
    rule = [rule_score(c) for c in candidates]
    ml_order = sorted(range(len(candidates)), key=lambda i: -ml[i])
    rule_order = sorted(range(len(candidates)), key=lambda i: -rule[i])
    ml_rank = {idx: pos + 1 for pos, idx in enumerate(ml_order)}
    rule_rank = {idx: pos + 1 for pos, idx in enumerate(rule_order)}

    print(f"  {'Candidate':<11}{'ML score':>10}{'Rule score':>12}{'ML rank':>9}{'Rule rank':>11}")
    print("  " + "-" * 53)
    for idx, c in enumerate(candidates):
        print(f"  {c['candidateId']:<11}{ml[idx]:>10.4f}{rule[idx]:>12.4f}"
              f"{ml_rank[idx]:>9}{rule_rank[idx]:>11}")
    print()
    print("  ML top pick : " + ", ".join(candidates[i]["candidateId"] for i in ml_order[:3]))
    print("  Rule top pick: " + ", ".join(candidates[i]["candidateId"] for i in rule_order[:3]))
    print("  Both orderings only re-rank candidates that already passed the")
    print("  hard eligibility constraints in Express.")


def live_service_check(candidates):
    """Optionally exercise the real FastAPI endpoint if it is running."""
    url = "http://127.0.0.1:8000/health"
    try:
        with urllib.request.urlopen(url, timeout=1.0) as resp:
            health = json.loads(resp.read().decode("utf-8"))
    except Exception:
        print("  Live service     : not running on :8000 (skipped)")
        print("  Start it with    : cd ml-service && uvicorn app.main:app --port 8000")
        return

    print(f"  Live service     : UP  modelLoaded={health.get('modelLoaded')} "
          f"version={health.get('modelVersion')}")
    payload = {
        "careType": "elderly-care",
        "budget": {"maximumHourlyRate": 800, "currency": "INR"},
        "candidates": candidates,
        "limit": 5,
    }
    req = urllib.request.Request(
        "http://127.0.0.1:8000/predict/rank",
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=3.0) as resp:
            body = json.loads(resp.read().decode("utf-8"))
    except Exception as exc:
        print(f"  Live request     : failed ({exc})")
        return
    print(f"  Live response    : modelVersion={body.get('modelVersion')} "
          f"fallbackUsed={body.get('fallbackUsed')} ranked={body.get('ranked')}")
    for item in body.get("results", [])[:5]:
        print(f"    {item['candidateId']:<11} score={item['score']:.4f}")


def main():
    parser = argparse.ArgumentParser(description="TrustCare Care Recommendation Engine demo")
    parser.add_argument("--data", default=DEFAULT_DATA)
    parser.add_argument("--model", default=DEFAULT_MODEL)
    parser.add_argument("--metrics", default=DEFAULT_METRICS)
    parser.add_argument("--no-live", action="store_true", help="skip the live HTTP check")
    args = parser.parse_args()

    print()
    print(" TrustCare - Care Recommendation Engine")
    print(" Model: care-ranker-v1  |  Random Forest  |  additive, fallback-safe")

    banner("1. DATASET")
    if not os.path.exists(args.data):
        print(f"  Dataset missing: {args.data}")
        print("  Build it with: python ml-service/training/build_dataset.py")
        return 1
    rows = load_dataset(args.data)
    dataset_summary(rows)

    banner("2. MODEL")
    if not os.path.exists(args.model):
        print(f"  Model missing: {args.model}")
        print("  Train it with: python ml-service/training/train.py")
        return 1
    try:
        import joblib
        artifact = joblib.load(args.model)
    except Exception as exc:
        print(f"  Could not load model: {exc}")
        return 1
    model = model_summary(artifact)

    banner("3. OFFLINE EVALUATION (held-out test)")
    offline_metrics(args.metrics)

    banner("4. CLASSIFICATION METRICS (held-out test)")
    classification_metrics(rows, model)

    banner("5. LOCAL RANKING EXAMPLE (ML vs rule)")
    candidates = demo_candidates()
    local_ranking(model, candidates)

    if not args.no_live:
        banner("6. LIVE FASTAPI CHECK")
        live_service_check(candidates)

    banner("DONE")
    print("  Docs: docs/research-paper-notes.md, docs/dataset-card.md,")
    print("        docs/ml-architecture.md, docs/model-evaluation.json")
    return 0


if __name__ == "__main__":
    sys.exit(main())
