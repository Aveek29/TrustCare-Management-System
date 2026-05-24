'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Navigation } from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { fetchAPI } from '@/lib/utils';
import { Star, MapPin, Clock, DollarSign, Loader2, Sparkles, ThumbsUp } from 'lucide-react';
import { motion } from 'framer-motion';

interface Caregiver {
  _id: string;
  caregiverId: {
    _id: string;
    name: string;
    email: string;
    avatar?: string;
    location?: { lat: number; lng: number; city?: string };
  };
  hourlyRate: number;
  experienceYears: number;
  skills: string[];
  bio?: string;
  rating: number;
  reviewCount?: number;
  isAvailable: boolean;
  distance?: number;
  scores?: {
    skillMatch: number;
    distance: number;
    rating: number;
    experience: number;
    total: number;
  };
  recommendation?: {
    score: number;
    label: string;
    reasons: string[];
  };
}

export default function CaregiversPage() {
  const [caregivers, setCaregivers] = useState<Caregiver[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchCaregivers();
  }, []);

  const fetchCaregivers = async () => {
    setLoading(true);
    try {
      console.log('Fetching caregivers from API...');
      const data = await fetchAPI('/caregivers');
      console.log('Caregivers data received:', data.length, 'caregivers');
      setCaregivers(Array.isArray(data) ? data : []);
    } catch (error: any) {
      console.error('Failed to fetch caregivers:', error.message);
      try {
        console.log('Trying fallback to /recommend...');
        const data = await fetchAPI('/recommend');
        setCaregivers(data.topMatches || data || []);
      } catch (err: any) {
        console.error('Fallback also failed:', err.message);
        setCaregivers([]);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen">
      <Navigation />
      
      <div className="pt-24 pb-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-4xl font-bold">Find Your Perfect Caregiver</h1>
          </div>
          <p className="text-muted-foreground">
            Our ML algorithm recommends the best caregivers based on your needs and location
          </p>
        </div>

        <div className="flex gap-4 mb-6">
          <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white">
            <Sparkles className="h-3 w-3 mr-1" />
            AI Powered Recommendations
          </Badge>
        </div>

        <div>
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : caregivers.length === 0 ? (
            <Card className="p-12 text-center">
              <p className="text-muted-foreground">No caregivers found. Try adjusting your filters.</p>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {caregivers.map((caregiver, index) => (
                <motion.div
                  key={caregiver._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="hover:shadow-xl transition-all duration-300 hover:-translate-y-1 h-full flex flex-col">
                    <CardHeader className="flex flex-row items-start gap-4">
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-white text-xl font-bold overflow-hidden">
                        {caregiver.caregiverId?.avatar ? (
                          <img src={caregiver.caregiverId.avatar} alt={caregiver.caregiverId.name} className="w-full h-full object-cover" />
                        ) : (
                          caregiver.caregiverId?.name?.charAt(0) || '?'
                        )}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">{caregiver.caregiverId?.name}</h3>
                        <div className="flex items-center text-sm text-muted-foreground">
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400 mr-1" />
                          {caregiver.rating?.toFixed(1) || '0.0'} ({caregiver.reviewCount || 0} reviews)
                        </div>
                        {caregiver.isAvailable ? (
                          <Badge variant="default" className="mt-2 bg-green-500">Available</Badge>
                        ) : (
                          <Badge variant="secondary" className="mt-2">Unavailable</Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="flex-1">
                      {caregiver.recommendation && (
                        <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-3 mb-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-purple-700 flex items-center">
                              <ThumbsUp className="h-3 w-3 mr-1" />
                              {caregiver.recommendation.label}
                            </span>
                            <span className="text-lg font-bold text-purple-600">
                              {caregiver.recommendation.score}%
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {caregiver.recommendation.reasons.slice(0, 2).map((reason, i) => (
                              <Badge key={i} variant="outline" className="text-xs bg-white">
                                {reason}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center text-muted-foreground">
                          <Clock className="h-4 w-4 mr-2" />
                          {caregiver.experienceYears} years experience
                        </div>
                        <div className="flex items-center text-muted-foreground">
                          <DollarSign className="h-4 w-4 mr-2" />
                          ₹{caregiver.hourlyRate}/hour
                        </div>
                        {caregiver.distance && (
                          <div className="flex items-center text-muted-foreground">
                            <MapPin className="h-4 w-4 mr-2" />
                            {caregiver.distance} km away
                          </div>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2 mt-4">
                        {caregiver.skills?.slice(0, 3).map((skill) => (
                          <Badge key={skill} variant="outline" className="text-xs">{skill}</Badge>
                        ))}
                        {caregiver.skills?.length > 3 && (
                          <Badge variant="outline" className="text-xs">+{caregiver.skills.length - 3}</Badge>
                        )}
                      </div>
                    </CardContent>
                    <CardFooter>
                      <Link href={`/caregivers/${caregiver._id}`} className="w-full">
                        <Button className="w-full bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90">
                          View Profile
                        </Button>
                      </Link>
                    </CardFooter>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
