import { Router } from 'express';
import { CaregiverProfile } from '../models/index';

const router = Router();

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org';
const WIKIDATA_URL = 'https://query.wikidata.org/sparql';

let nominatimQueue = Promise.resolve();

async function rateLimitedFetch(url: string, options: Record<string, any>, minDelayMs: number = 1200): Promise<any> {
  const prev = nominatimQueue;
  let release: () => void;
  nominatimQueue = new Promise<void>(r => { release = r; });
  await prev;
  await new Promise(r => setTimeout(r, minDelayMs));
  try {
    return await fetch(url, options);
  } finally {
    release!();
  }
}

async function searchOpenStreetMap(query: string, limit: number = 10): Promise<any[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const url = `${NOMINATIM_BASE}/search?q=${encodeURIComponent(query)}&format=json&limit=${limit}&addressdetails=1`;
    const res = await rateLimitedFetch(url, {
      headers: { 'User-Agent': 'TrustCareBot/1.0 (realtime-search; contact@trustcare.com)' },
      signal: controller.signal,
    });
    if (!res.ok) {
      console.warn(`Nominatim HTTP ${res.status} for query: ${query}`);
      return [];
    }
    const data = (await res.json()) as any[];
    if (!Array.isArray(data) || data.length === 0) return [];
    return data.filter((item: any) => item && item.name && item.name.length > 2).map((item: any) => ({
      _source: 'openstreetmap',
      name: item.name,
      type: item.type || 'healthcare',
      address: {
        street: item.address?.road || item.address?.street || '',
        city: item.address?.city || item.address?.town || item.address?.village || item.address?.county || '',
        state: item.address?.state || '',
        full: item.display_name || '',
      },
      coordinates: { lat: parseFloat(item.lat), lng: parseFloat(item.lon) },
      category: item.category || 'healthcare',
    }));
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      console.warn(`Nominatim timeout for query: ${query}`);
    }
    return [];
  } finally {
    clearTimeout(timeout);
  }
}

async function searchWikidata(query: string, limit: number = 10): Promise<any[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const safeQuery = query.replace(/["']/g, '').replace(/[\\;]/g, '');
    const sparql = safeQuery
      ? `
      SELECT ?item ?itemLabel ?description ?coord ?cityLabel ?stateLabel WHERE {
        ?item wdt:P31/wdt:P279* wd:Q16917.
        ?item wdt:P17 wd:Q668.
        ?item rdfs:label ?itemLabel.
        FILTER(CONTAINS(LCASE(?itemLabel), LCASE("${safeQuery}"))).
        OPTIONAL { ?item wdt:P625 ?coord. }
        OPTIONAL { ?item wdt:P131 ?city. }
        OPTIONAL { ?item wdt:P131 ?state. }
        SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
      }
      ORDER BY ?itemLabel
      LIMIT ${limit}
    `
      : `
      SELECT ?item ?itemLabel ?description ?coord ?cityLabel ?stateLabel WHERE {
        { ?item wdt:P31/wdt:P279* wd:Q16917. } UNION { ?item wdt:P31 wd:Q16921. }
        ?item wdt:P17 wd:Q668.
        OPTIONAL { ?item wdt:P625 ?coord. }
        OPTIONAL { ?item wdt:P131 ?city. }
        OPTIONAL { ?item wdt:P131 ?state. }
        SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
      }
      LIMIT ${limit}
    `;
    const url = `${WIKIDATA_URL}?format=json&query=${encodeURIComponent(sparql)}`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'TrustCareBot/1.0',
        'Accept': 'application/sparql-results+json',
      },
      signal: controller.signal,
    });
    if (!res.ok) {
      console.warn(`Wikidata HTTP ${res.status} for query: ${query}`);
      return [];
    }
    const data = (await res.json()) as any;
    if (!data?.results?.bindings) return [];
    return data.results.bindings.map((b: any) => {
      let lat = 0, lng = 0;
      const coordMatch = b.coord?.value?.match(/Point\(([-\d.]+)\s+([-\d.]+)\)/);
      if (coordMatch) { lng = parseFloat(coordMatch[1]); lat = parseFloat(coordMatch[2]); }
      return {
        _source: 'wikidata',
        name: b.itemLabel?.value || '',
        description: b.description?.value || '',
        address: { city: b.cityLabel?.value || '', state: b.stateLabel?.value || '' },
        coordinates: { lat, lng },
      };
    }).filter((b: any) => b.name);
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      console.warn(`Wikidata timeout for query: ${query}`);
    } else {
      console.warn(`Wikidata error for "${query}": ${err?.message || err}`);
    }
    return [];
  } finally {
    clearTimeout(timeout);
  }
}

const FACILITY_TYPES = [
  'hospital', 'clinic', 'nursing home', 'medical center',
  'school', 'college', 'university', 'educational institution',
  'maid service', 'housekeeping', 'cleaning service',
  'pharmacy', 'diagnostic center', 'laboratory', 'rehabilitation center',
];

async function searchFacilitiesOSM(query: string, city: string, limit: number = 10): Promise<any[]> {
  const results: any[] = [];
  const searchTypes = FACILITY_TYPES.slice(0, 6);
  for (const ftype of searchTypes) {
    if (results.length >= limit) break;
    const q = city ? `${ftype} in ${city}, India` : `${ftype} in India`;
    const res = await searchOpenStreetMap(q, Math.ceil(limit / searchTypes.length));
    for (const r of res) {
      if (!results.some(e => e.name === r.name)) results.push(r);
    }
  }
  return results.slice(0, limit);
}

