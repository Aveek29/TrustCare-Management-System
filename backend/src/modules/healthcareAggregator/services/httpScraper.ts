import { politeDelay } from '../utils/rateLimiter';
import { withRetry } from '../utils/retry';

export interface ScrapedFacility {
  name: string;
  address: { street: string; city: string; state: string; zip: string; full: string };
  coordinates?: { lat: number; lng: number };
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
  sourceUrl: string;
  sourceName: string;
}

interface ScraperSourceConfig {
  name: string;
  domain: string;
  type: string;
}

const CITIES = [
  'New Delhi', 'Mumbai', 'Bangalore', 'Chennai', 'Hyderabad',
  'Kolkata', 'Pune', 'Ahmedabad', 'Jaipur', 'Lucknow',
];

const FACILITY_TYPES = [
  'hospital', 'clinic', 'nursing-home', 'diagnostic-center',
  'school', 'college', 'university', 'educational-institute',
  'maid-service', 'housekeeping', 'cleaning-service',
  'pharmacy', 'rehabilitation-center', 'daycare',
  'gym', 'fitness-center', 'yoga-studio',
  'laboratory', 'blood-bank', 'ambulance-service',
];

const SERVICE_KEYWORDS = [
  'Emergency', 'OPD', 'IPD', 'Pharmacy', 'Laboratory', 'X-Ray', 'MRI', 'CT Scan',
  'Blood Test', 'Vaccination', 'Health Checkup', 'Ambulance', 'Telemedicine',
  'Physiotherapy', 'Counseling', 'Nutrition', 'Dental', 'Eye Care',
  'House Cleaning', 'Deep Cleaning', 'Cooking', 'Baby Sitting', 'Elder Care',
  'Tutoring', 'Computer Lab', 'Library', 'Sports', 'Transportation',
  'Hostel', 'Cafeteria', 'Air Conditioning', 'Wifi', 'Parking',
];

const SPECIALITY_KEYWORDS = [
  'Cardiology', 'Neurology', 'Orthopedics', 'Pediatrics', 'Oncology',
  'Gastroenterology', 'Dermatology', 'Gynecology', 'ENT', 'Ophthalmology',
  'Psychiatry', 'Urology', 'Nephrology', 'Pulmonology', 'Endocrinology',
  'Rheumatology', 'Geriatrics', 'General Medicine', 'Anesthesiology',
  'Science', 'Commerce', 'Arts', 'Engineering', 'Medical',
  'Home Cleaning', 'Office Cleaning', 'Cooking Service', 'Baby Care',
];

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org';
const WIKIDATA_URL = 'https://query.wikidata.org/sparql';
const OSM_ATTRIBUTION = 'Data © OpenStreetMap contributors, ODbL 1.0.';

const DEFAULT_SOURCES: ScraperSourceConfig[] = [
  { name: 'openstreetmap-hospitals', domain: 'nominatim.openstreetmap.org', type: 'hospital' },
  { name: 'openstreetmap-clinics', domain: 'nominatim.openstreetmap.org', type: 'clinic' },
  { name: 'wikidata-hospitals', domain: 'query.wikidata.org', type: 'hospital' },
];

function extractServices(text: string): string[] {
  const found: string[] = [];
  const lower = text.toLowerCase();
  for (const svc of SERVICE_KEYWORDS) {
    if (lower.includes(svc.toLowerCase())) found.push(svc);
  }
  return found;
}

function extractSpecialities(text: string): string[] {
  const found: string[] = [];
  const lower = text.toLowerCase();
  for (const spec of SPECIALITY_KEYWORDS) {
    if (lower.includes(spec.toLowerCase())) found.push(spec);
  }
  return found;
}

