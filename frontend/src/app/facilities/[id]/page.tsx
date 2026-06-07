'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Navigation } from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { fetchAPI } from '@/lib/utils';
import { MapPin, Star, Loader2, Building2, Phone, Globe, ArrowLeft, Navigation2, Clock, Shield } from 'lucide-react';

interface Facility {
  _id: string;
  name: string;
  address: { street: string; city: string; state: string; zip: string; full: string };
  coordinates: { lat: number; lng: number };
  phone: string;
  email: string;
  website: string;
  facilityType: string;
  description: string;
  services: string[];
  specialities: string[];
  rating: number;
  reviewCount: number;
  operationalHours: string;
  emergencyServices: boolean;
  sourceName: string;
  sourceUrl: string;
}

export default function FacilityDetailPage() {
  const params = useParams();
  const [facility, setFacility] = useState<Facility | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!params.id) return;
    setLoading(true);
    fetchAPI(`/aggregator/facilities/${params.id}`)
      .then((data) => setFacility(data.facility || data))
      .catch(() => setFacility(null))
      .finally(() => setLoading(false));
  }, [params.id]);

  if (loading) {
    return (
      <div className="min-h-screen">
        <Navigation />
        <div className="pt-24 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      </div>
    );
  }

  if (!facility) {
    return (
      <div className="min-h-screen">
        <Navigation />
        <div className="pt-24 text-center"><p className="text-muted-foreground">Facility not found</p><Link href="/facilities"><Button variant="link" className="mt-2">Back to facilities</Button></Link></div>
      </div>
    );
  }

  const googleMapsUrl = facility.coordinates?.lat
    ? `https://www.google.com/maps?q=${facility.coordinates.lat},${facility.coordinates.lng}`
    : null;

  return (
    <div className="min-h-screen">
      <Navigation />

      <div className="pt-24 pb-12 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <Link href="/facilities" className="inline-flex items-center text-sm text-primary hover:underline mb-4">
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to facilities
        </Link>

        <Card>
          <CardContent className="p-6 md:p-8">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-3xl font-bold">{facility.name}</h1>
                  <Badge variant="outline" className="capitalize">{facility.facilityType?.replace('-', ' ')}</Badge>
                </div>
                <div className="flex items-center text-muted-foreground">
                  <MapPin className="h-4 w-4 mr-1" />
                  {facility.address.full || `${facility.address.city}, ${facility.address.state}`}
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                {googleMapsUrl && (
                  <a href={googleMapsUrl} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" className="gap-2"><Navigation2 className="h-4 w-4" /> Open in Maps</Button>
                  </a>
                )}
              </div>
            </div>

            {facility.description && (
              <div className="mb-6 p-4 bg-muted/50 rounded-lg border">
                <p className="text-sm text-muted-foreground leading-relaxed">{facility.description}</p>
              </div>
            )}

            {facility.coordinates?.lat !== 0 && (
              <div className="w-full h-64 rounded-lg overflow-hidden mb-6 bg-muted">
                <iframe
                  title="Map"
                  width="100%"
                  height="100%"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  src={`https://maps.google.com/maps?q=${facility.coordinates.lat},${facility.coordinates.lng}&z=15&output=embed`}
                  className="border-0"
                />
              </div>
            )}

            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h2 className="text-lg font-semibold">Details</h2>
                <div className="space-y-3">
                  {facility.rating > 0 && (
                    <div className="flex items-center text-sm"><Star className="h-4 w-4 fill-yellow-400 text-yellow-400 mr-2" />{facility.rating.toFixed(1)} ({facility.reviewCount} reviews)</div>
                  )}
                  {facility.phone && (
                    <div className="flex items-center text-sm">
                      <Phone className="h-4 w-4 mr-2 text-muted-foreground" />
                      <a href={`tel:${facility.phone}`} className="text-primary hover:underline">{facility.phone}</a>
                    </div>
                  )}
                  {facility.website && (
                    <div className="flex items-center text-sm">
                      <Globe className="h-4 w-4 mr-2 text-muted-foreground" />
                      <a href={facility.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate">{facility.website}</a>
                    </div>
                  )}
                  {facility.emergencyServices && (
                    <div className="flex items-center text-sm"><Shield className="h-4 w-4 mr-2 text-green-500" />Emergency Services Available</div>
                  )}
                  {facility.operationalHours && (
                    <div className="flex items-center text-sm"><Clock className="h-4 w-4 mr-2 text-muted-foreground" />{facility.operationalHours}</div>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <h2 className="text-lg font-semibold">Specialities & Services</h2>
                {facility.specialities?.length > 0 && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Specialities</p>
                    <div className="flex flex-wrap gap-2">
                      {facility.specialities.map(s => <Badge key={s}>{s}</Badge>)}
                    </div>
                  </div>
                )}
                {facility.services?.length > 0 && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Services</p>
                    <div className="flex flex-wrap gap-2">
                      {facility.services.map(s => <Badge key={s} variant="secondary">{s}</Badge>)}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 pt-4 border-t text-xs text-muted-foreground">
              <div className="flex items-center gap-1"><Building2 className="h-3 w-3" /> Source: {facility.sourceName || 'OpenStreetMap'} &middot; Data &copy; OpenStreetMap contributors, ODbL 1.0.</div>
              {facility.sourceUrl && (
                <a href={facility.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline mt-1 inline-block">View on OpenStreetMap</a>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
