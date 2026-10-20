'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { fetchAPI } from '@/lib/utils';
import { Star, MapPin, Clock, DollarSign, Sparkles, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

interface RecommendedCaregiver {
  _id: string;
  caregiverId?: {
    name?: string;
    avatar?: string;
    location?: { city?: string };
  };
  name?: string;
  avatar?: string;
  skills?: string[];
  rating?: number;
  hourlyRate?: number;
  experienceYears?: number;
  location?: { city?: string };
  score: number;
  distanceKm?: number;
  reasonCodes?: string[];
}

interface RecommendationResponse {
  recommendations: RecommendedCaregiver[];
  total: number;
  eligible?: number;
  modelVersion?: string;
  fallbackUsed?: boolean;
  mlConfigured?: boolean;
  message?: string;
}

const REASON_LABELS: Record<string, string> = {
  CARE_TYPE_MATCH: 'Care type match',
  SKILLS_MATCH: 'Skills match',
  NEARBY: 'Nearby',
  WITHIN_SERVICE_AREA: 'In service area',
  VERIFIED: 'Verified',
  AVAILABLE: 'Available',
  HIGHLY_RATED: 'Highly rated',
  EXPERIENCED: 'Experienced',
  WITHIN_BUDGET: 'Within budget',
};

export function RecommendedCaregivers({
  limit = 3,
  careType,
}: {
  limit?: number;
  careType?: string;
}) {
  const [data, setData] = useState<RecommendationResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ limit: String(limit) });
        if (careType) params.set('careType', careType);
        const res = await fetchAPI(`/recommendations/caregivers?${params.toString()}`);
        if (!cancelled) setData(res);
      } catch {
        if (!cancelled) setData(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [limit, careType]);

  if (loading) {
    return (
      <div className="mb-8 rounded-xl border bg-card p-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Ranking caregivers with the recommendation model...
        </div>
      </div>
    );
  }

  if (!data || !data.recommendations || data.recommendations.length === 0) {
    return null;
  }

  const usingMl = !data.fallbackUsed;
  const label = usingMl ? data.modelVersion || 'care-ranker-v1' : 'rule-based fallback';

  return (
    <section className="mb-10">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-2xl font-semibold flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-500" />
            Recommended for you
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Ranked from eligible caregivers by your saved location and care needs.
          </p>
        </div>
        <Badge
          className={
            usingMl
              ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
              : 'bg-amber-500 text-white'
          }
        >
          <Sparkles className="h-3 w-3 mr-1" />
          {usingMl ? `ML ranked - ${label}` : 'Fallback ranking'}
        </Badge>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {data.recommendations.slice(0, limit).map((item, index) => {
          const name = item.caregiverId?.name || item.name || 'Caregiver';
          const avatar = item.caregiverId?.avatar || item.avatar;
          const city = item.caregiverId?.location?.city || item.location?.city;
          return (
            <motion.div
              key={item._id || index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="hover:shadow-xl transition-all duration-300 hover:-translate-y-1 h-full flex flex-col border-purple-200/60">
                <CardHeader className="flex flex-row items-start gap-4">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-xl font-bold overflow-hidden shrink-0">
                    {avatar ? (
                      <img src={avatar} alt={name} className="w-full h-full object-cover" />
                    ) : (
                      name.charAt(0)
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-lg truncate">{name}</h3>
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400 mr-1" />
                      {item.rating?.toFixed(1) || '0.0'}
                    </div>
                    <Badge variant="outline" className="mt-1 text-xs">
                      Match {Math.round((item.score || 0) * 100)}%
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="flex-1">
                  <div className="space-y-2 text-sm">
                    {item.experienceYears ? (
                      <div className="flex items-center text-muted-foreground">
                        <Clock className="h-4 w-4 mr-2" />
                        {item.experienceYears} years exp
                      </div>
                    ) : null}
                    {item.hourlyRate ? (
                      <div className="flex items-center text-muted-foreground">
                        <DollarSign className="h-4 w-4 mr-2" />₹{item.hourlyRate}/hour
                      </div>
                    ) : null}
                    {city ? (
                      <div className="flex items-center text-muted-foreground">
                        <MapPin className="h-4 w-4 mr-2" />
                        {city}
                        {typeof item.distanceKm === 'number' ? ` · ${item.distanceKm.toFixed(1)} km` : ''}
                      </div>
                    ) : null}
                  </div>
                  {item.reasonCodes?.length ? (
                    <div className="flex flex-wrap gap-1.5 mt-4">
                      {item.reasonCodes.slice(0, 3).map((code) => (
                        <Badge key={code} variant="secondary" className="text-xs">
                          {REASON_LABELS[code] || code}
                        </Badge>
                      ))}
                    </div>
                  ) : null}
                </CardContent>
                <CardFooter>
                  <Link href={`/caregivers/${item._id}`} className="w-full">
                    <Button className="w-full bg-gradient-to-r from-purple-500 to-pink-500">
                      View Profile
                    </Button>
                  </Link>
                </CardFooter>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
