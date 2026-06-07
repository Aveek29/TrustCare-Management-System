'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { Navigation } from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { fetchAPI } from '@/lib/utils';
import { Search, MapPin, Loader2, Building2, Star, Filter, X, ChevronDown, ChevronUp, Navigation2, GraduationCap, Sparkles, Stethoscope, Pill, Dumbbell, Heart, Home, FlaskConical, Baby, Ambulance as AmbulanceIcon } from 'lucide-react';
import { motion } from 'framer-motion';

interface Facility {
  _id: string;
  name: string;
  address: { street: string; city: string; state: string; zip: string; full: string };
  coordinates: { lat: number; lng: number };
  phone: string;
  website: string;
  facilityType: string;
  services: string[];
  specialities: string[];
  rating: number;
  reviewCount: number;
  sourceName: string;
  sourceUrl: string;
}

const FACILITY_TYPES = [
  'hospital', 'clinic', 'nursing-home', 'diagnostic-center',
  'school', 'college', 'university', 'educational-institute',
  'maid-service', 'housekeeping', 'cleaning-service',
  'pharmacy', 'rehabilitation-center', 'daycare',
  'fitness-center', 'laboratory', 'blood-bank', 'ambulance-service',
];
const SERVICE_OPTIONS = [
  'Emergency', 'OPD', 'Pharmacy', 'Laboratory', 'X-Ray', 'MRI', 'CT Scan',
  'Blood Test', 'Vaccination', 'Health Checkup', 'Ambulance', 'Telemedicine',
  'Physiotherapy', 'Dental', 'Eye Care',
];
const SPECIALITY_OPTIONS = [
  'Cardiology', 'Neurology', 'Orthopedics', 'Pediatrics', 'Oncology',
  'Gastroenterology', 'Dermatology', 'Gynecology', 'ENT', 'Ophthalmology',
  'Psychiatry', 'Urology', 'General Medicine', 'Geriatrics',
];

