from pydantic import BaseModel, Field, field_validator
from typing import List, Optional, Dict, Any
from datetime import datetime


class LocationRequest(BaseModel):
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)


class BudgetRequest(BaseModel):
    maximumHourlyRate: Optional[float] = Field(default=None, ge=0)
    currency: Optional[str] = Field(default="INR", max_length=3)


class ScheduleRequest(BaseModel):
    start: Optional[datetime] = None
    durationHours: Optional[float] = Field(default=1, ge=0, le=24)


class CandidateFeature(BaseModel):
    candidateId: str = Field(..., min_length=1)
    careTypeMatch: int = Field(..., ge=0, le=1)
    distanceKm: float = Field(..., ge=0)
    budgetDifference: float = Field(..., ge=0)
    availabilityMatch: int = Field(..., ge=0, le=1)
    requiredSkillCoverage: float = Field(..., ge=0, le=1)
    verifiedStatus: int = Field(..., ge=0, le=1)
    ratingScore: float = Field(..., ge=0, le=5)
    experienceYears: float = Field(default=0, ge=0)
    hourlyRate: float = Field(default=0, ge=0)
    totalReviews: int = Field(default=0, ge=0)
    isAvailable: int = Field(default=1, ge=0, le=1)
    isVerified: int = Field(default=1, ge=0, le=1)
    emergencyServices: int = Field(default=0, ge=0, le=1)


class RankRequest(BaseModel):
    careType: Optional[str] = Field(default="general", max_length=50)
    location: Optional[LocationRequest] = None
    budget: Optional[BudgetRequest] = None
    schedule: Optional[ScheduleRequest] = None
    candidates: List[CandidateFeature] = Field(..., min_length=0, max_length=100)
    limit: Optional[int] = Field(default=10, ge=1, le=50)


class RankResultItem(BaseModel):
    candidateId: str
    score: float = Field(..., ge=0, le=1)
    reasonCodes: List[str] = Field(default_factory=list)


class RankResponse(BaseModel):
    modelVersion: str
    results: List[RankResultItem]
    totalCandidates: int
    ranked: int
    fallbackUsed: bool = False


class HealthResponse(BaseModel):
    status: str
    modelLoaded: bool
    modelVersion: str
    uptimeSeconds: float
    candidatesMax: int = 100


class ReadinessResponse(BaseModel):
    ready: bool
    modelLoaded: bool
    modelVersion: str
    reason: Optional[str] = None
