'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Navigation } from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { fetchAPI } from '@/lib/utils';
import { Star, MapPin, Clock, DollarSign, Loader2, Sparkles, ThumbsUp, Search, SlidersHorizontal, X, Filter, Globe, Database, Wifi } from 'lucide-react';
import { motion } from 'framer-motion';

interface CaregiverResult {
  _source?: string;
  _id?: string;
  name: string;
  avatar?: string;
  skills?: string[];
  rating?: number;
  hourlyRate?: number;
  isAvailable?: boolean;
  experienceYears?: number;
  bio?: string;
  location?: { city?: string };
  type?: string;
  address?: { city?: string; state?: string; full?: string };
  coordinates?: { lat: number; lng: number };
  category?: string;
}

const SKILL_OPTIONS = [
  'Elder Care', 'Child Care', 'Nursing', 'Physiotherapy',
  'Dementia Care', 'Palliative Care', 'Post-Surgery Care',
  'Companionship', 'Medication Management', 'Cooking',
  'Housekeeping', 'Personal Hygiene', 'Mobility Assistance',
  'Emergency Response', 'Special Needs Care',
];

export default function CaregiversPage() {
  const [localResults, setLocalResults] = useState<CaregiverResult[]>([]);
  const [webResults, setWebResults] = useState<CaregiverResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [includeWeb, setIncludeWeb] = useState(true);
  const [sourceCounts, setSourceCounts] = useState({ local: 0, openstreetmap: 0, wikidata: 0 });
  const [filters, setFilters] = useState({
    skills: '',
    minRating: '',
    maxRate: '',
    city: '',
    available: false,
  });
  const [appliedCount, setAppliedCount] = useState(0);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedSearch(searchText), 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [searchText]);

  useEffect(() => {
    const count = [filters.skills, filters.minRating, filters.maxRate, filters.city, filters.available ? 'true' : ''].filter(Boolean).length;
    setAppliedCount(count);
    fetchResults();
  }, [debouncedSearch, filters, includeWeb]);

    const normalizeCaregiver = (d: any): CaregiverResult => {
    if (d._source === 'local' || d.caregiverId) {
      return {
        _source: 'local',
        _id: d._id,
        name: d.name || d.caregiverId?.name || 'Unknown',
        avatar: d.avatar || d.caregiverId?.avatar || null,
        skills: d.skills || [],
        rating: d.rating || 0,
        hourlyRate: d.hourlyRate || 0,
        isAvailable: d.isAvailable || false,
        experienceYears: d.experienceYears || 0,
        bio: d.bio || '',
        location: d.location || d.caregiverId?.location || null,
      };
    }
    return d;
  };

  const fetchResults = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      const term = debouncedSearch || filters.skills || '';
      if (term) params.set('q', term);
      if (filters.city) params.set('city', filters.city);
      if (filters.minRating) params.set('minRating', filters.minRating);
      if (filters.maxRate) params.set('maxRate', filters.maxRate);
      if (!includeWeb) {
        params.set('skills', term);
        params.set('available', filters.available ? 'true' : '');
        const qs = params.toString();
        const data = await fetchAPI(`/caregivers${qs ? `?${qs}` : ''}`);
        const normalized = (Array.isArray(data) ? data : []).map(normalizeCaregiver);
        setLocalResults(normalized);
        setWebResults([]);
        setSourceCounts({ local: normalized.length, openstreetmap: 0, wikidata: 0 });
      } else {
        const qs = params.toString();
        const data = await fetchAPI(`/search/realtime${qs ? `?${qs}` : ''}`);
        const local = (data.local || []).map(normalizeCaregiver);
        setLocalResults(local);
        setWebResults(data.web || []);
        setSourceCounts(data.sources || { local: 0, openstreetmap: 0, wikidata: 0 });
      }
    } catch {
      setLocalResults([]);
      setWebResults([]);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, filters, includeWeb]);

  const clearFilters = () => {
    setSearchText('');
    setFilters({ skills: '', minRating: '', maxRate: '', city: '', available: false });
  };

  const hasActiveFilters = appliedCount > 0 || debouncedSearch;
  const totalResults = localResults.length + webResults.length;

  return (
    <div className="min-h-screen">
      <Navigation />
      
      <div className="pt-24 pb-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <h1 className="text-4xl font-bold">Find Your Perfect Caregiver</h1>
          <p className="text-muted-foreground mt-1">
            Search local caregivers + AI-scraped results from across the web
          </p>
        </div>

        <div className="mb-6 space-y-4">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Search by skill, name, city, keyword..."
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
            <Button
              variant={showFilters ? 'default' : 'outline'}
              className="h-12 px-4 gap-2"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-5 w-5" />
              Filters
              {appliedCount > 0 && (
                <Badge className="ml-1 bg-primary-foreground text-primary text-xs">{appliedCount}</Badge>
              )}
            </Button>
            <Button
              variant={includeWeb ? 'default' : 'outline'}
              className={`h-12 px-4 gap-2 ${includeWeb ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white' : ''}`}
              onClick={() => setIncludeWeb(!includeWeb)}
            >
              <Globe className="h-5 w-5" />
              {includeWeb ? 'AI Scrape ON' : 'AI Scrape OFF'}
            </Button>
          </div>

          {hasActiveFilters && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-muted-foreground">Active filters:</span>
              {debouncedSearch && (
                <Badge variant="secondary" className="gap-1">
                  Search: {debouncedSearch}
                  <button onClick={() => setSearchText('')}><X className="h-3 w-3 ml-1" /></button>
                </Badge>
              )}
              {filters.skills && (
                <Badge variant="secondary" className="gap-1">
                  {filters.skills}
                  <button onClick={() => setFilters(f => ({ ...f, skills: '' }))}><X className="h-3 w-3 ml-1" /></button>
                </Badge>
              )}
              {filters.minRating && (
                <Badge variant="secondary" className="gap-1">
                  Min Rating: {filters.minRating}+
                  <button onClick={() => setFilters(f => ({ ...f, minRating: '' }))}><X className="h-3 w-3 ml-1" /></button>
                </Badge>
              )}
              {filters.maxRate && (
                <Badge variant="secondary" className="gap-1">
                  Max ₹{filters.maxRate}/hr
                  <button onClick={() => setFilters(f => ({ ...f, maxRate: '' }))}><X className="h-3 w-3 ml-1" /></button>
                </Badge>
              )}
              {filters.city && (
                <Badge variant="secondary" className="gap-1">
                  City: {filters.city}
                  <button onClick={() => setFilters(f => ({ ...f, city: '' }))}><X className="h-3 w-3 ml-1" /></button>
                </Badge>
              )}
              {filters.available && (
                <Badge variant="secondary" className="gap-1">
                  Available Now
                  <button onClick={() => setFilters(f => ({ ...f, available: false }))}><X className="h-3 w-3 ml-1" /></button>
                </Badge>
              )}
              <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs h-7">
                Clear All
              </Button>
            </div>
          )}

          {showFilters && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid md:grid-cols-5 gap-4 p-4 rounded-lg border bg-card"
            >
              <div>
                <label className="text-sm font-medium mb-1 block">Skill / Speciality</label>
                <select className="w-full h-10 px-3 rounded-md border bg-background text-sm" value={filters.skills} onChange={(e) => setFilters(f => ({ ...f, skills: e.target.value }))}>
                  <option value="">All Skills</option>
                  {SKILL_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">City</label>
                <Input placeholder="e.g. Delhi, Mumbai" value={filters.city} onChange={(e) => setFilters(f => ({ ...f, city: e.target.value }))} />
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
                <label className="text-sm font-medium mb-1 block">Max Rate (₹/hr)</label>
                <Input type="number" placeholder="e.g. 500" value={filters.maxRate} onChange={(e) => setFilters(f => ({ ...f, maxRate: e.target.value }))} />
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-primary" checked={filters.available} onChange={(e) => setFilters(f => ({ ...f, available: e.target.checked }))} />
                  <span className="text-sm font-medium">Available Now</span>
                </label>
              </div>
            </motion.div>
          )}
        </div>

        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <p className="text-sm text-muted-foreground">
              {loading ? 'Searching...' : `${totalResults} result${totalResults !== 1 ? 's' : ''} found`}
            </p>
            {includeWeb && !loading && totalResults > 0 && (
              <div className="flex gap-2 text-xs">
                <Badge variant="outline" className="gap-1"><Database className="h-3 w-3" />{sourceCounts.local} local</Badge>
                <Badge variant="outline" className="gap-1"><Globe className="h-3 w-3" />{sourceCounts.openstreetmap} OSM</Badge>
                <Badge variant="outline" className="gap-1"><Wifi className="h-3 w-3" />{sourceCounts.wikidata} Wikidata</Badge>
              </div>
            )}
          </div>
          <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white">
            <Sparkles className="h-3 w-3 mr-1" />
            {includeWeb ? 'AI Web Scraping' : 'Local Only'}
          </Badge>
        </div>

        <div>
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : totalResults === 0 ? (
            <Card className="p-12 text-center">
              <div className="flex flex-col items-center gap-3">
                <Search className="h-12 w-12 text-muted-foreground/50" />
                <p className="text-muted-foreground text-lg">No results found</p>
                <p className="text-sm text-muted-foreground">Try adjusting your search or filters, or toggle AI Scrape ON</p>
                {hasActiveFilters && <Button variant="outline" size="sm" onClick={clearFilters}>Clear All Filters</Button>}
                {!includeWeb && <Button variant="default" size="sm" onClick={() => setIncludeWeb(true)}>Enable AI Scrape</Button>}
              </div>
            </Card>
          ) : (
            <div className="space-y-8">
              {localResults.length > 0 && (
                <div>
                  <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Database className="h-5 w-5 text-primary" />
                    Local Caregivers ({localResults.length})
                  </h2>
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {localResults.map((caregiver, index) => (
                      <motion.div key={caregiver._id || index} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.03 }}>
                        <Card className="hover:shadow-xl transition-all duration-300 hover:-translate-y-1 h-full flex flex-col">
                          <CardHeader className="flex flex-row items-start gap-4">
                            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-white text-xl font-bold overflow-hidden shrink-0">
                              {caregiver.avatar ? (
                                <img src={caregiver.avatar} alt={caregiver.name} className="w-full h-full object-cover" />
                              ) : (
                                caregiver.name?.charAt(0) || '?'
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-lg truncate">{caregiver.name}</h3>
                              <div className="flex items-center text-sm text-muted-foreground">
                                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400 mr-1" />
                                {caregiver.rating?.toFixed(1) || '0.0'}
                              </div>
                              <Badge variant="outline" className="mt-1 text-xs">Local Caregiver</Badge>
                            </div>
                          </CardHeader>
                          <CardContent className="flex-1">
                            <div className="space-y-2 text-sm">
                              {caregiver.experienceYears ? (
                                <div className="flex items-center text-muted-foreground"><Clock className="h-4 w-4 mr-2" />{caregiver.experienceYears} years exp</div>
                              ) : null}
                              {caregiver.hourlyRate ? (
                                <div className="flex items-center text-muted-foreground"><DollarSign className="h-4 w-4 mr-2" />₹{caregiver.hourlyRate}/hour</div>
                              ) : null}
                              {caregiver.location?.city ? (
                                <div className="flex items-center text-muted-foreground"><MapPin className="h-4 w-4 mr-2" />{caregiver.location.city}</div>
                              ) : null}
                            </div>
                            {caregiver.skills?.length ? (
                              <div className="flex flex-wrap gap-2 mt-4">
                                {caregiver.skills.slice(0, 3).map(s => <Badge key={s} variant="outline" className="text-xs">{s}</Badge>)}
                                {caregiver.skills.length > 3 && <Badge variant="outline" className="text-xs">+{caregiver.skills.length - 3}</Badge>}
                              </div>
                            ) : null}
                          </CardContent>
                          <CardFooter>
                            <Link href={`/caregivers/${caregiver._id}`} className="w-full">
                              <Button className="w-full bg-gradient-to-r from-primary to-purple-600">View Profile</Button>
                            </Link>
                          </CardFooter>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {webResults.length > 0 && (
                <div>
                  <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Globe className="h-5 w-5 text-purple-500" />
                    Web Results ({webResults.length})
                    <span className="text-xs text-muted-foreground font-normal">via OpenStreetMap & Wikidata</span>
                  </h2>
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {webResults.map((result, index) => (
                      <motion.div key={`web-${index}`} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.03 }}>
                        <Card className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1 h-full flex flex-col border-purple-200/50">
                          <CardHeader>
                            <div className="flex items-start justify-between">
                              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-400 to-pink-500 flex items-center justify-center text-white text-xl font-bold shrink-0">
                                {result.name?.charAt(0) || '?'}
                              </div>
                              <Badge variant="outline" className="text-xs capitalize">
                                {result._source === 'wikidata' ? 'Wikidata' : 'OpenStreetMap'}
                              </Badge>
                            </div>
                            <h3 className="font-semibold text-base mt-2 truncate">{result.name}</h3>
                            {result.type && <p className="text-xs text-muted-foreground capitalize">{result.type}</p>}
                          </CardHeader>
                          <CardContent className="flex-1">
                            {result.address?.city && (
                              <div className="flex items-center text-sm text-muted-foreground"><MapPin className="h-4 w-4 mr-2 shrink-0" />{result.address.city}{result.address.state ? `, ${result.address.state}` : ''}</div>
                            )}
                            {result.coordinates?.lat ? (
                              <div className="flex items-center text-xs text-muted-foreground mt-1">
                                {result.coordinates.lat.toFixed(4)}, {result.coordinates.lng.toFixed(4)}
                              </div>
                            ) : null}
                            {result.address?.full && (
                              <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{result.address.full}</p>
                            )}
                          </CardContent>
                          <CardFooter>
                            {result.coordinates?.lat ? (
                              <a href={`https://www.google.com/maps?q=${result.coordinates.lat},${result.coordinates.lng}`} target="_blank" rel="noopener noreferrer" className="w-full">
                                <Button variant="outline" className="w-full gap-2"><MapPin className="h-4 w-4" /> View on Map</Button>
                              </a>
                            ) : (
                              <p className="text-xs text-muted-foreground w-full text-center">Data from {result._source === 'wikidata' ? 'Wikidata' : 'OpenStreetMap'}</p>
                            )}
                          </CardFooter>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