function parseOsmAddress(
  displayName: string,
  addressObj?: { road?: string; suburb?: string; city?: string; state?: string; postcode?: string; country_code?: string; [key: string]: any }
): { street: string; city: string; state: string; zip: string; full: string } {

  if (addressObj) {
    const road = [addressObj.road, addressObj.suburb, addressObj.neighbourhood].filter(Boolean).join(', ');
    const city = addressObj.city || addressObj.town || addressObj.village || addressObj.county || '';
    const state = addressObj.state || '';
    const zip = addressObj.postcode || '';

    let stateCode = addressObj['ISO3166-2-lvl4'] || '';
    if (stateCode) stateCode = stateCode.replace('IN-', '');

    const stateMap: Record<string, string> = {
      'DL': 'Delhi', 'UP': 'Uttar Pradesh', 'UK': 'Uttarakhand', 'MP': 'Madhya Pradesh',
      'MH': 'Maharashtra', 'KA': 'Karnataka', 'TN': 'Tamil Nadu', 'AP': 'Andhra Pradesh',
      'TS': 'Telangana', 'KL': 'Kerala', 'GJ': 'Gujarat', 'RJ': 'Rajasthan', 'WB': 'West Bengal',
      'HR': 'Haryana', 'PB': 'Punjab', 'BR': 'Bihar', 'OR': 'Odisha', 'CG': 'Chhattisgarh',
      'JH': 'Jharkhand', 'AS': 'Assam', 'GA': 'Goa', 'HP': 'Himachal Pradesh', 'JK': 'Jammu and Kashmir',
    };

    const resolvedState = state || stateMap[stateCode] || '';
    const resolvedCity = city.endsWith(' District') ? city.replace(' District', '') : city;
    const cleanedCity = resolvedCity.endsWith(' Tehsil') ? resolvedCity.replace(' Tehsil', '') : resolvedCity;
    const full = [road, cleanedCity, resolvedState, zip].filter(Boolean).join(', ');

    return { street: road, city: cleanedCity, state: resolvedState, zip, full };
  }

  const parts = displayName.split(',').map(p => p.trim());
  let street = parts[0] || '';
  let city = '';
  let state = '';
  let zip = '';
  const knownStates = ['Delhi', 'Uttar Pradesh', 'Uttarakhand', 'Madhya Pradesh', 'Maharashtra', 'Karnataka',
    'Tamil Nadu', 'Andhra Pradesh', 'Telangana', 'Kerala', 'Gujarat', 'Rajasthan', 'West Bengal',
    'Haryana', 'Punjab', 'Bihar', 'Odisha', 'Chhattisgarh', 'Jharkhand', 'Assam', 'Goa'];

  for (let i = parts.length - 1; i >= 0; i--) {
    const p = parts[i];
    if (/^\d{5,6}$/.test(p)) { zip = p; continue; }
    if (knownStates.includes(p)) { state = p; if (i > 0) city = parts[i - 1]?.trim() || ''; break; }
    if (/^(NCT of )?Delhi$/i.test(p)) { state = 'Delhi'; if (i > 0) city = parts[i - 1]?.trim() || ''; break; }
  }

  if (city && city.endsWith(' District')) city = city.replace(' District', '');
  if (city && city.endsWith(' Tehsil')) city = city.replace(' Tehsil', '');
  const full = [street, city, state, zip].filter(Boolean).join(', ');

  return { street, city, state, zip, full };
}

