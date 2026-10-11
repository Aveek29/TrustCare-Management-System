# Research Notes — Care Recommendation Engine (TrustCare / CareSphere)

> Everything below was measured from this repository. Numbers come from
> `docs/model-evaluation.json` and a fresh `ml-service/training/evaluate.py` run.
> Read the "Honest interpretation" section before writing results — the accuracy
> figure is easy to misread.

---

## 1. Problem statement

Given a user's care requirement (care type, location, budget, required skills,
schedule), rank the most suitable caregivers (and healthcare facilities).
This is a **recommendation / learning-to-rank** problem, not a diagnosis or
no-show prediction problem.

A second, deliberately separate future feature is demand forecasting; it is
**not** part of this implementation.

## 2. System design (two stages)

1. **Hard eligibility constraints (deterministic, in the Express backend):**
   candidate must be verified, available, care-type compatible, within budget,
   and within a service radius. Runs **before** any ML call.
2. **ML ranking (private FastAPI service):** a supervised classifier outputs a
   relevance probability per *eligible* candidate; the backend orders by that
   score and returns the top-K.

Key property: the model can only re-order candidates that already passed the
hard rules. It cannot invent candidates, violate constraints, book, or move money.

## 3. Dataset

### 3.1 Primary dataset (used to train and evaluate the model)
- **Name:** Care Recommendation Pairs (synthetic, generated in-repo)
- **File:** `data/synthetic/care_pairs.csv`
- **Size:** **12,000 rows** = 1,500 user requests × 8 candidate listings each
- **Query groups:** 1,500 (`_request_id`) — used for leakage-safe splitting
- **Class balance:** 1,375 positive (11.5%) / 10,625 negative (88.5%)
- **Generation:** `ml-service/training/build_dataset.py`, seeded (`random.Random(42)`, noise RNG seed 43) for reproducibility
- **Domain space:** 8 care types, 10 skills, 7 Indian cities
  (Delhi, Mumbai, Bangalore, Chennai, Hyderabad, Pune, Kolkata)
- **Synthetic noise:** 8% of labels are randomly flipped so the model cannot
  perfectly memorise the rule.

**Label definition (transparent rule; documented in `training/schema.py`):**
`label = 1` iff ALL hold:
`careTypeMatch == 1` AND `verifiedStatus == 1` AND `availabilityMatch == 1`
AND `distanceKm <= maxDistance` AND `hourlyRate <= maxRate` (when set)
AND `requiredSkillCoverage >= 0.5`; otherwise `label = 0`.

**Critical limitation (state this in the paper):** labels come from a rule, not
from real user feedback. The model learns to *approximate the rule*. This proves
the pipeline and the ranking methodology; it does **not** establish real-world
recommendation quality. Real, consented interaction data is required for that.

### 3.2 Operational data (used at inference, not for training)
Real facility/caregiver records already in TrustCare's MongoDB:
50 seeded healthcare facilities collected from **OpenStreetMap (Nominatim)** and
**Wikidata (SPARQL)**; 50 caregivers with skills, rates, ratings, availability.
These give the domain features for live ranking (distance, category, budget).

### 3.3 External datasets (optional, NOT used for recommendations)
- **Medical Appointment No Shows** (Kaggle): ~110,527 records, 14 variables,
  license **CC BY-NC-SA 4.0**. Target = missed appointment (a *different* task).
- **Free Synthetic Clinic Appointment Scheduling** (Hugging Face): synthetic
  scheduling records for capacity-planning modelling.

These are suitable only for the separate **no-show** experiment, never as
caregiver-preference training data.

## 4. Features (13)

| # | Feature | Type | Meaning |
|---|---|---|---|
| 1 | careTypeMatch | 0/1 | Candidate offers the requested care type |
| 2 | distanceKm | float | Haversine user↔candidate distance |
| 3 | budgetDifference | float | hourlyRate − maxRate (0 if no budget) |
| 4 | availabilityMatch | 0/1 | Can serve requested slot |
| 5 | requiredSkillCoverage | [0,1] | Fraction of required skills covered |
| 6 | verifiedStatus | 0/1 | Verification confirmed |
| 7 | ratingScore | [0,5] | Average review rating |
| 8 | experienceYears | int | Years of experience |
| 9 | hourlyRate | INR/hr | Candidate rate |
| 10 | totalReviews | int | Number of reviews |
| 11 | isAvailable | 0/1 | Availability flag |
| 12 | isVerified | 0/1 | Verification flag |
| 13 | emergencyServices | 0/1 | Emergency-capable capability |

## 5. Algorithms compared

| Model | Library | Key hyperparameters |
|---|---|---|
| Rule-based baseline | custom | weights: careType .30, distance .25, rating .25, experience .10, coverage .10, × verified × availability × isAvailable |
| Logistic Regression | scikit-learn | `max_iter=3000`, `class_weight="balanced"` |
| **Random Forest (selected)** | scikit-learn | `n_estimators=300`, `max_depth=12`, `min_samples_leaf=5`, `class_weight="balanced"`, `random_state=42` |
| Gradient Boosting | scikit-learn | `n_estimators=200`, `max_depth=3`, `random_state=42` |

