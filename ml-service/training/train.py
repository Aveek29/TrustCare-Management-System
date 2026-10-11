"""
Train and evaluate candidate ranking models for the Care Recommendation Engine.

Pipeline:
  1. Load the documented synthetic dataset (data/synthetic/care_pairs.csv).
  2. Split by query/scenario (_request_id) to prevent leakage.
  3. Build a deterministic rule-based baseline.
  4. Train Logistic Regression, Random Forest and Gradient Boosting candidates.
  5. Evaluate with ranking metrics (Precision@K, Recall@K, NDCG@K).
  6. Save the best artifact (model + version + feature schema) for the API.

The saved artifact is consumed by ml-service/app/ranker.py.
"""
import os
import sys
import json
import time
import csv
import math
from datetime import datetime, timezone

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from schema import FEATURE_NAMES, LABEL_NAME, MODEL_VERSION

try:
    import numpy as np
    import joblib
    from sklearn.linear_model import LogisticRegression
    from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
    from sklearn.model_selection import GroupShuffleSplit
    from sklearn.metrics import roc_auc_score
except Exception as exc:  # pragma: no cover
    print(f"Training dependencies missing: {exc}")
    sys.exit(1)


BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(BASE_DIR, "..", ".."))
DEFAULT_DATA = os.path.join(ROOT, "data", "synthetic", "care_pairs.csv")
MODEL_DIR = os.path.join(os.path.dirname(BASE_DIR), "models")
METRICS_PATH = os.path.join(ROOT, "docs", "model-evaluation.json")


def load_data(path):
    X, y, groups, rows = [], [], [], []
    with open(path, newline="", encoding="utf-8") as fh:
        reader = csv.DictReader(fh)
        for r in reader:
            X.append([float(r[c]) for c in FEATURE_NAMES])
            y.append(int(float(r[LABEL_NAME])))
            groups.append(r["_request_id"])
            rows.append(r)
    return np.array(X, dtype=float), np.array(y, dtype=int), np.array(groups), rows


def rule_baseline_score(x):
    care_type_match = x[0]
    distance_km = x[1]
    availability_match = x[3]
    coverage = x[4]
    verified = x[5]
    rating = x[6]
    experience = x[7]
    is_available = x[10]
    dist_score = max(0.0, 1.0 - min(distance_km / 15.0, 1.0))
    rating_score = rating / 5.0
    exp_score = min(experience / 10.0, 1.0)
    score = (
        care_type_match * 0.30
        + dist_score * 0.25
        + rating_score * 0.25
        + exp_score * 0.10
        + coverage * 0.10
    )
    score *= verified * availability_match * is_available
    return float(max(0.0, min(score, 1.0)))


def precision_at_k(scores, labels, k):
    order = np.argsort(-np.asarray(scores))[:k]
    if len(order) == 0:
        return 0.0
    return float(np.mean([labels[i] for i in order]))


def recall_at_k(scores, labels, k):
    order = np.argsort(-np.asarray(scores))[:k]
    total_pos = int(np.sum(labels))
    if total_pos == 0:
        return 0.0
    return float(np.sum([labels[i] for i in order]) / total_pos)


def ndcg_at_k(scores, labels, k):
    order = np.argsort(-np.asarray(scores))[:k]
    gains = np.array([labels[i] for i in order], dtype=float)
    discounts = 1.0 / np.log2(np.arange(2, len(gains) + 2))
    dcg = float(np.sum(gains * discounts))
    ideal = np.sort(np.asarray(labels, dtype=float))[::-1][:k]
    idcg = float(np.sum(ideal * discounts[: len(ideal)]))
    if idcg == 0:
        return 0.0
    return dcg / idcg


def group_ranking_metrics(scores, y, groups, k=5):
    unique = {}
    for i, g in enumerate(groups):
        unique.setdefault(g, []).append(i)
    p, r, n = [], [], []
    for _, idxs in unique.items():
        s = np.array([scores[i] for i in idxs])
        l = np.array([y[i] for i in idxs])
        p.append(precision_at_k(s, l, k))
        r.append(recall_at_k(s, l, k))
        n.append(ndcg_at_k(s, l, k))
    return float(np.mean(p)), float(np.mean(r)), float(np.mean(n))