async function fetchNominatim(query: string, limit: number = 30): Promise<any[]> {
  await politeDelay('nominatim.openstreetmap.org', 1100);
  const url = `${NOMINATIM_BASE}/search?q=${encodeURIComponent(query)}&format=json&limit=${limit}&addressdetails=1`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'TrustCareBot/1.0 (healthcare-aggregator; contact@trustcare.com)' },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`Nominatim HTTP ${response.status}`);
    return response.json() as Promise<any[]>;
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchWikidataHospitals(limit: number = 50): Promise<any[]> {
  const query = `
    SELECT ?item ?itemLabel ?location ?coord ?website ?phone ?countryLabel ?stateLabel ?cityLabel WHERE {
      ?item wdt:P31 wd:Q16917.
      ?item wdt:P17 wd:Q668.
      OPTIONAL { ?item wdt:P625 ?coord. }
      OPTIONAL { ?item wdt:P856 ?website. }
      OPTIONAL { ?item wdt:P1329 ?phone. }
      OPTIONAL { ?item wdt:P17 ?country. }
      OPTIONAL { ?item wdt:P131 ?state. }
      OPTIONAL { ?item wdt:P131 ?city. }
      SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
    }
    LIMIT ${limit}
  `;
  await politeDelay('query.wikidata.org', 1100);
  const url = `${WIKIDATA_URL}?format=json&query=${encodeURIComponent(query)}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'TrustCareBot/1.0 (healthcare-aggregator; contact@trustcare.com)',
        'Accept': 'application/sparql-results+json',
      },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`Wikidata HTTP ${response.status}`);
    const data = await response.json() as { results?: { bindings?: any[] } };
    return data.results?.bindings || [];
  } finally {
    clearTimeout(timeout);
  }
}

function generateDescription(name: string, facilityType: string, city: string, services: string[], specialities: string[]): string {
  const typeLabels: Record<string, string> = {
    hospital: 'A registered healthcare facility providing comprehensive medical care, emergency services, and inpatient/outpatient treatments.',
    clinic: 'A medical clinic offering diagnostic consultations, routine check-ups, and specialized treatments in various disciplines.',
    'nursing-home': 'A dedicated nursing home providing round-the-clock skilled nursing care, rehabilitation, and assisted living support.',
    'diagnostic-center': 'An advanced diagnostic center equipped with modern imaging and laboratory technology for accurate medical testing.',
    school: 'An educational institution committed to academic excellence, holistic child development, and co-curricular enrichment.',
    college: 'A higher education college offering undergraduate and postgraduate programs across science, commerce, and arts disciplines.',
    university: 'A premier university providing diverse academic programs, research opportunities, and state-of-the-art learning infrastructure.',
    'educational-institute': 'An educational institute fostering knowledge, skills, and personal growth through quality academic programs.',
    'maid-service': 'A professional maid service offering reliable home cleaning, kitchen maintenance, and household management solutions.',
    housekeeping: 'A trusted housekeeping service providing thorough cleaning, organization, and maintenance for homes and offices.',
    pharmacy: 'A licensed pharmacy offering prescription medications, over-the-counter drugs, health products, and expert pharmaceutical advice.',
    'rehabilitation-center': 'A rehabilitation center providing specialized therapy programs for physical recovery, addiction treatment, and mental wellness.',
    'fitness-center': 'A modern fitness center with gym equipment, group classes, personal training, and wellness programs for all ages.',
    daycare: 'A safe and nurturing daycare center offering early childhood education, supervised play, and developmental activities.',
    'blood-bank': 'A licensed blood bank ensuring safe blood collection, screening, storage, and distribution for medical emergencies.',
    'ambulance-service': 'An emergency ambulance service providing rapid medical transport, first response care, and hospital coordination.',
  };
  const base = typeLabels[facilityType] || `A recognized ${facilityType.replace('-', ' ')} serving the local community with quality care and professional service.`;
  const loc = city ? ` Conveniently located in ${city}.` : '';
  const svc = services.length > 0 ? ` Services include: ${services.slice(0, 4).join(', ')}.` : '';
  const spec = specialities.length > 0 ? ` Specializing in: ${specialities.slice(0, 3).join(', ')}.` : '';
  return (base + loc + svc + spec).substring(0, 300);
}

function osmToFacility(item: any, sourceType: string, sourceName: string): ScrapedFacility | null {
  if (item.address?.country_code && item.address.country_code !== 'in') return null;
  const name = item.name || '';
  if (!name || name.length < 3) return null;

  const addr = parseOsmAddress(item.display_name || '', item.address);
  const lat = parseFloat(item.lat);
  const lng = parseFloat(item.lon);
  const categoryTag = item.type || '';
  const fullText = `${name} ${item.display_name || ''} ${item.category || ''} ${categoryTag}`;

  let facilityType = sourceType;
  if (categoryTag.includes('clinic') || categoryTag.includes('surgery')) facilityType = 'clinic';
  else if (categoryTag.includes('nursing') || categoryTag.includes('care')) facilityType = 'nursing-home';
  else if (categoryTag.includes('diagnostic') || categoryTag.includes('laboratory')) facilityType = 'diagnostic-center';
  else if (categoryTag.includes('school') || categoryTag.includes('college') || categoryTag.includes('university') || categoryTag.includes('educational')) facilityType = 'educational-institute';
  else if (categoryTag.includes('maid') || categoryTag.includes('housekeeping') || categoryTag.includes('cleaning')) facilityType = 'maid-service';
  else if (categoryTag.includes('pharmacy') || categoryTag.includes('chemist') || categoryTag.includes('drugstore')) facilityType = 'pharmacy';
  else if (categoryTag.includes('rehabilitation') || categoryTag.includes('rehab')) facilityType = 'rehabilitation-center';
  else if (categoryTag.includes('gym') || categoryTag.includes('fitness') || categoryTag.includes('yoga')) facilityType = 'fitness-center';
  else if (categoryTag.includes('daycare') || categoryTag.includes('creche') || categoryTag.includes('nursery')) facilityType = 'daycare';
  else if (categoryTag.includes('ambulance')) facilityType = 'ambulance-service';
  else if (categoryTag.includes('blood')) facilityType = 'blood-bank';

  const services = extractServices(fullText);
  const specialities = extractSpecialities(fullText);
  const city = addr.city;

  return {
    name,
    address: addr,
    coordinates: { lat: isNaN(lat) ? 0 : lat, lng: isNaN(lng) ? 0 : lng },
    phone: '',
    email: '',
    website: '',
    facilityType,
    description: generateDescription(name, facilityType, city, services, specialities),
    services,
    specialities,
    rating: 0,
    reviewCount: 0,
    operationalHours: '',
    emergencyServices: fullText.toLowerCase().includes('24') || fullText.toLowerCase().includes('emergency'),
    sourceUrl: `https://www.openstreetmap.org/search?query=${encodeURIComponent(name)}`,
    sourceName,
  };
}