Model selection: highest **NDCG@5** on a held-out validation split.
The ranking score at inference = `predict_proba(...)[:, 1]` (probability of the
positive/relevant class).

## 6. Evaluation methodology

- **Split:** `GroupShuffleSplit` on `_request_id` so all candidates of one request
  stay in the same split — prevents leakage.
  - Train/test = 80/20 → **9,600 train / 2,400 test rows** (300 test queries)
  - Within train, 75/25 → model-selection validation split (seed 7)
- **Ranking metrics:** Precision@5, Recall@5, NDCG@5 (computed per query, averaged)
- **Classification metrics @ threshold 0.5:** accuracy, precision, recall, F1, ROC-AUC
- **Operational metrics:** inference latency (ms/row), constraint violations

## 7. Results (held-out test: 2,400 rows / 300 queries)

### 7.1 Validation (model selection)
| Model | Precision@5 | Recall@5 | NDCG@5 | ROC-AUC |
|---|---|---|---|---|
| Logistic Regression | 0.1267 | 0.4051 | 0.3259 | 0.6475 |
| **Random Forest** | **0.1280** | **0.4145** | **0.3347** | **0.6505** |
| Gradient Boosting | 0.1253 | 0.4045 | 0.3180 | 0.6293 |

### 7.2 Test set (final)
| Model | Precision@5 | Recall@5 | NDCG@5 | ROC-AUC |
|---|---|---|---|---|
| Rule-based baseline | 0.1420 | 0.4791 | 0.3599 | 0.6501 |
| **Random Forest** | **0.1447** | **0.4949** | **0.3956** | **0.6895** |

Random Forest improves over the baseline: **+9.9% relative NDCG@5**
(0.3956 vs 0.3599), +1.9% relative Precision@5, +3.3% relative Recall@5,
ROC-AUC +0.039.

### 7.3 Classification metrics @ 0.5 (Random Forest)
| Metric | Value |
|---|---|
| Accuracy | **0.8775** |
| Precision | 0.4716 |
| Recall | 0.3843 |
| F1 | 0.4235 |
| ROC-AUC | 0.6895 |
| Confusion matrix | TP=108, FP=121, FN=173, TN=1998 |

### 7.4 Operational metrics
| Metric | Value |
|---|---|
| Inference latency | **~0.03 ms/row** (≈81 ms for 2,400 rows) |
| Returned constraint violations | **0** (by design — hard rules applied before scoring) |

## 8. Honest interpretation (read before writing results)

- **Accuracy is misleading here.** The test set is 88.3% negative. A trivial
  "always predict negative" classifier scores **≈88.3%**, which is *higher* than
  the model's 87.75%. Therefore do **not** present 87.75% accuracy as an
  achievement. Report it *with* the base-rate caveat, and lead with **ROC-AUC
  (0.690 > 0.5 chance)** and **NDCG@5** which are the correct metrics for an
  imbalanced ranking task.
- **Why Precision@5 looks low (~0.14):** on average there is only **~0.94 positive
  candidate per query** (281 positives / 300 queries). So the realistic ceiling for
  P@5 is ≈0.19; 0.145 is close to that ceiling. Explain this in the paper.
- **The gain over the baseline is real but modest**, and it is measured on a
  synthetic rule-generated set. Frame it as "ML adds measurable ranking lift over
  a deterministic baseline in a controlled simulation".
- **Never claim** real-world recommendation quality, clinical validity, or
  production accuracy from these numbers.

## 9. Failure handling (reliability)
- ML unreachable/timeout → deterministic rule-based fallback; search never blocks.
- Missing/corrupt artifact → `/ready` reports not-ready; rule scorer still serves.
- Invalid model output (unknown IDs, non-finite/out-of-range scores) → rejected by
  Zod in Express; missing candidates get fallback scores.
- No eligible candidates → empty result with guidance.
- Availability re-checked atomically by the existing booking flow at booking time.

## 10. Requirements

### Software
- Python ≥ 3.11 (developed/tested on 3.13)
- `fastapi==0.115.4`, `uvicorn[standard]==0.32.1`, `pydantic==2.9.2`,
  `scikit-learn==1.5.2`, `pandas==2.2.3`, `numpy==2.1.3`, `joblib==1.4.2`,
  `httpx==0.27.2`, `structlog==24.4.0`
- Node ≥ 18 (Express 5 backend, zod 4)
- MongoDB Atlas (cloud)
- Optional: Redis / BullMQ (aggregator; degrades gracefully without it)

### Configuration (environment variables)
- Backend: `ML_SERVICE_URL` (empty ⇒ ML disabled, fallback used), `ML_SERVICE_TOKEN`, `ML_TIMEOUT_MS` (default 800)
- ML service: `CARE_RANKER_MODEL_PATH` (default `models/care_ranker.joblib`)

