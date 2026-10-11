import { z } from 'zod';

export const recommendationRequestSchema = z.object({
  careType: z.string().max(50).optional().default('general'),
  location: z
    .object({
      latitude: z.number().min(-90).max(90),
      longitude: z.number().min(-180).max(180),
    })
    .optional(),
  budget: z
    .object({
      maximumHourlyRate: z.number().min(0).optional(),
      currency: z.string().max(3).optional().default('INR'),
    })
    .optional(),
  schedule: z
    .object({
      start: z.string().datetime().optional(),
      durationHours: z.number().min(0).max(24).optional().default(1),
    })
    .optional(),
  skills: z.array(z.string()).optional().default([]),
  minRating: z.number().min(0).max(5).optional(),
  limit: z.number().int().min(1).max(50).optional().default(5),
});

export type RecommendationRequest = z.infer<typeof recommendationRequestSchema>;

export const rankResultItemSchema = z.object({
  candidateId: z.string().min(1),
  score: z.number().finite().min(0).max(1),
  reasonCodes: z.array(z.string()).default([]),
});

export const rankResponseSchema = z.object({
  modelVersion: z.string(),
  results: z.array(rankResultItemSchema),
  totalCandidates: z.number().int().min(0),
  ranked: z.number().int().min(0),
  fallbackUsed: z.boolean().default(false),
});

export type RankResponse = z.infer<typeof rankResponseSchema>;
