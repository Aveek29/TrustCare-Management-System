'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { fetchAPI } from '@/lib/utils';
import { Calendar, DollarSign, Star, Clock, Loader2, ToggleLeft, ToggleRight } from 'lucide-react';

interface Profile {
  _id: string;
  hourlyRate: number;
  experienceYears: number;
  skills: string[];
  bio?: string;
  rating: number;
  totalReviews: number;
  isAvailable: boolean;
}

interface Booking {
  _id: string;
  customerId: { name: string; phone?: string };
  date: string;
  hours: number;
  status: string;
  totalAmount: number;
  address?: string;
}

export default function CaregiverDashboard() {
  const { user } = useAuthStore();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [profileData, bookingsData] = await Promise.all([
        fetchAPI('/caregivers/me'),
        fetchAPI('/bookings/caregiver').catch(() => []),
      ]);
      setProfile(profileData);
      setBookings(bookingsData);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleAvailability = async () => {
    setUpdating(true);
    try {
      const updated = await fetchAPI('/caregivers/availability', {
        method: 'PUT',
        body: JSON.stringify({ isAvailable: !profile?.isAvailable }),
      });
      setProfile(updated);
    } catch (error) {
      console.error('Failed to update availability:', error);
    } finally {
      setUpdating(false);
    }
  };

  const updateBookingStatus = async (bookingId: string, status: string) => {
    try {
      await fetchAPI(`/bookings/${bookingId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status }),
      });
      fetchData();
    } catch (error) {
      console.error('Failed to update booking:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Welcome, {user?.name}</h1>
        <p className="text-muted-foreground">Manage your caregiving business</p>
      </div>

      <div className="grid md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Rating</p>
                <p className="text-2xl font-bold flex items-center">
                  <Star className="h-5 w-5 fill-yellow-400 text-yellow-400 mr-1" />
                  {profile?.rating?.toFixed(1) || '0.0'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Hourly Rate</p>
                <p className="text-2xl font-bold">${profile?.hourlyRate || 0}/hr</p>
              </div>
              <DollarSign className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Bookings</p>
                <p className="text-2xl font-bold">{bookings.length}</p>
              </div>
              <Calendar className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <p className="text-2xl font-bold">{profile?.isAvailable ? 'Available' : 'Busy'}</p>
              </div>
              <button onClick={toggleAvailability} disabled={updating}>
                {profile?.isAvailable ? (
                  <ToggleRight className="h-8 w-8 text-green-500" />
                ) : (
                  <ToggleLeft className="h-8 w-8 text-gray-400" />
                )}
              </button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-4">
          <Button onClick={toggleAvailability} disabled={updating}>
            {profile?.isAvailable ? 'Mark Unavailable' : 'Mark Available'}
          </Button>
        </CardContent>
      </Card>

      <div>
        <h2 className="text-xl font-semibold mb-4">Recent Bookings</h2>
        {bookings.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">No bookings yet</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {bookings.slice(0, 5).map((booking) => (
              <Card key={booking._id}>
                <CardContent className="pt-4">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <div className="font-medium">{booking.customerId?.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(booking.date).toLocaleString()} • {booking.hours}h • ${booking.totalAmount}
                      </div>
                      {booking.address && (
                        <div className="text-sm text-muted-foreground">{booking.address}</div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          booking.status === 'COMPLETED' ? 'secondary' :
                          booking.status === 'ACCEPTED' ? 'success' :
                          booking.status === 'PENDING' ? 'warning' : 'destructive'
                        }
                      >
                        {booking.status}
                      </Badge>
                      {booking.status === 'PENDING' && (
                        <>
                          <Button size="sm" onClick={() => updateBookingStatus(booking._id, 'ACCEPTED')}>
                            Accept
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => updateBookingStatus(booking._id, 'REJECTED')}>
                            Reject
                          </Button>
                        </>
                      )}
                      {booking.status === 'ACCEPTED' && (
                        <Button size="sm" onClick={() => updateBookingStatus(booking._id, 'COMPLETED')}>
                          Mark Complete
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
