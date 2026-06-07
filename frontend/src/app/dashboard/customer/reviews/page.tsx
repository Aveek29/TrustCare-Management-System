'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store';
import { fetchAPI } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Star, User, Loader2, MessageSquare } from 'lucide-react';

interface Review {
  _id: string;
  caregiverId: { name: string; avatar?: string };
  rating: number;
  comment?: string;
  createdAt: string;
}

export default function CustomerReviewsPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) { router.push('/login'); return; }
    fetchReviews();
  }, [isAuthenticated]);

  const fetchReviews = async () => {
    try {
      const data = await fetchAPI('/reviews/customer');
      setReviews(Array.isArray(data) ? data : []);
    } catch { setReviews([]); }
    finally { setLoading(false); }
  };

  if (!isAuthenticated) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">My Reviews</h1>
        <p className="text-muted-foreground">Reviews you have written for caregivers</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : reviews.length === 0 ? (
        <Card className="p-12 text-center">
          <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">No reviews yet. Reviews appear after completed bookings.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {reviews.map((r) => (
            <Card key={r._id}>
              <CardContent className="pt-4">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="font-medium">{r.caregiverId?.name || 'Caregiver'}</p>
                      <div className="flex items-center gap-1">
                        {[1,2,3,4,5].map((s) => (
                          <Star key={s} className={`h-4 w-4 ${s <= r.rating ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'}`} />
                        ))}
                      </div>
                    </div>
                    {r.comment && <p className="text-sm text-muted-foreground mt-2">{r.comment}</p>}
                    <p className="text-xs text-muted-foreground mt-2">{new Date(r.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