def evaluate_model(name, scores, y, groups, k=5):
    p, r, nd = group_ranking_metrics(scores, y, groups, k)
    try:
        auc = float(roc_auc_score(y, scores))
    except Exception:
        auc = float("nan")
    return {"model": name, "precision_at_k": p, "recall_at_k": r, "ndcg_at_k": nd, "roc_auc": auc, "k": k}


def main():
    data_path = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_DATA
    if not os.path.exists(data_path):
        print(f"Dataset not found at {data_path}. Run build_dataset.py first.")
        sys.exit(1)

    X, y, groups, _ = load_data(data_path)
    print(f"Loaded {len(X)} rows, {len(set(groups))} query groups")

    gss = GroupShuffleSplit(n_splits=1, test_size=0.2, random_state=42)
    train_idx, test_idx = next(gss.split(X, y, groups))
    Xtr, ytr, gtr = X[train_idx], y[train_idx], groups[train_idx]
    Xte, yte, gte = X[test_idx], y[test_idx], groups[test_idx]

    gss2 = GroupShuffleSplit(n_splits=1, test_size=0.25, random_state=7)
    tr2_idx, val_idx = next(gss2.split(Xtr, ytr, gtr))
    Xval, yval, gval = Xtr[val_idx], ytr[val_idx], gtr[val_idx]
    Xtr2, ytr2 = Xtr[tr2_idx], ytr[tr2_idx]

    results = []

    # Rule-based baseline
    base_scores = np.array([rule_baseline_score(x) for x in Xte])
    results.append(evaluate_model("rule_baseline", base_scores, yte, gte))

    candidates = {}

    lr = LogisticRegression(max_iter=3000, class_weight="balanced")
    lr.fit(Xtr2, ytr2)
    candidates["logistic_regression"] = lr

    rf = RandomForestClassifier(
        n_estimators=300,
        max_depth=12,
        min_samples_leaf=5,
        class_weight="balanced",
        random_state=42,
        n_jobs=-1,
    )
    rf.fit(Xtr2, ytr2)
    candidates["random_forest"] = rf

    gb = GradientBoostingClassifier(n_estimators=200, max_depth=3, random_state=42)
    gb.fit(Xtr2, ytr2)
    candidates["gradient_boosting"] = gb

    val_results = []
    for name, model in candidates.items():
        scores = model.predict_proba(Xval)[:, 1]
        val_results.append(evaluate_model(name, scores, yval, gval))

    best_name = max(val_results, key=lambda r: (r["ndcg_at_k"], r["precision_at_k"]))["model"]
    print(f"Best model on validation (by NDCG@5): {best_name}")

    # Retrain best on full train set
    best_model = candidates[best_name]
    best_model.fit(Xtr, ytr)
    test_scores = best_model.predict_proba(Xte)[:, 1]
    best_metrics = evaluate_model(best_name, test_scores, yte, gte)
    results.append(best_metrics)

    os.makedirs(MODEL_DIR, exist_ok=True)
    artifact = {
        "model": best_model,
        "model_version": MODEL_VERSION,
        "model_type": best_name,
        "feature_names": FEATURE_NAMES,
        "trained_at": datetime.now(timezone.utc).isoformat(),
        "label_definition": "documented synthetic relevance rule (see training/schema.py)",
    }
    model_path = os.path.join(MODEL_DIR, "care_ranker.joblib")
    joblib.dump(artifact, model_path)

    os.makedirs(os.path.dirname(METRICS_PATH), exist_ok=True)
    report = {
        "dataset": os.path.relpath(data_path, ROOT),
        "rows": int(len(X)),
        "query_groups": int(len(set(groups))),
        "split": {"train": int(len(Xtr)), "test": int(len(Xte))},
        "validation_results": val_results,
        "test_results": results,
        "selected_model": best_name,
        "model_path": os.path.relpath(model_path, ROOT),
        "note": "Metrics computed on a synthetic dataset with rule-generated labels. They demonstrate pipeline correctness, not real-world recommendation quality.",
    }
    with open(METRICS_PATH, "w", encoding="utf-8") as fh:
        json.dump(report, fh, indent=2)

    print(json.dumps(report, indent=2))
    print(f"\nSaved model artifact to {model_path}")
    print(f"Saved metrics to {METRICS_PATH}")


if __name__ == "__main__":
    main()
