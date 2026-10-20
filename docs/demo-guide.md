# TrustCare - Demo Guide

A short, reliable runbook for presenting the project end to end. Follow the
order below; every step is independently testable.

---

## 1. What the demo proves

| # | Step | What the panel sees | What it proves |
|---|------|---------------------|----------------|
| 1 | Open the home page | Marketing + search UI | Frontend is live |
| 2 | Log in as customer | JWT auth, role-based redirect | Auth + RBAC |
| 3 | Search caregivers | Filters, cards, ratings | Existing search flow untouched |
| 4 | Open **Recommended for you** | Ranked caregivers with scores | ML ranking is live (`care-ranker-v1`) |
| 5 | Open Facilities | Map/list of scraped facilities | Aggregator + scraping data |
| 6 | Admin -> Data sources / Scraping jobs / Aggregator logs | Jobs, sources, audit trail | Admin + scraper observability |
| 7 | Run `python ml-service/demo.py` | Dataset -> model -> metrics -> ranking | The ML story in one command |
| 8 | Stop the ML service, retry step 4 | Same results, `fallbackUsed: true` | Deterministic fallback works |

Step 8 is optional but very convincing: it shows the feature degrades safely
instead of breaking the app.

---

## 2. Pre-demo checklist

- [ ] `.env` files present (`backend/.env`, `frontend/.env.local`)
- [ ] MongoDB Atlas reachable (the backend logs a successful connection)
- [ ] `ml-service/models/care_ranker.joblib` exists
- [ ] `data/synthetic/care_pairs.csv` exists
- [ ] Ports `3000`, `5000`, `8000` are free
- [ ] `backend/.env` contains:
      `ML_SERVICE_URL=http://127.0.0.1:8000` and `ML_TIMEOUT_MS=800`

If the model or dataset is missing, regenerate them:

```powershell
python ml-service/training/build_dataset.py
python ml-service/training/train.py
```

---

## 3. Start the stack (three terminals)

**Terminal 1 - ML service**

```powershell
cd "E:\TrustCare Management System\ml-service"
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

**Terminal 2 - Backend**

```powershell
cd "E:\TrustCare Management System\backend"
npm run dev
```

**Terminal 3 - Frontend**

```powershell
cd "E:\TrustCare Management System\frontend"
npm run dev
```

Open http://localhost:3000

### Health checks

```powershell
Invoke-RestMethod http://127.0.0.1:8000/health
Invoke-RestMethod http://127.0.0.1:5000/api/health
Invoke-RestMethod http://127.0.0.1:5000/api/recommendations/status
```

`/api/recommendations/status` should report `modelVersion: care-ranker-v1` and
`fallbackUsed: false` when the ML service is up.

---

## 4. The ML story (2 minutes, no slides needed)

Run:

```powershell
cd "E:\TrustCare Management System"
python ml-service/demo.py
```

It prints, in order:

1. **Dataset** - 12,000 (request, candidate) pairs, 1,500 query groups, 11.5% positive.
2. **Model** - Random Forest, `care-ranker-v1`, 300 trees, depth 12.
3. **Offline metrics** - held-out test set (2,400 rows / 300 queries).
4. **Classification metrics** - accuracy / precision / recall / F1 / ROC-AUC / confusion matrix.
5. **Live ranking** - ML ordering vs deterministic rule ordering.
6. **Live FastAPI call** - real HTTP response with `modelVersion` and `fallbackUsed`.

### Numbers to quote

| Metric | Rule baseline | Random Forest |
|---|---|---|
| Precision@5 | 0.1420 | **0.1447** |
| Recall@5 | 0.4791 | **0.4949** |
| NDCG@5 | 0.3599 | **0.3956** |
| ROC-AUC | 0.6501 | **0.6895** |

Classification at threshold 0.5: accuracy 0.8775 (majority baseline 0.883),
precision 0.4716, recall 0.3843, F1 0.4235. **Say clearly** that accuracy is
misleading for a rare label and that NDCG@5 / ROC-AUC are the headline metrics.

### The key architectural point

> Hard eligibility constraints (verified, available, care type, budget, radius)
> are enforced in Express *before* the model. The model only re-ranks eligible
> candidates. If the ML service is down, a deterministic rule ranker takes over.

---

## 5. Test commands (run before the demo)

```powershell
# ML unit tests (7 tests)
cd "E:\TrustCare Management System\ml-service"
python -m pytest tests -q

# Backend recommendation tests, with the live ML service
cd "E:\TrustCare Management System\backend"
$env:ML_SERVICE_URL="http://127.0.0.1:8000"
npm run test:recommend

# Production builds
npm run build                       # backend (tsc)
cd ..\frontend
npm run build                       # frontend (next build)
```

Expected: `7 passed`, `ALL RECOMMENDATION TESTS PASSED`, and both builds with no
TypeScript errors.

---

## 6. Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `status` shows `fallbackUsed: true` | ML unreachable or `ML_SERVICE_URL` unset | Start the ML service; restart backend after editing `.env` |
| `ECONNREFUSED 127.0.0.1:8000` | ML service not running | Start Terminal 1 |
| Frontend shows "Request failed" | Backend down or wrong `NEXT_PUBLIC_API_URL` | Check `http://127.0.0.1:5000/api/health` |
| Facilities show 0 results | Default location has no geocoded facilities within 50 km | Search near Chennai / Kottayam, or widen the radius |
| Admin scraping jobs empty | Redis is optional and not running | Expected; jobs degrade gracefully. Seed data still shows |
| `EADDRINUSE` | Port already in use | Stop the old process or change the port |
| First request is slow on Render | Free tier cold start (30-60 s) | Warm the services before presenting |

---

## 7. Honest limitations to state if asked

- The training dataset is **synthetic** (rule-generated labels with seeded
  noise), not real user feedback. It validates the pipeline and ranking skill;
  it does not prove real-world quality.
- Accuracy (0.8775) is below the majority-class baseline (0.883) because the
  positive class is rare. Ranking metrics are the correct evaluation.
- The aggregator dataset is partially geocoded (23 of 50 facilities), so
  distance-based facility recommendations only work in covered cities.
- Payments are mocked; Redis/BullMQ jobs are optional.

---

## 8. CI

`.github/workflows/ml.yml` runs on every push that touches the ML service or
recommendation code:

1. **ML service** - build/validate dataset, train, evaluate, pytest.
2. **Backend** - `tsc --noEmit`, fallback tests with ML disabled.
3. **Integration** - start FastAPI, run backend tests against the live model.

It can also be triggered manually from the Actions tab (`workflow_dispatch`).