### Reproduce
```powershell
cd ml-service\training
python build_dataset.py     # -> data\synthetic\care_pairs.csv (12,000 rows)
python validate_data.py
python train.py             # -> ml-service\models\care_ranker.joblib + docs\model-evaluation.json
python evaluate.py          # -> ranking + classification + latency metrics
cd ..\..
cd ml-service; python -m pytest tests -q       # 7 tests
cd ..\backend; npm run test:recommend          # fallback tests (add ML_SERVICE_URL to test ML path)
```

## 11. Where it is working (verified live)

| Component | Address | Endpoints |
|---|---|---|
| ML inference (FastAPI) | http://127.0.0.1:8000 | `/health`, `/ready`, `/predict/rank` |
| Backend (Express) | http://127.0.0.1:5000 | `/api/recommendations/caregivers`, `/facilities`, `/status` |
| Frontend (Next 16) | http://127.0.0.1:3000 | UI |

Verified example (live):
`GET /api/recommendations/caregivers?limit=3` → `modelVersion=care-ranker-v1`,
`fallbackUsed=False`, ranked list with scores (0.867, 0.810, 0.735) and reason codes.

Deployment targets: backend + ML on Render (`render.yaml`), frontend on Vercel.

## 12. References (BibTeX-ready)

```bibtex
@article{breiman2001random,
  title={Random Forests},
  author={Breiman, Leo},
  journal={Machine Learning},
  volume={45},
  number={1},
  pages={5--32},
  year={2001},
  doi={10.1023/A:1010933404324}
}

@article{jarvelin2002cumulated,
  title={Cumulated gain-based evaluation of IR techniques},
  author={J{\"a}rvelin, Kalervo and Kek{\"a}l{\"a}inen, Jaana},
  journal={ACM Transactions on Information Systems},
  volume={20},
  number={4},
  pages={422--446},
  year={2002},
  doi={10.1145/582415.582418}
}

@article{pedregosa2011scikit,
  title={Scikit-learn: Machine Learning in Python},
  author={Pedregosa, Fabian and others},
  journal={Journal of Machine Learning Research},
  volume={12},
  pages={2825--2830},
  year={2011}
}

@book{manning2008introduction,
  title={Introduction to Information Retrieval},
  author={Manning, Christopher D. and Raghavan, Prabhakar and Sch{\"u}tze, Hinrich},
  year={2008},
  publisher={Cambridge University Press}
}

@inproceedings{burges2005learning,
  title={Learning to Rank using Gradient Descent},
  author={Burges, Chris and Shaked, Tal and Renshaw, Erin and others},
  booktitle={ICML},
  year={2005}
}

@article{rendle2009bpr,
  title={BPR: Bayesian Personalized Ranking from Implicit Feedback},
  author={Rendle, Steffen and Freudenthaler, Christoph and Gantner, Zeno and Schmidt-Thieme, Lars},
  journal={UAI},
  year={2009}
}

@article{koren2009matrix,
  title={Matrix Factorization Techniques for Recommender Systems},
  author={Koren, Yehuda and Bell, Robert and Volinsky, Chris},
  journal={Computer},
  volume={42},
  number={8},
  pages={30--37},
  year={2009}
}

@inproceedings{chen2016xgboost,
  title={XGBoost: A Scalable Tree Boosting System},
  author={Chen, Tianqi and Guestrin, Carlos},
  booktitle={KDD},
  year={2016}
}

@article{saito2015precision,
  title={The Precision-Recall Plot Is More Informative than the ROC Plot When Evaluating Binary Classifiers on Imbalanced Datasets},
  author={Saito, Takaya and Rehmsmeier, Marc},
  journal={PLOS ONE},
  volume={10},
  number={3},
  year={2015}
}

@article{he2009learning,
  title={Learning from Imbalanced Data},
  author={He, Haibo and Garcia, Edwardo A.},
  journal={IEEE TKDE},
  volume={21},
  number={9},
  pages={1263--1284},
  year={2009}
}

@misc{fastapi,
  title={FastAPI Documentation},
  author={Ram{\'i}rez, Sebasti{\'a}n},
  howpublished={\url{https://fastapi.tiangolo.com}},
  year={2024}
}

@misc{osm,
  title={OpenStreetMap},
  author={{OpenStreetMap contributors}},
  howpublished={\url{https://www.openstreetmap.org}},
  year={2024}
}

@misc{nomimatim,
  title={Nominatim geocoding service},
  howpublished={\url{https://nominatim.org}},
  year={2024}
}

@misc{wikidata,
  title={Wikidata},
  author={{Wikimedia Foundation}},
  howpublished={\url{https://www.wikidata.org}},
  year={2024}
}

@misc{noShows,
  title={Medical Appointment No Shows},
  author={{Kaggle community dataset}},
  howpublished={\url{https://www.kaggle.com/datasets/joniarroba/noshowappointments}},
  note={CC BY-NC-SA 4.0; target = appointment no-show, a separate task}
}
```

## 13. Suggested paper section mapping
- Abstract / Intro → §1, §2
- Related work → §12 (recommender systems, learning-to-rank, imbalanced learning)
- Methodology → §3, §4, §5, §6
- Results → §7 (include §8 caveats verbatim)
- Discussion / Limitations → §8, §9
- Reproducibility → §10, §11
