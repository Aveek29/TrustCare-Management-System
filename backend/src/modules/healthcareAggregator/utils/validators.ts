import { z } from 'zod';

export const facilitySchema = z.object({
  name: z.string().min(1, 'Facility name is required'),
  address: z.object({
    street: z.string().optional().default(''),
    city: z.string().optional().default(''),
    state: z.string().optional().default(''),
    zip: z.string().optional().default(''),
    full: z.string().optional().default(''),
  }),
  coordinates: z.object({
    lat: z.number().min(-90).max(90).optional().default(0),
    lng: z.number().min(-180).max(180).optional().default(0),
  }).optional().default({ lat: 0, lng: 0 }),
  phone: z.string().optional().default(''),
  email: z.string().email().optional().or(z.literal('')).default(''),
  website: z.string().url().optional().or(z.literal('')).default(''),
  facilityType: z.string().optional().default(''),
  description: z.string().optional().default(''),
  services: z.array(z.string()).optional().default([]),
  specialities: z.array(z.string()).optional().default([]),
  rating: z.number().min(0).max(5).optional().default(0),
  reviewCount: z.number().min(0).optional().default(0),
  operationalHours: z.string().optional().default(''),
  emergencyServices: z.boolean().optional().default(false),
  sourceUrl: z.string().optional().default(''),
  sourceName: z.string().optional().default(''),
});

export const providerSchema = z.object({
  name: z.string().min(1, 'Provider name is required'),
  title: z.string().optional().default(''),
  specialities: z.array(z.string()).optional().default([]),
  education: z.array(z.string()).optional().default([]),
  experience: z.number().min(0).optional().default(0),
  phone: z.string().optional().default(''),
  email: z.string().email().optional().or(z.literal('')).default(''),
  facilityName: z.string().optional().default(''),
  address: z.object({
    street: z.string().optional().default(''),
    city: z.string().optional().default(''),
    state: z.string().optional().default(''),
    zip: z.string().optional().default(''),
    full: z.string().optional().default(''),
  }).optional().default({ street: '', city: '', state: '', zip: '', full: '' }),
  coordinates: z.object({
    lat: z.number().min(-90).max(90).optional().default(0),
    lng: z.number().min(-180).max(180).optional().default(0),
  }).optional().default({ lat: 0, lng: 0 }),
  rating: z.number().min(0).max(5).optional().default(0),
  reviewCount: z.number().min(0).optional().default(0),
  sourceUrl: z.string().optional().default(''),
  sourceName: z.string().optional().default(''),
});

export type ValidatedFacility = z.infer<typeof facilitySchema>;
export type ValidatedProvider = z.infer<typeof providerSchema>;
