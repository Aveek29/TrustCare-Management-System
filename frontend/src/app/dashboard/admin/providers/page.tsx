'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store';
import { fetchAPI } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Building2, Loader2, Search, ChevronLeft, ChevronRight, MapPin, Phone, Star } from 'lucide-react';

interface Facility {
  _id: string;
  name: string;
  address: { city: string; state: string; full: string };
  phone: string;
  facilityType: string;
  specialities: string[];
  rating: number;
  reviewCount: number;
  sourceName: string;
  lastSeen: string;
}

export default function ProvidersPage() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'ADMIN') { router.push('/login'); return; }
    fetchFacilities();
  }, [isAuthenticated, user, page]);

  const fetchFacilities = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: page.toString(), limit: '20' });
      if (search) params.set('search', search);
      const data = await fetchAPI(`/aggregator/facilities?${params}`);
      setFacilities(data.facilities || []);
      setTotalPages(data.pagination?.pages || 1);
    } catch { setFacilities([]); }
    finally { setLoading(false); }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchFacilities();
  };

  if (!isAuthenticated || user?.role !== 'ADMIN') return null;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Healthcare Providers Directory</h1>
          <p className="text-muted-foreground">Aggregated healthcare facilities from public sources</p>
        </div>
        <form onSubmit={handleSearch} className="relative w-72">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search facilities..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </form>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : (
        <>
          {facilities.length === 0 && (
            <Card><CardContent className="p-8 text-center text-muted-foreground">No facilities found. Run a discovery job to populate data.</CardContent></Card>
          )}
          <div className="grid md:grid-cols-2 gap-4">
            {facilities.map((facility) => (
              <Card key={facility._id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Building2 className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold truncate">{facility.name}</h3>
                      {facility.address?.full && (
                        <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                          <MapPin className="h-3 w-3 shrink-0" /> {facility.address.full}
                        </p>
                      )}
                      {facility.phone && (
                        <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                          <Phone className="h-3 w-3 shrink-0" /> {facility.phone}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-1 mt-2">
                        {facility.specialities?.slice(0, 4).map((s, i) => (
                          <Badge key={i} variant="outline" className="text-xs">{s}</Badge>
                        ))}
                        {(facility.specialities?.length || 0) > 4 && (
                          <Badge variant="outline" className="text-xs">+{facility.specialities.length - 4}</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Star className="h-3 w-3 text-yellow-500" /> {facility.rating || 'N/A'}</span>
                        <Badge variant="secondary" className="text-xs">{facility.facilityType || 'Unknown'}</Badge>
                        <span>Source: {facility.sourceName || 'Unknown'}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-4 mt-6">
              <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                <ChevronLeft className="h-4 w-4" /> Previous
              </Button>
              <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
              <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                Next <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