router.get('/realtime', async (req, res) => {
  try {
    const { q, skills, city, minRating, maxRate, limit = '10' } = req.query;
    const resultLimit = Math.min(20, Math.max(1, parseInt(limit as string) || 10));
    const searchTerm = (q as string || skills as string || '').trim();

    const localQuery: any = { isVerified: true };
    if (searchTerm) {
      localQuery.$or = [
        { skills: { $in: [new RegExp(searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')] } },
        { bio: { $regex: searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' } },
      ];
    }
    if (minRating) localQuery.rating = { $gte: parseFloat(minRating as string) };
    if (maxRate) localQuery.hourlyRate = { $lte: parseFloat(maxRate as string) };
    if (city) localQuery['caregiverId.location.city'] = { $regex: city as string, $options: 'i' };

    const localPromise = CaregiverProfile.find(localQuery)
      .populate('caregiverId', 'name email avatar location phone')
      .sort({ rating: -1 })
      .limit(resultLimit)
      .lean()
      .then(profiles =>
        profiles.map(p => ({
          _source: 'local',
          _id: (p as any)._id,
          name: ((p as any).caregiverId as any)?.name || 'Unknown',
          avatar: ((p as any).caregiverId as any)?.avatar || null,
          skills: (p as any).skills || [],
          rating: (p as any).rating || 0,
          hourlyRate: (p as any).hourlyRate || 0,
          isAvailable: (p as any).isAvailable || false,
          experienceYears: (p as any).experienceYears || 0,
          bio: (p as any).bio || '',
          location: ((p as any).caregiverId as any)?.location || null,
        }))
      )
      .catch((err) => {
        console.error('Local search error:', err);
        return [];
      });

    const externalQueries: Promise<any[]>[] = [];
    if (searchTerm) {
      externalQueries.push(
        searchOpenStreetMap(`hospital ${searchTerm} India`, resultLimit),
        searchOpenStreetMap(`nursing home ${searchTerm} India`, resultLimit),
        searchOpenStreetMap(`clinic ${searchTerm} India`, resultLimit),
        searchOpenStreetMap(`home care ${searchTerm} India`, resultLimit),
        searchOpenStreetMap(`rehabilitation ${searchTerm} India`, resultLimit),
        searchWikidata(searchTerm, resultLimit)
      );
    } else {
      externalQueries.push(
        searchOpenStreetMap(`hospitals in India`, resultLimit),
        searchOpenStreetMap(`clinics in India`, resultLimit),
        searchOpenStreetMap(`nursing homes in India`, resultLimit),
        searchOpenStreetMap(`home health care in India`, resultLimit),
        searchOpenStreetMap(`rehabilitation centers in India`, resultLimit),
        searchWikidata('', resultLimit),
      );
    }

    const [localResults, ...externalResults] = await Promise.all([
      localPromise,
      ...externalQueries,
    ]);

    const webResults = externalResults.flat().filter(Boolean);

    res.json({
      local: localResults,
      web: webResults,
      total: localResults.length + webResults.length,
      sources: {
        local: localResults.length,
        openstreetmap: webResults.filter((r: any) => r._source === 'openstreetmap').length,
        wikidata: webResults.filter((r: any) => r._source === 'wikidata').length,
      },
    });
  } catch (error) {
    console.error('Realtime search error:', error);
    res.status(500).json({ message: 'Server error', local: [], web: [] });
  }
});

router.get('/realtime/facilities', async (req, res) => {
  try {
    const { q, city, type, limit = '15' } = req.query;
    const resultLimit = Math.min(30, Math.max(1, parseInt(limit as string) || 15));
    const searchTerm = (q as string || '').trim();

    const queries: Promise<any[]>[] = [];

    if (searchTerm) {
      const searchCity = (city as string || '').trim();
      queries.push(searchFacilitiesOSM(searchTerm, searchCity, resultLimit));
      queries.push(searchWikidata(searchTerm, resultLimit));
    } else if (city) {
      queries.push(searchFacilitiesOSM('healthcare', city as string, resultLimit));
      queries.push(searchOpenStreetMap(`schools in ${city}, India`, resultLimit));
      queries.push(searchOpenStreetMap(`hospitals in ${city}, India`, resultLimit));
      queries.push(searchWikidata(city as string || '', resultLimit));
    } else {
      queries.push(searchWikidata('', resultLimit));
      const cities = ['Delhi', 'Mumbai', 'Bangalore', 'Chennai', 'Hyderabad', 'Kolkata', 'Pune'];
      for (const c of cities.slice(0, 3)) {
        queries.push(searchOpenStreetMap(`hospitals in ${c}, India`, Math.ceil(resultLimit / 3)));
        queries.push(searchOpenStreetMap(`schools in ${c}, India`, Math.ceil(resultLimit / 3)));
      }
    }

    const results = await Promise.all(queries);
    const seen = new Set<string>();
    const merged = results.flat().filter((r: any) => {
      if (!r.name || seen.has(r.name.toLowerCase())) return false;
      seen.add(r.name.toLowerCase());
      return true;
    }).slice(0, resultLimit);

    res.json({ results: merged, total: merged.length });
  } catch (error) {
    console.error('Realtime facilities search error:', error);
    res.status(500).json({ message: 'Server error', results: [], total: 0 });
  }
});

export default router;
