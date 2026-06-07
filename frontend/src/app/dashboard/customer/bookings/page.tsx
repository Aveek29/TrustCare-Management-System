'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store';
import { fetchAPI } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, DollarSign, User, Loader2 } from 'lucide-react';
import Link from 'next/link';

interface Booking {
  _id: string;
  caregiverId: { name: string; avatar?: string };
  date: string;
  hours: number;
  status: string;
  totalAmount: number;
  paymentStatus?: string;
  address?: string;
}

export default function CustomerBookingsPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) { router.push('/login'); return; }
    fetchBookings();
  }, [isAuthenticated]);

  const fetchBookings = async () => {
    try {
      const data = await fetchAPI('/bookings/customer');
      setBookings(Array.isArray(data) ? data : []);
    } catch { setBookings([]); }
    finally { setLoading(false); }
  };

  const getStatusColor = (s: string) => {
    const map: Record<string, string> = { COMPLETED: 'bg-green-100 text-green-700', ACCEPTED: 'bg-blue-100 text-blue-700', PENDING: 'bg-yellow-100 text-yellow-700', CANCELLED: 'bg-red-100 text-red-700' };
    return map[s] || 'bg-gray-100 text-gray-700';
  };

  if (!isAuthenticated) return null;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">My Bookings</h1>
          <p className="text-muted-foreground">View and manage all your care bookings</p>
        </div>
        <Link href="/caregivers"><Button>Find Caregivers</Button></Link>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : bookings.length === 0 ? (
        <Card className="p-12 text-center">
          <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground mb-4">No bookings yet</p>
          <Link href="/caregivers"><Button>Find a Caregiver</Button></Link>
        </Card>
      ) : (
        <div className="space-y-4">
          {bookings.map((b) => (
            <Card key={b._id}>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{b.caregiverId?.name || 'Caregiver'}</p>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{new Date(b.date).toLocaleDateString()}</span>
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{b.hours}h</span>
                        <span className="flex items-center gap-1"><DollarSign className="h-3 w-3" />₹{b.totalAmount}</span>
                      </div>
                      {b.address && <p className="text-xs text-muted-foreground mt-1">{b.address}</p>}
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge className={getStatusColor(b.status)}>{b.status}</Badge>
                    {b.paymentStatus && <p className="text-xs text-muted-foreground mt-1">{b.paymentStatus}</p>}
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
