'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store';
import { fetchAPI } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, DollarSign, User, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface Booking {
  _id: string;
  customerId: { name: string; phone?: string };
  date: string;
  hours: number;
  status: string;
  totalAmount: number;
  address?: string;
}

export default function CaregiverBookingsPage() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'CAREGIVER') { router.push('/login'); return; }
    fetchBookings();
  }, [isAuthenticated, user]);

  const fetchBookings = async () => {
    try {
      const data = await fetchAPI('/bookings/caregiver');
      setBookings(Array.isArray(data) ? data : []);
    } catch { setBookings([]); }
    finally { setLoading(false); }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      await fetchAPI(`/bookings/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) });
      toast.success(`Booking ${status.toLowerCase()}`);
      fetchBookings();
    } catch { toast.error('Failed to update'); }
  };

  const getStatusColor = (s: string) => {
    const map: Record<string, string> = { COMPLETED: 'bg-green-100 text-green-700', ACCEPTED: 'bg-blue-100 text-blue-700', PENDING: 'bg-yellow-100 text-yellow-700', CANCELLED: 'bg-red-100 text-red-700', REJECTED: 'bg-red-100 text-red-700' };
    return map[s] || 'bg-gray-100 text-gray-700';
  };

  if (!isAuthenticated || user?.role !== 'CAREGIVER') return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">My Bookings</h1>
        <p className="text-muted-foreground">Manage your booking requests and schedule</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : bookings.length === 0 ? (
        <Card className="p-12 text-center"><Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" /><p className="text-muted-foreground">No bookings yet</p></Card>
      ) : (
        <div className="space-y-4">
          {bookings.map((b) => (
            <Card key={b._id}>
              <CardContent className="pt-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{b.customerId?.name || 'Customer'}</p>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{new Date(b.date).toLocaleDateString()}</span>
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{b.hours}h</span>
                        <span className="flex items-center gap-1"><DollarSign className="h-3 w-3" />₹{b.totalAmount}</span>
                      </div>
                      {b.address && <p className="text-xs text-muted-foreground mt-1">{b.address}</p>}
                      {b.customerId?.phone && <p className="text-xs text-muted-foreground">Phone: {b.customerId.phone}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={getStatusColor(b.status)}>{b.status}</Badge>
                    {b.status === 'PENDING' && (
                      <><Button size="sm" onClick={() => updateStatus(b._id, 'ACCEPTED')}>Accept</Button><Button size="sm" variant="outline" onClick={() => updateStatus(b._id, 'REJECTED')}>Reject</Button></>
                    )}
                    {b.status === 'ACCEPTED' && (
                      <Button size="sm" onClick={() => updateStatus(b._id, 'COMPLETED')}>Complete</Button>
                    )}
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
