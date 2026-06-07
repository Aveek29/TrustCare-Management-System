import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { HealthcareFacility } from './src/modules/healthcareAggregator/models/HealthcareFacility';

dotenv.config();

async function test() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/trustcare');

  const count = await HealthcareFacility.countDocuments();
  console.log(`Total facilities: ${count}`);

  const cities = await HealthcareFacility.distinct('address.city', { 'address.city': { $ne: '' } });
  console.log(`Cities (${cities.length}): ${cities.slice(0, 10).join(', ')}`);

  const delhiCount = await HealthcareFacility.countDocuments({ 'address.city': /Delhi/i });
  console.log(`Delhi facilities: ${delhiCount}`);

  const types = await HealthcareFacility.distinct('facilityType');
  console.log(`Facility types: ${types.join(', ')}`);

  const cardio = await HealthcareFacility.find({ specialities: /cardiology/i }).limit(3).lean();
  if (cardio.length) console.log(`Cardiology results: ${cardio.map(f => f.name).join(', ')}`);

  const geo = await HealthcareFacility.find({
    'coordinates.lat': { $gte: 28.4, $lte: 28.8, $ne: 0 },
    'coordinates.lng': { $gte: 77.0, $lte: 77.5, $ne: 0 },
  }).limit(5).lean();
  if (geo.length) console.log(`Geo query (Delhi area): ${geo.length} results`);

  await mongoose.disconnect();
  console.log('\nPASS');
}

test().catch(e => { console.error('FAIL:', e.message); process.exit(1); });
