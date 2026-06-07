'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { fetchAPI } from '@/lib/utils';
import { Calendar, Clock, DollarSign, Users, Loader2, ArrowRight, CheckCircle, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';

interface Booking {
  _id: string;
  caregiverId: { name: string; avatar?: string; email?: string } | null;
  date: string;
  hours: number;
  status: string;
  totalAmount: number;
  address?: string;
  paymentStatus?: string;
  notes?: string;
}

export default function CustomerDashboard() {
  const { user } = useAuthStore();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      const data = await fetchAPI('/bookings/customer');
      setBookings(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch bookings:', error);
      setBookings([]);
    } finally {
      setLoading(false);
    }
  };

  const stats = [
    { 
      label: 'Total Bookings', 
      value: bookings.length, 
      icon: Calendar,
      color: 'text-blue-500'
    },
    { 
      label: 'Active', 
      value: bookings.filter(b => b.status === 'ACCEPTED' || b.status === 'PENDING').length, 
      icon: Clock,
      color: 'text-yellow-500'
    },
    { 
      label: 'Completed', 
      value: bookings.filter(b => b.status === 'COMPLETED').length, 
      icon: CheckCircle,
      color: 'text-green-500'
    },
  ];

  const upcomingBookings = bookings
    .filter(b => (b.status === 'ACCEPTED' || b.status === 'PENDING') && new Date(b.date) > new Date())
    .slice(0, 3);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'ACCEPTED':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'CANCELLED':
        return 'bg-red-100 text-red-700 border-red-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'PAID_OUT':
        return 'text-green-600';
      case 'ESCROW':
        return 'text-blue-600';
      case 'PENDING':
        return 'text-yellow-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Welcome back, {user?.name}</h1>
        <p className="text-muted-foreground">Manage your caregiving needs</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {stats.map((stat, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                    <p className="text-3xl font-bold">{stat.value}</p>
                  </div>
                  <stat.icon className={`h-8 w-8 ${stat.color}`} />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {upcomingBookings.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Upcoming Appointments</h2>
          <div className="grid md:grid-cols-3 gap-4">
            {upcomingBookings.map((booking, index) => (
              <motion.div
                key={booking._id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="border-l-4 border-l-blue-500">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-white font-bold">
                        {booking.caregiverId?.name?.charAt(0) || '?'}
                      </div>
                      <div>
                        <p className="font-semibold">{booking.caregiverId?.name || 'Caregiver'}</p>
                        <Badge className={getStatusColor(booking.status)}>{booking.status}</Badge>
                      </div>
                    </div>
                    <div className="space-y-1 text-sm">
                      <p className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        {new Date(booking.date).toLocaleDateString('en-IN', { 
                          weekday: 'short', 
                          month: 'short', 
                          day: 'numeric' 
                        })}
                      </p>
                      <p className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        {booking.hours} hours
                      </p>
                      <p className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                        <span className={getPaymentStatusColor(booking.paymentStatus || '')}>
                          ₹{booking.totalAmount}
                        </span>
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Recent Bookings</h2>
        <Link href="/caregivers">
          <Button variant="outline">
            Find a Caregiver <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </Link>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : bookings.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
              <Calendar className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground mb-4">No bookings yet</p>
            <Link href="/caregivers">
              <Button>Find a Caregiver</Button>
            </Link>
          </div>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {bookings.slice(0, 6).map((booking, index) => (
            <motion.div
              key={booking._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-white text-sm font-bold">
                        {booking.caregiverId?.name?.charAt(0) || '?'}
                      </div>
                      <CardTitle className="text-lg">
                        {booking.caregiverId?.name || 'Caregiver'}
                      </CardTitle>
                    </div>
                    <Badge className={getStatusColor(booking.status)}>
                      {booking.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Date</span>
                      <span>{new Date(booking.date).toLocaleDateString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Time</span>
                      <span>{new Date(booking.date).toLocaleTimeString('en-IN', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Hours</span>
                      <span>{booking.hours}h</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total</span>
                      <span className="font-semibold text-primary">₹{booking.totalAmount}</span>
                    </div>
                    {booking.paymentStatus && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Payment</span>
                        <span className={getPaymentStatusColor(booking.paymentStatus)}>
                          {booking.paymentStatus}
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
