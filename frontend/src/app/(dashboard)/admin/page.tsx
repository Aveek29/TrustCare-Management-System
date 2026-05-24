'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { fetchAPI } from '@/lib/utils';
import { Users, UserCheck, Calendar, DollarSign, Loader2, Check, X, CreditCard, TrendingUp, Shield, Activity } from 'lucide-react';
import Link from 'next/link';

interface Stats {
  users: {
    total: number;
    customers: number;
    caregivers: number;
    verifiedCaregivers: number;
    pendingCaregivers: number;
  };
  bookings: {
    total: number;
    active: number;
    completed: number;
  };
  revenue: {
    total: number;
    escrow: number;
    thisMonth: number;
    bookingsThisMonth: number;
  };
  recentBookings: any[];
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [escrowPayments, setEscrowPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [releasing, setReleasing] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [statsData, escrowData] = await Promise.all([
        fetchAPI('/admin/stats').catch(() => null),
        fetchAPI('/admin/payments/escrow').catch(() => ({ payments: [], totalEscrow: 0 })),
      ]);
      setStats(statsData);
      setEscrowPayments(escrowData.payments || []);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const verifyCaregiver = async (id: string, verified: boolean) => {
    try {
      await fetchAPI(`/caregivers/verify/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ isVerified: verified }),
      });
      fetchData();
    } catch (error) {
      console.error('Failed to verify caregiver:', error);
    }
  };

  const releasePayment = async (bookingId: string) => {
    setReleasing(bookingId);
    try {
      await fetchAPI(`/admin/release-payment/${bookingId}`, {
        method: 'POST',
      });
      fetchData();
    } catch (error) {
      console.error('Failed to release payment:', error);
    } finally {
      setReleasing(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const statCards = [
    { label: 'Total Users', value: stats?.users?.total || 0, icon: Users, color: 'text-blue-500' },
    { label: 'Customers', value: stats?.users?.customers || 0, icon: Users, color: 'text-green-500' },
    { label: 'Caregivers', value: stats?.users?.caregivers || 0, icon: UserCheck, color: 'text-purple-500' },
    { label: 'Active Bookings', value: stats?.bookings?.active || 0, icon: Calendar, color: 'text-orange-500' },
  ];

  const revenueCards = [
    { label: 'Total Revenue', value: `₹${(stats?.revenue?.total || 0).toLocaleString()}`, icon: DollarSign, color: 'text-green-500' },
    { label: 'In Escrow', value: `₹${(stats?.revenue?.escrow || 0).toLocaleString()}`, icon: Shield, color: 'text-yellow-500' },
    { label: 'This Month', value: `₹${(stats?.revenue?.thisMonth || 0).toLocaleString()}`, icon: TrendingUp, color: 'text-blue-500' },
    { label: 'Completed', value: stats?.bookings?.completed || 0, icon: Check, color: 'text-green-500' },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground">Manage the platform, verify caregivers, and control payments</p>
      </div>

      <div className="grid md:grid-cols-4 gap-6">
        {statCards.map((stat, index) => (
          <Card key={index}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-2xl font-bold">{stat.value}</p>
                </div>
                <stat.icon className={`h-8 w-8 ${stat.color}`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid md:grid-cols-4 gap-6">
        {revenueCards.map((stat, index) => (
          <Card key={index} className="border-green-200 bg-green-50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-2xl font-bold text-green-700">{stat.value}</p>
                </div>
                <stat.icon className={`h-8 w-8 ${stat.color}`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Link href="/dashboard/admin/logs">
        <Card className="cursor-pointer hover:shadow-lg transition-shadow border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-blue-500 text-white">
                  <Activity className="h-6 w-6" />
                </div>
                <div>
                  <p className="font-semibold text-blue-900">Activity Logs</p>
                  <p className="text-sm text-blue-600">View AI conversations & auth events</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </Link>

      {escrowPayments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Escrow Payments - Release to Caregivers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {escrowPayments.slice(0, 5).map((payment) => (
                <div key={payment._id} className="flex items-center justify-between p-4 border rounded-lg bg-yellow-50">
                  <div>
                    <div className="font-medium">{payment.customerId?.name} → {payment.caregiverId?.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {new Date(payment.date).toLocaleString()} • ₹{payment.totalAmount}
                    </div>
                    <Badge variant="warning" className="mt-1">In Escrow</Badge>
                  </div>
                  <Button 
                    size="sm" 
                    onClick={() => releasePayment(payment._id)}
                    disabled={releasing === payment._id}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {releasing === payment._id ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Release Payment'}
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {(stats?.users?.pendingCaregivers || 0) > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Pending Caregiver Verifications ({stats?.users?.pendingCaregivers || 0})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats?.recentBookings?.filter((_: any, i: number) => i < 3).map((booking: any) => (
                <div key={booking._id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <div className="font-medium">{booking.caregiverId?.name || 'Pending Caregiver'}</div>
                    <div className="text-sm text-muted-foreground">Awaiting verification</div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => verifyCaregiver(booking._id, true)}>
                      <Check className="h-4 w-4 mr-1" /> Verify
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => verifyCaregiver(booking._id, false)}>
                      <X className="h-4 w-4 mr-1" /> Reject
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div>
        <h2 className="text-xl font-semibold mb-4">Recent Bookings</h2>
        <Card>
          <CardContent className="pt-4">
            <div className="space-y-4">
              {(stats?.recentBookings || []).slice(0, 10).map((booking) => (
                <div key={booking._id} className="flex items-center justify-between py-3 border-b last:border-0">
                  <div>
                    <div className="font-medium">{booking.customerId?.name} → {booking.caregiverId?.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {new Date(booking.date).toLocaleString()} • ₹{booking.totalAmount}
                    </div>
                  </div>
                  <Badge
                    variant={
                      booking.status === 'COMPLETED' ? 'secondary' :
                      booking.status === 'ACCEPTED' ? 'success' :
                      booking.status === 'PENDING' ? 'warning' : 'destructive'
                    }
                  >
                    {booking.status}
                  </Badge>
                </div>
              ))}
              {(!stats?.recentBookings || stats.recentBookings.length === 0) && (
                <p className="text-center text-muted-foreground py-8">No bookings yet</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