export default function FacilitiesPage() {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, total: 0, pages: 1 });
  const [filters, setFilters] = useState({
    city: '',
    state: '',
    type: '',
    speciality: '',
    services: '',
    minRating: '',
    sortBy: 'rating',
  });
  const [distinctCities, setDistinctCities] = useState<string[]>([]);
  const [geoLocation, setGeoLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoRadius, setGeoRadius] = useState('10');
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedSearch(searchText), 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [searchText]);

  const fetchFacilities = useCallback(async (pageNum = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (debouncedSearch) params.set('search', debouncedSearch);
      if (filters.city) params.set('city', filters.city);
      if (filters.state) params.set('state', filters.state);
      if (filters.type) params.set('type', filters.type);
      if (filters.speciality) params.set('speciality', filters.speciality);
      if (filters.services) params.set('services', filters.services);
      if (filters.minRating) params.set('minRating', filters.minRating);
      if (filters.sortBy) params.set('sortBy', filters.sortBy);
      params.set('page', String(pageNum));
      params.set('limit', '20');

      const data = await fetchAPI(`/aggregator/facilities?${params.toString()}`);
      setFacilities(data.facilities || []);
      setPagination(data.pagination || { page: 1, total: 0, pages: 1 });
      if (data.filters?.cities) setDistinctCities(data.filters.cities);
    } catch {
      setFacilities([]);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, filters]);

  useEffect(() => { fetchFacilities(1); }, [fetchFacilities]);

  const handleGeoSearch = () => {
    setGeoLoading(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const { latitude, longitude } = pos.coords;
          setGeoLocation({ lat: latitude, lng: longitude });
          setGeoLoading(false);
          setLoading(true);
          try {
            const data = await fetchAPI(`/aggregator/facilities/geo/nearby?lat=${latitude}&lng=${longitude}&radius=${geoRadius}`);
            setFacilities(data.facilities || []);
            setPagination(data.pagination || { page: 1, total: 0, pages: 1 });
          } catch {
            setFacilities([]);
          } finally { setLoading(false); }
        },
        () => { setGeoLoading(false); console.error('Could not get location'); },
        { enableHighAccuracy: false, timeout: 10000 }
      );
    } else {
      setGeoLoading(false);
    }
  };

  const clearFilters = () => {
    setSearchText('');
    setFilters({ city: '', state: '', type: '', speciality: '', services: '', minRating: '', sortBy: 'rating' });
    setGeoLocation(null);
  };

  const hasActiveFilters = debouncedSearch || filters.city || filters.state || filters.type || filters.speciality || filters.services || filters.minRating || geoLocation;

  return (
    <div className="min-h-screen">
      <Navigation />

      <div className="pt-24 pb-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h1 className="text-4xl font-bold">Healthcare Facilities</h1>
          <p className="text-muted-foreground mt-1">Find hospitals, clinics, and healthcare centers across India — powered by real OpenStreetMap data</p>
        </div>

        <div className="mb-6 space-y-4">
          <div className="flex gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Search by name, city, speciality, service..."
                className="pl-10 pr-4 h-12 text-base"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
              />
              {searchText && (
                <button onClick={() => setSearchText('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                  <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                </button>
              )}
            </div>
            <Button variant={showFilters ? 'default' : 'outline'} className="h-12 px-4 gap-2" onClick={() => setShowFilters(!showFilters)}>
              <Filter className="h-5 w-5" /> Filters
            </Button>
            <Button variant="outline" className="h-12 px-4 gap-2" onClick={handleGeoSearch} disabled={geoLoading}>
              <Navigation2 className="h-5 w-5" />
              {geoLoading ? 'Locating...' : 'Near Me'}
            </Button>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                placeholder="Radius km"
                className="h-12 w-24"
                value={geoRadius}
                onChange={(e) => setGeoRadius(e.target.value)}
              />
              {geoLocation && (
                <Badge variant="secondary" className="h-8">
                  <MapPin className="h-3 w-3 mr-1" />
                  Using your location
                  <button onClick={() => setGeoLocation(null)} className="ml-1"><X className="h-3 w-3" /></button>
                </Badge>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {loading ? 'Searching...' : `${pagination.total} facility${pagination.total !== 1 ? 'ies' : 'y'} found`}
            </p>
            <Badge variant="outline" className="text-xs">
              <Building2 className="h-3 w-3 mr-1" />
              Data © OpenStreetMap
            </Badge>
          </div>

          {hasActiveFilters && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-muted-foreground">Active:</span>
              {debouncedSearch && <Badge variant="secondary" className="gap-1">"{debouncedSearch}"<button onClick={() => setSearchText('')}><X className="h-3 w-3 ml-1" /></button></Badge>}
              {filters.city && <Badge variant="secondary" className="gap-1">{filters.city}<button onClick={() => setFilters(f => ({ ...f, city: '' }))}><X className="h-3 w-3 ml-1" /></button></Badge>}
              {filters.type && <Badge variant="secondary" className="gap-1">{filters.type}<button onClick={() => setFilters(f => ({ ...f, type: '' }))}><X className="h-3 w-3 ml-1" /></button></Badge>}
              {filters.speciality && <Badge variant="secondary" className="gap-1">{filters.speciality}<button onClick={() => setFilters(f => ({ ...f, speciality: '' }))}><X className="h-3 w-3 ml-1" /></button></Badge>}
              {filters.minRating && <Badge variant="secondary" className="gap-1">{filters.minRating}+ stars<button onClick={() => setFilters(f => ({ ...f, minRating: '' }))}><X className="h-3 w-3 ml-1" /></button></Badge>}
              <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs h-7">Clear All</Button>
            </div>
          )}

          {showFilters && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="grid md:grid-cols-4 gap-4 p-4 rounded-lg border bg-card">
              <div>
                <label className="text-sm font-medium mb-1 block">City</label>
                <Input
                  placeholder="e.g. Delhi, Mumbai"
                  value={filters.city}
                  onChange={(e) => setFilters(f => ({ ...f, city: e.target.value }))}
                  list="city-suggestions"
                />
                <datalist id="city-suggestions">
                  {distinctCities.map(c => <option key={c} value={c} />)}
                </datalist>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">State</label>
                <Input
                  placeholder="e.g. Delhi, Karnataka"
                  value={filters.state}
                  onChange={(e) => setFilters(f => ({ ...f, state: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Facility Type</label>
                <select className="w-full h-10 px-3 rounded-md border bg-background text-sm" value={filters.type} onChange={(e) => setFilters(f => ({ ...f, type: e.target.value }))}>
                  <option value="">All Types</option>
                  {FACILITY_TYPES.map(t => <option key={t} value={t}>{t.replace('-', ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Speciality</label>
                <select className="w-full h-10 px-3 rounded-md border bg-background text-sm" value={filters.speciality} onChange={(e) => setFilters(f => ({ ...f, speciality: e.target.value }))}>
                  <option value="">All Specialities</option>
                  {SPECIALITY_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Services</label>
                <select className="w-full h-10 px-3 rounded-md border bg-background text-sm" value={filters.services} onChange={(e) => setFilters(f => ({ ...f, services: e.target.value }))}>
                  <option value="">All Services</option>
                  {SERVICE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Min Rating</label>
                <select className="w-full h-10 px-3 rounded-md border bg-background text-sm" value={filters.minRating} onChange={(e) => setFilters(f => ({ ...f, minRating: e.target.value }))}>
                  <option value="">Any Rating</option>
                  <option value="4">4+ Stars</option>
                  <option value="3">3+ Stars</option>
                  <option value="2">2+ Stars</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Sort By</label>
                <select className="w-full h-10 px-3 rounded-md border bg-background text-sm" value={filters.sortBy} onChange={(e) => setFilters(f => ({ ...f, sortBy: e.target.value }))}>
                  <option value="rating">Highest Rated</option>
                  <option value="name">Name A-Z</option>
                  <option value="newest">Newest</option>
                </select>
              </div>
            </motion.div>
          )}
        </div>

        <div>
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : facilities.length === 0 ? (
            <Card className="p-12 text-center">
              <div className="flex flex-col items-center gap-3">
                <Building2 className="h-12 w-12 text-muted-foreground/50" />
                <p className="text-muted-foreground text-lg">No facilities found</p>
                <p className="text-sm text-muted-foreground">Try adjusting your search or filters</p>
                {hasActiveFilters && <Button variant="outline" size="sm" onClick={clearFilters}>Clear All Filters</Button>}
              </div>
            </Card>
          ) : (
            <>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {facilities.map((facility, i) => (
                    <motion.div key={facility._id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                    <Card className="hover:shadow-xl transition-all duration-300 hover:-translate-y-1 h-full flex flex-col">
                      <CardHeader>
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-white shrink-0">
                            {facility.facilityType?.includes('school') || facility.facilityType?.includes('college') || facility.facilityType?.includes('university') || facility.facilityType?.includes('educational') ? (
                              <GraduationCap className="h-5 w-5" />
                            ) : facility.facilityType?.includes('maid') || facility.facilityType?.includes('housekeeping') || facility.facilityType?.includes('cleaning') ? (
                              <Sparkles className="h-5 w-5" />
                            ) : facility.facilityType?.includes('pharmacy') ? (
                              <Pill className="h-5 w-5" />
                            ) : facility.facilityType?.includes('fitness') || facility.facilityType?.includes('gym') || facility.facilityType?.includes('yoga') ? (
                              <Dumbbell className="h-5 w-5" />
                            ) : facility.facilityType?.includes('rehabilitation') ? (
                              <Heart className="h-5 w-5" />
                            ) : facility.facilityType?.includes('diagnostic') || facility.facilityType?.includes('laboratory') || facility.facilityType?.includes('blood') ? (
                              <FlaskConical className="h-5 w-5" />
                            ) : facility.facilityType?.includes('daycare') || facility.facilityType?.includes('creche') ? (
                              <Baby className="h-5 w-5" />
                            ) : facility.facilityType?.includes('ambulance') ? (
                              <AmbulanceIcon className="h-5 w-5" />
                            ) : facility.facilityType?.includes('clinic') || facility.facilityType?.includes('nursing') ? (
                              <Stethoscope className="h-5 w-5" />
                            ) : facility.facilityType?.includes('home') ? (
                              <Home className="h-5 w-5" />
                            ) : (
                              <Building2 className="h-5 w-5" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-lg truncate">{facility.name}</h3>
                            <div className="flex items-center text-sm text-muted-foreground mt-1">
                              <MapPin className="h-3 w-3 mr-1 shrink-0" />
                              <span className="truncate">{facility.address.full || `${facility.address.city}, ${facility.address.state}`}</span>
                            </div>
                          </div>
                          <Badge variant="outline" className="ml-2 shrink-0 text-xs capitalize">
                            {facility.facilityType?.replace('-', ' ')}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="flex-1">
                        {facility.rating > 0 && (
                          <div className="flex items-center text-sm mb-3">
                            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400 mr-1" />
                            {facility.rating.toFixed(1)}
                            {facility.reviewCount > 0 && <span className="text-muted-foreground ml-1">({facility.reviewCount})</span>}
                          </div>
                        )}
                        {facility.coordinates?.lat !== 0 && (
                          <div className="flex items-center text-xs text-muted-foreground mb-3">
                            <Navigation2 className="h-3 w-3 mr-1" />
                            {facility.coordinates.lat.toFixed(4)}, {facility.coordinates.lng.toFixed(4)}
                          </div>
                        )}
                        {facility.specialities?.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-2">
                            {facility.specialities.slice(0, 3).map(s => <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>)}
                            {facility.specialities.length > 3 && <Badge variant="outline" className="text-xs">+{facility.specialities.length - 3}</Badge>}
                          </div>
                        )}
                        {facility.services?.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {facility.services.slice(0, 3).map(s => <Badge key={s} variant="outline" className="text-xs bg-muted/30">{s}</Badge>)}
                            {facility.services.length > 3 && <Badge variant="outline" className="text-xs">+{facility.services.length - 3}</Badge>}
                          </div>
                        )}
                        {facility.phone && <p className="text-xs text-muted-foreground mt-2">{facility.phone}</p>}
                      </CardContent>
                      <CardFooter className="gap-2">
                        <Link href={`/facilities/${facility._id}`} className="flex-1">
                          <Button variant="default" className="w-full bg-gradient-to-r from-primary to-purple-600">View Details</Button>
                        </Link>
                        {facility.coordinates?.lat !== 0 && (
                          <a href={`https://www.google.com/maps?q=${facility.coordinates.lat},${facility.coordinates.lng}`} target="_blank" rel="noopener noreferrer">
                            <Button variant="outline" size="icon"><Navigation2 className="h-4 w-4" /></Button>
                          </a>
                        )}
                      </CardFooter>
                    </Card>
                  </motion.div>
                ))}
              </div>

              {pagination.pages > 1 && (
                <div className="flex justify-center items-center gap-4 mt-8">
                  <Button variant="outline" disabled={pagination.page <= 1} onClick={() => fetchFacilities(pagination.page - 1)}>Previous</Button>
                  <span className="text-sm text-muted-foreground">Page {pagination.page} of {pagination.pages}</span>
                  <Button variant="outline" disabled={pagination.page >= pagination.pages} onClick={() => fetchFacilities(pagination.page + 1)}>Next</Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}


