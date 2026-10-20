import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { HealthcareFacility } from './src/modules/healthcareAggregator/models/HealthcareFacility';

dotenv.config();

const UA = 'TrustCareBot/1.0 (contact enrichment; contact@trustcare.com)';

async function searchNominatim(name: string, city: string) {
  const q = encodeURIComponent([name, city].filter(Boolean).join(', '));
  const url = `https://nominatim.openstreetmap.org/search?q=${q}&format=jsonv2&addressdetails=1&extratags=1&limit=5`;
  const res = await fetch(url, { headers: { 'User-Agent': UA, 'Accept-Language': 'en' } });
  if (!res.ok) throw new Error(`nominatim ${res.status}`);
  return res.json();
}

async function main() {
  const uri = process.env.MONGODB_URI as string;
  await mongoose.connect(uri);
  console.log('connected');

  const facilities = await HealthcareFacility.find({ $or: [{ phone: '' }, { phone: { $exists: false } }, { email: '' }, { email: { $exists: false } }] });
  console.log('to enrich:', facilities.length);

  for (const f of facilities) {
    try {
      const results: any = await searchNominatim(f.name, f.address?.city || '');
      for (const r of results) {
        const extratags = r.extratags || {};
        const phone = r.phone || extratags.phone || extratags['contact:phone'] || extratags.telephone || '';
        const email = extratags.email || extratags['contact:email'] || '';
        const website = r.website || extratags.website || extratags['contact:website'] || '';
        if (phone || email || website) {
          f.phone = phone || f.phone || '';
          f.email = email || f.email || '';
          if (website) f.website = website;
          if (r.osm_type && r.osm_id) {
            f.sourceUrl = `https://www.openstreetmap.org/${r.osm_type}/${r.osm_id}`;
            f.sourceName = f.sourceName || 'openstreetmap';
          }
          await f.save();
          console.log('updated', f.name, phone || email || website);
          break;
        }
      }
      await new Promise(r => setTimeout(r, 1200));
    } catch (e: any) {
      console.log('err', f.name, e.message);
      await new Promise(r => setTimeout(r, 2000));
    }
  }

  console.log('done');
  await mongoose.disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
