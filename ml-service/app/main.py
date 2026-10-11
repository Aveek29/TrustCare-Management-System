import time
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .schemas import RankRequest, RankResponse, HealthResponse, ReadinessResponse
from .ranker import CareRanker
from .health import health_state


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Model artifact is loaded once at startup in CareRanker().
    _ = ranker
    yield


app = FastAPI(title="TrustCare ML Inference Service", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

ranker = CareRanker()


@app.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    return HealthResponse(
        status="ok",
        modelLoaded=ranker.model is not None,
        modelVersion=ranker.model_version,
        uptimeSeconds=health_state.uptime,
    )


@app.get("/ready", response_model=ReadinessResponse)
async def ready() -> ReadinessResponse:
    if ranker.model is None:
        return ReadinessResponse(
            ready=False,
            modelLoaded=False,
            modelVersion=ranker.model_version,
            reason="Model not loaded; using rule-based fallback",
        )
    return ReadinessResponse(
        ready=True,
        modelLoaded=True,
        modelVersion=ranker.model_version,
        reason=None,
    )


@app.post("/predict/rank", response_model=RankResponse)
async def predict_rank(req: RankRequest) -> RankResponse:
    try:
        results, used_ml = ranker.score_candidates(req.candidates)
        if req.limit and req.limit > 0:
            results = results[:req.limit]
        return RankResponse(
            modelVersion=ranker.model_version,
            results=results,
            totalCandidates=len(req.candidates),
            ranked=len(results),
            fallbackUsed=not used_ml,
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.get("/")
async def root() -> dict:
    return {
        "service": "trustcare-ml",
        "version": "1.0.0",
        "endpoints": ["/health", "/ready", "/predict/rank"],
    }
