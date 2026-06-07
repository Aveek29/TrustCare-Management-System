'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store';
import { fetchAPI } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar, Clock, DollarSign, MapPin, Search, Star, User, CheckCircle2, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface Caregiver {
  _id: string;
  caregiverId: {
    _id: string;
    name: string;
    email: string;
    avatar?: string;
    location?: { lat: number; lng: number; address?: string };
    phone?: string;
  };
  hourlyRate: number;
  experienceYears: number;
  skills: string[];
  bio: string;
  rating: number;
  totalReviews: number;
  isAvailable: boolean;
  isVerified: boolean;
}

export default function CustomerHirePage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [caregivers, setCaregivers] = useState<Caregiver[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [selectedCaregiver, setSelectedCaregiver] = useState<Caregiver | null>(null);
  const [booking, setBooking] = useState({
    date: '',
    hours: 2,
    address: user?.address || '',
    notes: ''
  });
  const [bookingLoading, setBookingLoading] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [bookingStep, setBookingStep] = useState<'select' | 'details' | 'payment' | 'success'>('select');
  const [createdBooking, setCreatedBooking] = useState<any>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  useEffect(() => {
    fetchCaregivers();
  }, []);

  const fetchCaregivers = async (query?: string) => {
    setSearching(true);
    try {
      const url = query ? `/caregivers?${query}` : '/caregivers';
      const data = await fetchAPI(url);
      setCaregivers(data);
    } catch (error: any) {
      toast.error('Failed to load caregivers');
    } finally {
      setSearching(false);
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const skills = formData.get('skills') as string;
    const query = skills ? `skills=${skills}&available=true` : 'available=true';
    fetchCaregivers(query);
  };

  const handleSelectCaregiver = (caregiver: Caregiver) => {
    setSelectedCaregiver(caregiver);
    setBookingStep('details');
  };

  const calculateTotal = () => {
    if (!selectedCaregiver) return 0;
    return selectedCaregiver.hourlyRate * booking.hours;
  };

  const handleCreateBooking = async () => {
    if (!selectedCaregiver || !booking.date) {
      toast.error('Please fill in all required fields');
      return;
    }

    setBookingLoading(true);
    try {
      const data = await fetchAPI('/bookings', {
        method: 'POST',
        body: JSON.stringify({
          caregiverId: selectedCaregiver._id,
          date: booking.date,
          hours: booking.hours,
          address: booking.address,
          notes: booking.notes
        })
      });
      setCreatedBooking(data);
      toast.success('Booking created successfully!');
      setBookingStep('payment');
    } catch (error: any) {
      toast.error(error.message || 'Failed to create booking');
    } finally {
      setBookingLoading(false);
    }
  };

  const handlePayment = async () => {
    if (!createdBooking) return;

    setPaymentLoading(true);
    try {
      const order = await fetchAPI('/payments/create-order', {
        method: 'POST',
        body: JSON.stringify({ bookingId: createdBooking._id })
      });

      await fetchAPI('/payments/verify', {
        method: 'POST',
        body: JSON.stringify({ 
          bookingId: createdBooking._id, 
          paymentId: order.id 
        })
      });

      toast.success('Payment successful!');
      setBookingStep('success');
    } catch (error: any) {
      toast.error(error.message || 'Payment failed');
    } finally {
      setPaymentLoading(false);
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold" style={{ color: 'var(--foreground)' }}>Hire a Caregiver</h1>
        <p className="mt-2" style={{ color: 'var(--muted-foreground)' }}>
          Find and hire the perfect caregiver for your needs
        </p>
      </div>

      {bookingStep === 'select' && (
        <>
          <form onSubmit={handleSearch} className="flex gap-4 items-end">
            <div className="flex-1">
              <Label htmlFor="skills">Search by Skills</Label>
              <Input 
                id="skills" 
                name="skills" 
                placeholder="e.g. Elderly Care, Medical Support" 
                className="mt-1"
              />
            </div>
            <Button type="submit" disabled={searching}>
              <Search className="h-4 w-4 mr-2" />
              Search
            </Button>
          </form>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24 mt-2" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-20" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : caregivers.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <User className="h-12 w-12 mx-auto mb-4" style={{ color: 'var(--muted-foreground)' }} />
                <p style={{ color: 'var(--muted-foreground)' }}>No caregivers available at the moment</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {caregivers.map((caregiver) => (
                <Card key={caregiver._id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                          {caregiver.caregiverId?.avatar ? (
                            <img src={caregiver.caregiverId.avatar} className="w-full h-full rounded-full object-cover" />
                          ) : (
                            <User className="h-6 w-6 text-primary" />
                          )}
                        </div>
                        <div>
                          <CardTitle className="text-lg">{caregiver.caregiverId?.name || 'Caregiver'}</CardTitle>
                          <CardDescription>{(typeof caregiver.caregiverId?.location === 'object' ? caregiver.caregiverId?.location?.address : caregiver.caregiverId?.location) || 'Location not set'}</CardDescription>
                        </div>
                      </div>
                      {caregiver.isVerified && (
                        <Badge variant="secondary" className="bg-green-100 text-green-800">Verified</Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                        <span style={{ color: 'var(--foreground)' }}>{caregiver.rating?.toFixed(1) || '0.0'}</span>
                        <span style={{ color: 'var(--muted-foreground)' }}>({caregiver.totalReviews || 0})</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <DollarSign className="h-4 w-4 text-primary" />
                        <span style={{ color: 'var(--foreground)' }}>₹{caregiver.hourlyRate}/hr</span>
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap gap-1">
                      {caregiver.skills?.slice(0, 3).map((skill) => (
                        <Badge key={skill} variant="outline" className="text-xs">
                          {skill}
                        </Badge>
                      ))}
                      {caregiver.skills?.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{caregiver.skills.length - 3}
                        </Badge>
                      )}
                    </div>

                    <p className="text-sm line-clamp-2" style={{ color: 'var(--muted-foreground)' }}>
                      {caregiver.bio || 'No bio available'}
                    </p>

                    <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--muted-foreground)' }}>
                      <Clock className="h-4 w-4" />
                      {caregiver.experienceYears || 0} years experience
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button 
                      className="w-full" 
                      disabled={!caregiver.isAvailable}
                      onClick={() => handleSelectCaregiver(caregiver)}
                    >
                      {caregiver.isAvailable ? 'Book Now' : 'Not Available'}
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {bookingStep === 'details' && selectedCaregiver && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Booking Details</CardTitle>
              <CardDescription>Fill in your care requirements</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--muted)' }}>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium" style={{ color: 'var(--foreground)' }}>
                      {selectedCaregiver.caregiverId?.name}
                    </p>
                    <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
                      ₹{selectedCaregiver.hourlyRate}/hour
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="date">Date *</Label>
                <Input 
                  id="date" 
                  type="date" 
                  min={new Date().toISOString().split('T')[0]}
                  value={booking.date}
                  onChange={(e) => setBooking({ ...booking, date: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="hours">Number of Hours *</Label>
                <Input 
                  id="hours" 
                  type="number" 
                  min={1} 
                  max={24}
                  value={booking.hours}
                  onChange={(e) => setBooking({ ...booking, hours: parseInt(e.target.value) || 1 })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Service Address *</Label>
                <div className="flex gap-2">
                  <MapPin className="h-5 w-5 mt-2" style={{ color: 'var(--muted-foreground)' }} />
                  <Textarea 
                    id="address" 
                    placeholder="Enter the full address where care is needed"
                    value={booking.address}
                    onChange={(e) => setBooking({ ...booking, address: e.target.value })}
                    rows={2}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Additional Notes</Label>
                <Textarea 
                  id="notes" 
                  placeholder="Any special requirements or instructions"
                  value={booking.notes}
                  onChange={(e) => setBooking({ ...booking, notes: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="p-4 rounded-lg border" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--muted)' }}>
                <div className="flex justify-between items-center">
                  <span style={{ color: 'var(--foreground)' }}>Total Amount</span>
                  <span className="text-2xl font-bold text-primary">₹{calculateTotal()}</span>
                </div>
                <p className="text-xs mt-1" style={{ color: 'var(--muted-foreground)' }}>
                  {selectedCaregiver.hourlyRate} x {booking.hours} hours
                </p>
              </div>
            </CardContent>
            <CardFooter className="flex gap-4">
              <Button variant="outline" onClick={() => setBookingStep('select')} className="flex-1">
                Back
              </Button>
              <Button 
                onClick={handleCreateBooking} 
                disabled={bookingLoading || !booking.date || !booking.address}
                className="flex-1"
              >
                {bookingLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Continue to Payment'}
              </Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Caregiver Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-1">
                {selectedCaregiver.skills?.map((skill) => (
                  <Badge key={skill} variant="outline">{skill}</Badge>
                ))}
              </div>
              <p style={{ color: 'var(--foreground)' }}>{selectedCaregiver.bio}</p>
              <div className="text-sm space-y-2" style={{ color: 'var(--muted-foreground)' }}>
                <p className="flex items-center gap-2">
                  <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                  {selectedCaregiver.rating?.toFixed(1)} rating ({selectedCaregiver.totalReviews} reviews)
                </p>
                <p className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  {selectedCaregiver.experienceYears} years of experience
                </p>
                {selectedCaregiver.caregiverId?.phone && (
                  <p className="flex items-center gap-2">
                    Phone: {selectedCaregiver.caregiverId.phone}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {bookingStep === 'payment' && createdBooking && (
        <Card className="max-w-xl mx-auto">
          <CardHeader>
            <CardTitle>Payment</CardTitle>
            <CardDescription>Complete your payment securely</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-lg border" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--muted)' }}>
              <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>Amount to Pay</p>
              <p className="text-3xl font-bold text-primary">₹{createdBooking.totalAmount}</p>
            </div>

            <div className="space-y-2">
              <Label>Select Payment Method</Label>
              <div className="grid grid-cols-2 gap-3">
                {['Credit/Debit Card', 'UPI', 'Net Banking', 'Wallet'].map((method) => (
                  <Button key={method} variant="outline" className="h-20">
                    <span>{method}</span>
                  </Button>
                ))}
              </div>
            </div>

            <div className="p-4 rounded-lg bg-yellow-50 border border-yellow-200">
              <p className="text-sm text-yellow-800">
                <strong>Secure Payment:</strong> Your payment will be held in escrow until the service is completed. 
                This ensures protection for both you and the caregiver.
              </p>
            </div>
          </CardContent>
          <CardFooter className="flex gap-4">
            <Button variant="outline" onClick={() => setBookingStep('details')} className="flex-1">
              Back
            </Button>
            <Button onClick={handlePayment} disabled={paymentLoading} className="flex-1">
              {paymentLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Pay Now'}
            </Button>
          </CardFooter>
        </Card>
      )}

      {bookingStep === 'success' && (
        <Card className="max-w-xl mx-auto">
          <CardContent className="py-12 text-center">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--foreground)' }}>
              Booking Confirmed!
            </h2>
            <p className="mb-6" style={{ color: 'var(--muted-foreground)' }}>
              Your payment has been processed successfully. The caregiver will be notified and will confirm the booking shortly.
            </p>
            <div className="space-y-3">
              <Button onClick={() => router.push('/dashboard/customer/bookings')} className="w-full">
                View My Bookings
              </Button>
              <Button variant="outline" onClick={() => {
                setBookingStep('select');
                setSelectedCaregiver(null);
                setCreatedBooking(null);
              }} className="w-full">
                Book Another Caregiver
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
