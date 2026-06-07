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
  customerId?: { name: string };
  caregiverId?: { name: string };
  date: string;
  hours: number;
  status: string;
  totalAmount: number;
  paymentStatus?: string;
  createdAt: string;
}

export default function AdminBookingsPage() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'ADMIN') { router.push('/login'); return; }
    fetchBookings();
  }, [isAuthenticated, user]);

  const fetchBookings = async () => {
    try {
      const data = await fetchAPI('/bookings');
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
    const map: Record<string, string> = { COMPLETED: 'bg-green-100 text-green-700', ACCEPTED: 'bg-blue-100 text-blue-700', PENDING: 'bg-yellow-100 text-yellow-700', CANCELLED: 'bg-red-100 text-red-700' };
    return map[s] || 'bg-gray-100 text-gray-700';
  };

  if (!isAuthenticated || user?.role !== 'ADMIN') return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">All Bookings</h1>
        <p className="text-muted-foreground">Manage all bookings across the platform</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-left text-sm text-muted-foreground">
                    <th className="p-4 font-medium">Customer</th>
                    <th className="p-4 font-medium">Caregiver</th>
                    <th className="p-4 font-medium">Date</th>
                    <th className="p-4 font-medium">Hours</th>
                    <th className="p-4 font-medium">Amount</th>
                    <th className="p-4 font-medium">Status</th>
                    <th className="p-4 font-medium">Payment</th>
                    <th className="p-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map((b) => (
                    <tr key={b._id} className="border-b last:border-0 hover:bg-muted/50">
                      <td className="p-4">{b.customerId?.name || 'N/A'}</td>
                      <td className="p-4">{b.caregiverId?.name || 'N/A'}</td>
                      <td className="p-4 text-sm">{new Date(b.date).toLocaleDateString()}</td>
                      <td className="p-4">{b.hours}h</td>
                      <td className="p-4">₹{b.totalAmount}</td>
                      <td className="p-4"><Badge className={getStatusColor(b.status)}>{b.status}</Badge></td>
                      <td className="p-4">{b.paymentStatus || '-'}</td>
                      <td className="p-4">
                        <div className="flex items-center gap-1">
                          {b.status === 'PENDING' && (
                            <>
                              <Button size="sm" variant="outline" onClick={() => updateStatus(b._id, 'ACCEPTED')}>Accept</Button>
                              <Button size="sm" variant="outline" onClick={() => updateStatus(b._id, 'CANCELLED')}>Cancel</Button>
                            </>
                          )}
                          {b.status === 'ACCEPTED' && (
                            <Button size="sm" variant="outline" onClick={() => updateStatus(b._id, 'COMPLETED')}>Complete</Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