function wikidataToFacility(item: any, sourceName: string): ScrapedFacility | null {
  const name = item.itemLabel?.value || '';
  if (!name || name.length < 3) return null;

  let coordStr = item.coord?.value || '';
  let lat = 0, lng = 0;
  const coordMatch = coordStr.match(/Point\(([-\d.]+)\s+([-\d.]+)\)/);
  if (coordMatch) { lng = parseFloat(coordMatch[1]); lat = parseFloat(coordMatch[2]); }

  const website = item.website?.value || '';
  const phone = item.phone?.value || '';
  const city = item.cityLabel?.value || '';
  const state = item.stateLabel?.value || '';

  return {
    name,
    address: { street: '', city, state, zip: '', full: [name, city, state].filter(Boolean).join(', ') },
    coordinates: { lat, lng },
    phone,
    email: '',
    website,
    facilityType: 'hospital',
    description: generateDescription(name, 'hospital', city, [], []),
    services: [],
    specialities: [],
    rating: 0,
    reviewCount: 0,
    operationalHours: '',
    emergencyServices: false,
    sourceUrl: `https://www.wikidata.org/wiki/${item.item?.value?.split('/').pop() || ''}`,
    sourceName,
  };
}

function generateFallbackFacilities(): ScrapedFacility[] {
  const results: ScrapedFacility[] = [];
  const fallbackData = [
    ...([
      { name: 'Apollo Hospitals', city: 'Chennai', state: 'Tamil Nadu', type: 'hospital' },
      { name: 'All India Institute of Medical Sciences', city: 'New Delhi', state: 'Delhi', type: 'hospital' },
      { name: 'Fortis Healthcare', city: 'Gurugram', state: 'Haryana', type: 'hospital' },
      { name: 'Medanta - The Medicity', city: 'Gurugram', state: 'Haryana', type: 'hospital' },
      { name: 'Manipal Hospital', city: 'Bangalore', state: 'Karnataka', type: 'hospital' },
      { name: 'Tata Memorial Hospital', city: 'Mumbai', state: 'Maharashtra', type: 'hospital' },
      { name: 'Christian Medical College', city: 'Vellore', state: 'Tamil Nadu', type: 'educational-institute' },
      { name: 'Narayana Health', city: 'Bangalore', state: 'Karnataka', type: 'hospital' },
      { name: 'Max Super Speciality Hospital', city: 'New Delhi', state: 'Delhi', type: 'hospital' },
      { name: 'Kokilaben Dhirubhai Ambani Hospital', city: 'Mumbai', state: 'Maharashtra', type: 'hospital' },
    ] as { name: string; city: string; state: string; type: string }[]),
    { name: 'Delhi Public School', city: 'New Delhi', state: 'Delhi', type: 'school' },
    { name: 'St. Xavier\'s College', city: 'Mumbai', state: 'Maharashtra', type: 'college' },
    { name: 'Indian Institute of Technology', city: 'Chennai', state: 'Tamil Nadu', type: 'university' },
    { name: 'National Institute of Technology', city: 'Warangal', state: 'Telangana', type: 'university' },
    { name: 'Lady Shri Ram College', city: 'New Delhi', state: 'Delhi', type: 'college' },
    { name: 'Bishop Cotton School', city: 'Shimla', state: 'Himachal Pradesh', type: 'school' },
    { name: 'Maid in India Services', city: 'Bangalore', state: 'Karnataka', type: 'maid-service' },
    { name: 'Urban Company', city: 'Gurugram', state: 'Haryana', type: 'maid-service' },
    { name: 'Housejoy Cleaning Services', city: 'Bangalore', state: 'Karnataka', type: 'housekeeping' },
    { name: 'Sulekha Housekeeping', city: 'Chennai', state: 'Tamil Nadu', type: 'housekeeping' },
    { name: 'Apollo Pharmacy', city: 'Hyderabad', state: 'Telangana', type: 'pharmacy' },
    { name: 'MedPlus Pharmacy', city: 'Hyderabad', state: 'Telangana', type: 'pharmacy' },
    { name: 'KIMS Rehabilitation Center', city: 'Hyderabad', state: 'Telangana', type: 'rehabilitation-center' },
    { name: 'Cult.Fit Fitness Center', city: 'Bangalore', state: 'Karnataka', type: 'fitness-center' },
    { name: 'Dr. Lal PathLabs', city: 'New Delhi', state: 'Delhi', type: 'diagnostic-center' },
    { name: 'Red Cross Blood Bank', city: 'Mumbai', state: 'Maharashtra', type: 'blood-bank' },
    { name: 'KidsCare Daycare Center', city: 'Pune', state: 'Maharashtra', type: 'daycare' },
  ];

  for (const f of fallbackData) {
    const typeServices: Record<string, string[]> = {
      hospital: ['Emergency Care', 'OPD', 'IPD', 'Pharmacy', 'Laboratory'],
      school: ['Teaching', 'Library', 'Sports', 'Computer Lab', 'Transportation'],
      college: ['Degree Programs', 'Library', 'Research Labs', 'Hostel', 'Cafeteria'],
      university: ['Under Graduate', 'Post Graduate', 'Research', 'Hostel', 'Sports Complex'],
      'maid-service': ['Home Cleaning', 'Kitchen Cleaning', 'Bathroom Cleaning', 'Cooking'],
      housekeeping: ['Deep Cleaning', 'Office Cleaning', 'Sofa Cleaning', 'Floor Mopping'],
      pharmacy: ['Medicine Delivery', 'Health Consultation', 'Lab Tests'],
      'rehabilitation-center': ['Physical Therapy', 'Occupational Therapy', 'Counseling'],
      'fitness-center': ['Gym', 'Yoga', 'Zumba', 'Personal Training'],
      'diagnostic-center': ['Blood Test', 'X-Ray', 'MRI', 'CT Scan', 'ECG'],
      'blood-bank': ['Blood Donation', 'Blood Storage', 'Blood Transfusion'],
      daycare: ['Child Care', 'Early Learning', 'Play Area', 'Meals'],
    };
    const services = typeServices[f.type] || ['General Services'];
    results.push({
      name: f.name,
      address: { street: '', city: f.city, state: f.state, zip: '', full: `${f.name}, ${f.city}, ${f.state}` },
      phone: '',
      email: '',
      website: '',
      facilityType: f.type,
      description: generateDescription(f.name, f.type, f.city, services, []),
      services,
      specialities: [],
      rating: 0,
      reviewCount: 0,
      operationalHours: '',
      emergencyServices: f.type === 'hospital',
      sourceUrl: '',
      sourceName: 'fallback-directory',
    });
  }
  return results;
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function shuffleArray<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export async function scrapeRealSources(): Promise<ScrapedFacility[]> {
  const all: ScrapedFacility[] = [];
  const seen = new Set<string>();

  const cityPool = shuffleArray(CITIES);
  const searchTypes = ['hospitals', 'schools', 'colleges', 'clinics', 'healthcare',
    'pharmacies', 'rehabilitation centers', 'fitness centers', 'day care centers',
    'blood banks', 'ambulance services', 'maid services', 'housekeeping services'];

  for (const queryType of searchTypes) {
    for (let i = 0; i < Math.min(3, cityPool.length); i++) {
      const city = cityPool[i];
      const limit = 6 + Math.floor(Math.random() * 6);

      try {
        const q = queryType.includes(' ') ? `${queryType} in ${city}, India` : `${queryType} in ${city}, India`;
        const results = await withRetry(
          () => fetchNominatim(q, limit),
          1, 5000
        );
        let defaultType = queryType === 'schools' || queryType === 'colleges' ? 'educational-institute' : 'hospital';
        if (queryType === 'pharmacies') defaultType = 'pharmacy';
        else if (queryType === 'rehabilitation centers') defaultType = 'rehabilitation-center';
        else if (queryType === 'fitness centers') defaultType = 'fitness-center';
        else if (queryType === 'day care centers') defaultType = 'daycare';
        else if (queryType === 'blood banks') defaultType = 'blood-bank';
        else if (queryType === 'ambulance services') defaultType = 'ambulance-service';
        else if (queryType === 'maid services' || queryType === 'housekeeping services') defaultType = 'maid-service';

        for (const item of results) {
          const facility = osmToFacility(item, defaultType, `openstreetmap-${queryType.replace(/\s+/g, '-')}`);
          if (facility && !seen.has(facility.name.toLowerCase())) {
            seen.add(facility.name.toLowerCase());
            all.push(facility);
          }
        }
      } catch { /* next city */ }
    }
  }

  try {
    const wdResults = await withRetry(() => fetchWikidataHospitals(30), 2, 5000);
    for (const item of wdResults) {
      const facility = wikidataToFacility(item, 'wikidata-hospitals');
      if (facility && !seen.has(facility.name.toLowerCase())) {
        seen.add(facility.name.toLowerCase());
        all.push(facility);
      }
    }
  } catch { /* fallback */ }

  const fallback = generateFallbackFacilities();
  for (const f of fallback) {
    if (!seen.has(f.name.toLowerCase())) {
      seen.add(f.name.toLowerCase());
      all.push(f);
    }
  }

  return all;
}

export async function scrapeSource(sourceName: string): Promise<ScrapedFacility[]> {
  return scrapeRealSources();
}

export async function scrapeAllSources(): Promise<ScrapedFacility[]> {
  return scrapeRealSources();
}
