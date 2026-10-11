# ML Architecture — Care Recommendation Engine

## Position in the system
The ML feature is an **additive, independently testable module**. Nothing about the
existing authentication, booking, payment, review or search flows was rewritten.

- **Frontend** (Next.js / Vercel): unchanged; can consume the new endpoint later.
- **Express API** (Render): new additive route `GET /api/recommendations/caregivers`
  plus a private client in `backend/src/services/recommendationClient.ts`.
- **ML inference service** (new, FastAPI / Python): `ml-service/`.
- **MongoDB Atlas**: unchanged; candidates are fetched by Express, never by Python.
- **Redis / BullMQ**: unchanged; model training is an offline job, not required for search.

```
Browser ─→ Next.js (existing) ─→ Express API (existing) ─→ MongoDB (eligible candidates)
                                     │  private call, short timeout, batched
                                     ▼
                              FastAPI ML service  ─→ model artifact (joblib)
                                     (scores eligible candidates only)
```
The browser never receives model files or ML credentials.

## Two stages: eligibility, then ranking
1. **Hard constraints (Express, deterministic):** verified, available, care-type
   compatible, within budget and within service distance. These are ordinary backend
   rules — fully testable, and they run **before** any ML call.
2. **ML ranking (FastAPI):** the model returns a bounded relevance score per candidate.
   Express validates that returned IDs belong to the eligible set, that scores are
   finite and in `[0,1]`, then orders and returns.

## Endpoints
| Endpoint | Owner |
|---|---|
| `GET /api/recommendations/caregivers` | Express (public, additive) |
| `GET /api/recommendations/status` | Express (reports whether ML is configured) |
| `POST /predict/rank` | FastAPI (private, service-to-service only) |
| `GET /health`, `GET /ready` | FastAPI (load/liveness) |

## Failure handling (fallback-first)
- **ML unreachable / timeout** → deterministic rule-based fallback; search never blocks.
- **Missing/corrupt artifact** → `/ready` reports not-ready; `/predict/rank` still works
  via the rule-based scorer.
- **Invalid payload from ML** (out-of-set IDs, non-finite scores, schema mismatch)
  → rejected by Zod in Express; fallback scores used for missing candidates.
- **No eligible candidates** → empty result with a helpful message.
- **Availability changing after ranking** → booking creation still runs through the
  existing booking route and reserves atomically; recommendations are re-verified by
  the booking logic at booking time.

## Training vs inference (kept separate)
- Training: `ml-service/training/*` (`build_dataset.py`, `validate_data.py`, `train.py`,
  `evaluate.py`) — offline, seeded, reproducible.
- Inference: `ml-service/app/*` loads the artifact once at startup.
- Artifact recorded with `model_version`, `feature_names`, training time and label
  definition in `ml-service/models/care_ranker.joblib`.
- Metrics snapshot: `docs/model-evaluation.json`.

## Evaluation (run on the current synthetic set — see dataset-card.md)
| Metric | Rule baseline | Random Forest (selected) |
|---|---|---|
| Precision@5 | 0.1420 | **0.1447** |
| Recall@5 | 0.4791 | **0.4949** |
| NDCG@5 | 0.3599 | **0.3956** |
| ROC-AUC | 0.6501 | **0.6895** |
| Latency | — | **0.051 ms/row** |

Validated alternatives: Logistic Regression (NDCG@5 0.3259), Gradient Boosting
(NDCG@5 0.3180) both underperformed the Random Forest on the validation split.

**Honesty note:** these numbers are measured on a synthetic dataset with rule-generated
(noised) labels. They prove the pipeline, the split methodology (grouped by request to
avoid leakage), the ranking quality of the model versus a baseline, and end-to-end
integration. They do **not** prove real-world recommendation quality, which requires
consented real interaction data.

## Configuration
Backend env vars:
- `ML_SERVICE_URL` — private FastAPI base URL (empty = ML disabled, fallback always used)
- `ML_SERVICE_TOKEN` — optional bearer token for service-to-service auth
- `ML_TIMEOUT_MS` — strict inference timeout (default 800 ms → fallback)

ML service env vars:
- `CARE_RANKER_MODEL_PATH` — path to the model artifact (default `models/care_ranker.joblib`)

## Runbook
```bash
# 1. Build the dataset, validate, train, evaluate (offline)
cd ml-service/training
python build_dataset.py
python validate_data.py
python train.py
python evaluate.py

# 2. Run the ML service
cd ml-service
uvicorn app.main:app --host 0.0.0.0 --port 8000

# 3. Run tests
python -m pytest ../ml-service/tests -q            # ML service tests
cd ../../backend && npm run test:recommend        # Express fallback + integration tests
```

## Deployment (additive)
`render.yaml` and `docker-compose.yml` are updated with the new `trustcare-ml` service
(unmodified existing services remain). The Express API keeps its own deployment; it now
reads `ML_SERVICE_URL` at runtime.

## Report structure
See the project's `PROJECT_REPORT.md` and the following docs for the write-up:
- `docs/dataset-card.md` — data source, schema, label rule, limitations
- `docs/model-evaluation.json` — measured metrics, split, selected model
- `docs/ml-architecture.md` — this document