'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Navigation } from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { fetchAPI, API_URL } from '@/lib/utils';
import { useAuthStore } from '@/store';
import { Star, MapPin, Clock, DollarSign, Loader2, MessageCircle, Calendar, CreditCard, Shield } from 'lucide-react';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

interface Caregiver {
  _id: string;
  caregiverId: {
    _id: string;
    name: string;
    email: string;
    avatar?: string;
    location?: { lat: number; lng: number; address?: string; city?: string };
    phone?: string;
  };
  hourlyRate: number;
  experienceYears: number;
  skills: string[];
  bio?: string;
  rating: number;
  totalReviews: number;
  isAvailable: boolean;
  availability?: {
    monday: boolean;
    tuesday: boolean;
    wednesday: boolean;
    thursday: boolean;
    friday: boolean;
    saturday: boolean;
    sunday: boolean;
  };
}

interface Review {
  _id: string;
  customerId: { name: string; avatar?: string };
  rating: number;
  comment?: string;
  createdAt: string;
}

export default function CaregiverDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [caregiver, setCaregiver] = useState<Caregiver | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState({ date: '', hours: 1, address: '', notes: '' });
  const [showBooking, setShowBooking] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [paymentStep, setPaymentStep] = useState<'booking' | 'payment' | 'success'>('booking');
  const [bookingData, setBookingData] = useState<any>(null);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);

  useEffect(() => {
    fetchCaregiverDetails();
  }, [params.id]);

  const fetchCaregiverDetails = async () => {
    try {
      const [caregiverData] = await Promise.all([
        fetchAPI(`/caregivers/${params.id}`),
      ]);
      setCaregiver(caregiverData);
      
      try {
        const reviewsData = await fetchAPI(`/reviews/caregiver/${params.id}`);
        setReviews(reviewsData);
      } catch (e) {
        setReviews([]);
      }
    } catch (error) {
      console.error('Failed to fetch caregiver:', error);
      toast.error('Failed to load caregiver details');
    } finally {
      setLoading(false);
    }
  };

  const handleBooking = async () => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    if (!booking.date || !booking.address) {
      toast.error('Please fill in all required fields');
      return;
    }

    setBookingLoading(true);
    try {
      console.log('Creating booking for caregiver:', params.id);
      const data = await fetchAPI('/bookings', {
        method: 'POST',
        body: JSON.stringify({
          caregiverId: params.id,
          date: new Date(booking.date).toISOString(),
          hours: booking.hours,
          address: booking.address,
          notes: booking.notes,
        }),
      });
      console.log('Booking created:', data);
      setBookingData(data);
      setShowPayment(true);
      setPaymentStep('payment');
      toast.success('Booking created! Complete payment to confirm.');
    } catch (error: any) {
      console.error('Booking error:', error);
      toast.error(error.message || 'Booking failed. Please try again.');
    } finally {
      setBookingLoading(false);
    }
  };

  const handlePayment = async () => {
    if (!bookingData?._id) {
      toast.error('Invalid booking');
      return;
    }
    
    setPaymentLoading(true);
    try {
      console.log('Processing payment for booking:', bookingData._id);
      const result = await fetchAPI(`/payments/verify`, {
        method: 'POST',
        body: JSON.stringify({
          bookingId: bookingData._id,
          paymentId: `PAY_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        }),
      });
      console.log('Payment result:', result);
      setPaymentStep('success');
      toast.success('Payment successful! Your booking is confirmed.');
    } catch (error: any) {
      console.error('Payment error:', error);
      toast.error(error.message || 'Payment failed. Please try again.');
    } finally {
      setPaymentLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!caregiver) {
    return (
      <div className="min-h-screen">
        <Navigation />
        <div className="pt-24 text-center">
          <p>Caregiver not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Navigation />
      
      <AnimatePresence>
        {showPayment && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              className="bg-white rounded-xl max-w-md w-full p-6"
            >
              {paymentStep === 'payment' && (
                <>
                  <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-4">
                      <CreditCard className="h-8 w-8 text-white" />
                    </div>
                    <h3 className="text-xl font-bold">Complete Payment</h3>
                    <p className="text-muted-foreground">Secure payment via Razorpay</p>
                  </div>
                  
                  <div className="bg-gray-50 rounded-lg p-4 mb-6">
                    <div className="flex justify-between mb-2">
                      <span>Caregiver</span>
                      <span className="font-medium">{caregiver.caregiverId?.name}</span>
                    </div>
                    <div className="flex justify-between mb-2">
                      <span>Hours</span>
                      <span className="font-medium">{booking.hours}</span>
                    </div>
                    <div className="flex justify-between mb-2">
                      <span>Rate</span>
                      <span className="font-medium">₹{caregiver.hourlyRate}/hr</span>
                    </div>
                    <div className="border-t pt-2 mt-2 flex justify-between font-bold">
                      <span>Total</span>
                      <span>₹{caregiver.hourlyRate * booking.hours}</span>
                    </div>
                  </div>

                  <div className="space-y-3 mb-6">
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <Shield className="h-4 w-4 text-green-500" />
                      Payment held in escrow until service complete
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Button variant="outline" onClick={() => setShowPayment(false)} className="flex-1">
                      Cancel
                    </Button>
                    <Button onClick={handlePayment} disabled={paymentLoading} className="flex-1 bg-gradient-to-r from-blue-500 to-purple-500">
                      {paymentLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Pay Now'}
                    </Button>
                  </div>
                </>
              )}

              {paymentStep === 'success' && (
                <div className="text-center">
                  <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Star className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">Booking Confirmed!</h3>
                  <p className="text-muted-foreground mb-6">
                    Your payment is secure in escrow. The caregiver has been notified.
                  </p>
                  <Button onClick={() => {
                    setShowPayment(false);
                    router.push('/dashboard/customer');
                  }} className="w-full">
                    Go to Dashboard
                  </Button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      <div className="pt-24 pb-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col md:flex-row gap-6">
                  <div className="w-32 h-32 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-white text-4xl font-bold overflow-hidden">
                    {caregiver.caregiverId?.avatar ? (
                      <img src={caregiver.caregiverId.avatar} alt={caregiver.caregiverId.name} className="w-full h-full object-cover" />
                    ) : (
                      caregiver.caregiverId?.name?.charAt(0) || '?'
                    )}
                  </div>
                  <div className="flex-1">
                    <h1 className="text-3xl font-bold mb-2">{caregiver.caregiverId?.name}</h1>
                    <div className="flex flex-wrap items-center gap-4 text-muted-foreground mb-4">
                      <div className="flex items-center">
                        <Star className="h-5 w-5 fill-yellow-400 text-yellow-400 mr-1" />
                        {caregiver.rating?.toFixed(1)} ({reviews.length} reviews)
                      </div>
                      <div className="flex items-center">
                        <Clock className="h-5 w-5 mr-1" />
                        {caregiver.experienceYears} years experience
                      </div>
                      <div className="flex items-center">
                        <DollarSign className="h-5 w-5 mr-1" />
                        ₹{caregiver.hourlyRate}/hour
                      </div>
                    </div>
                    {caregiver.isAvailable ? (
                      <Badge className="bg-green-500">Available</Badge>
                    ) : (
                      <Badge variant="secondary">Unavailable</Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>About</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  {caregiver.bio || 'No bio available yet.'}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Skills</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {caregiver.skills?.map((skill) => (
                    <Badge key={skill} variant="outline">{skill}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Availability</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-7 gap-2 text-center">
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, i) => {
                    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
                    const isAvailable = caregiver.availability?.[days[i] as keyof typeof caregiver.availability] ?? false;
                    return (
                      <div key={day} className={`p-2 rounded-lg ${isAvailable ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                        <div className="text-xs font-medium">{day}</div>
                        <div className="text-xs">{isAvailable ? '✓' : '✗'}</div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Reviews</CardTitle>
              </CardHeader>
              <CardContent>
                {reviews.length === 0 ? (
                  <p className="text-muted-foreground">No reviews yet</p>
                ) : (
                  <div className="space-y-4">
                    {reviews.map((review) => (
                      <div key={review._id} className="border-b pb-4 last:border-0">
                        <div className="flex items-center justify-between mb-2">
                          <div className="font-medium">{review.customerId?.name || 'Anonymous'}</div>
                          <div className="flex items-center">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`h-4 w-4 ${i < review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
                              />
                            ))}
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground">{review.comment}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="sticky top-24">
              <CardHeader>
                <CardTitle>Book This Caregiver</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-3xl font-bold">
                  ₹{caregiver.hourlyRate}
                  <span className="text-base font-normal text-muted-foreground">/hour</span>
                </div>
                
                <div className="space-y-2">
                  <Label>Date & Time</Label>
                  <Input
                    type="datetime-local"
                    value={booking.date}
                    onChange={(e) => setBooking({ ...booking, date: e.target.value })}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Number of Hours</Label>
                  <Input
                    type="number"
                    min="1"
                    max="24"
                    value={booking.hours}
                    onChange={(e) => setBooking({ ...booking, hours: parseInt(e.target.value) || 1 })}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Address</Label>
                  <Input
                    placeholder="Service address"
                    value={booking.address}
                    onChange={(e) => setBooking({ ...booking, address: e.target.value })}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Notes (Optional)</Label>
                  <Input
                    placeholder="Any special requirements"
                    value={booking.notes}
                    onChange={(e) => setBooking({ ...booking, notes: e.target.value })}
                  />
                </div>

                <div className="pt-4 border-t">
                  <div className="flex justify-between mb-4">
                    <span>Total</span>
                    <span className="font-bold">₹{caregiver.hourlyRate * booking.hours}</span>
                  </div>
                  
                  {isAuthenticated && user?.role === 'CUSTOMER' ? (
                    <Button className="w-full" onClick={handleBooking} disabled={bookingLoading || !caregiver.isAvailable}>
                      {bookingLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Proceed to Payment'}
                    </Button>
                  ) : !isAuthenticated ? (
                    <Link href="/login" className="w-full">
                      <Button className="w-full">Login to Book</Button>
                    </Link>
                  ) : (
                    <Button className="w-full" disabled>Only customers can book</Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
