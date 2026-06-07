import mongoose from 'mongoose';
import dotenv from 'dotenv';
import express from 'express';
import { HealthcareFacility } from './src/modules/healthcareAggregator/models/HealthcareFacility';
import { publicRouter } from './src/modules/healthcareAggregator/routes/publicRoutes';

dotenv.config();

let app: express.Express;
let server: any;

async function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(`FAIL: ${message}`);
  console.log(`  ✓ ${message}`);
}

async function testDatabase() {
  console.log('\n=== DATABASE TESTS ===');
  const total = await HealthcareFacility.countDocuments();
  await assert(total >= 100, `At least 100 facilities in DB (got ${total})`);

  const cities = await HealthcareFacility.distinct('address.city', { 'address.city': { $ne: '' } });
  await assert(cities.length >= 5, `At least 5 distinct cities (got ${cities.length})`);
  console.log(`    Cities: ${cities.sort().slice(0, 10).join(', ')}`);

  const states = await HealthcareFacility.distinct('address.state', { 'address.state': { $ne: '' } });
  await assert(states.length >= 3, `At least 3 distinct states (got ${states.length})`);
  console.log(`    States: ${states.join(', ')}`);

  const withCoords = await HealthcareFacility.countDocuments({ 'coordinates.lat': { $ne: 0 } });
  await assert(withCoords === total, `All facilities have coordinates (${withCoords}/${total})`);

  const cleanCity = await HealthcareFacility.countDocuments({ 'address.city': { $nin: ['', null] } });
  await assert(cleanCity > 0, `Facilities have non-empty city names (${cleanCity}/${total})`);

  const cleanState = await HealthcareFacility.countDocuments({ 'address.state': { $nin: ['', null] } });
  await assert(cleanState > 0, `Facilities have non-empty state names (${cleanState}/${total})`);

  const facilityTypes = await HealthcareFacility.distinct('facilityType');
  await assert(facilityTypes.length >= 1, `At least 1 facility type (got ${facilityTypes.join(', ')})`);
}

async function testAPI() {
  console.log('\n=== API TESTS ===');
  const port = 6789;

  app = express();
  app.use(express.json());
  app.use('/api/aggregator', publicRouter);

  await new Promise<void>((resolve) => {
    server = app.listen(port, () => {
      console.log(`  Test server on port ${port}`);
      resolve();
    });
  });

  const base = `http://localhost:${port}/api/aggregator`;

  // Test 1: List all facilities
  let res = await fetch(`${base}/facilities?limit=5`);
  let data = await res.json();
  await assert(res.status === 200, 'GET /facilities returns 200');
  await assert(data.facilities.length === 5, `Returns 5 facilities (got ${data.facilities.length})`);
  await assert(data.pagination.total >= 100, `Pagination total >= 100 (got ${data.pagination.total})`);
  console.log(`    Sample: ${data.facilities.slice(0, 3).map((f: any) => f.name).join(', ')}`);

  // Test 2: Search by city
  res = await fetch(`${base}/facilities?city=New+Delhi`);
  data = await res.json();
  await assert(res.status === 200, 'GET /facilities?city=New+Delhi returns 200');
  await assert(data.facilities.length > 0, `Returns Delhi facilities (got ${data.facilities.length})`);
  data.facilities.forEach((f: any) => {
    if (f.address.city) assert(f.address.city.toLowerCase().includes('delhi'), `All results in Delhi (got ${f.address.city})`);
  });

  // Test 3: Search by state
  res = await fetch(`${base}/facilities?state=Karnataka`);
  data = await res.json();
  await assert(data.facilities.length > 0, `Returns Karnataka facilities (${data.facilities.length})`);

  // Test 4: Free-text search
  res = await fetch(`${base}/facilities?search=heart`);
  data = await res.json();
  console.log(`    Text search 'heart': ${data.facilities.length} results`);

  // Test 5: Search by facility type
  res = await fetch(`${base}/facilities?type=hospital`);
  data = await res.json();
  await assert(data.pagination.total > 0, `Hospital type search returns results (${data.pagination.total})`);

  // Test 6: Geo nearby search
  res = await fetch(`${base}/facilities/geo/nearby?lat=28.61&lng=77.23&radius=20`);
  data = await res.json();
  await assert(data.facilities.length > 0, `Geo search around Delhi returns results (${data.facilities.length})`);
  console.log(`    Nearby Delhi: ${data.facilities.map((f: any) => f.name).join(', ')}`);

  // Test 7: Get single facility
  const listRes = await fetch(`${base}/facilities?limit=1`);
  const listData = await listRes.json();
  if (listData.facilities.length > 0) {
    const id = listData.facilities[0]._id;
    res = await fetch(`${base}/facilities/${id}`);
    data = await res.json();
    await assert(res.status === 200, `GET /facilities/:id returns 200`);
    await assert(data.facility._id === id, `Returns correct facility by ID`);
    await assert(data.facility.coordinates.lat !== 0, `Facility has coordinates`);
    console.log(`    Detail: ${data.facility.name} (${data.facility.address.city}, ${data.facility.address.state})`);
  }

  // Test 8: Combined search
  res = await fetch(`${base}/facilities?city=Bengaluru&type=hospital&sortBy=name&order=asc`);
  data = await res.json();
  await assert(res.status === 200, 'Combined search (city+type+sort) returns 200');
  console.log(`    Combined search: ${data.facilities.length} facilities in Bengaluru`);

  // Test 9: Pagination
  res = await fetch(`${base}/facilities?page=1&limit=10`);
  data = await res.json();
  await assert(data.pagination.page === 1, 'Page 1 returned');
  await assert(data.facilities.length <= 10, `Page 1 has ≤10 items (got ${data.facilities.length})`);

  res = await fetch(`${base}/facilities?page=2&limit=10`);
  const data2 = await res.json();
  await assert(data2.pagination.page === 2, 'Page 2 returned');

  // Test 10: 404 handling
  res = await fetch(`${base}/facilities/000000000000000000000000`);
  await assert(res.status === 404, 'GET /facilities/bad-id returns 404');

  server.close();
  console.log('  Test server stopped');
}

async function testScraperFreshness() {
  console.log('\n=== DYNAMIC DATA TEST (re-run scraper) ===');
  const { scrapeRealSources } = require('./src/modules/healthcareAggregator/services/httpScraper');
  const freshData = await scrapeRealSources();
  await assert(freshData.length >= 50, `Scraper returns fresh data (${freshData.length} facilities)`);
  console.log(`    Fresh scrape returned ${freshData.length} real facilities`);
  console.log(`    Sample: ${freshData.slice(0, 3).map((f: any) => f.name).join(', ')}`);

  // Verify the API can serve this data through the full pipeline
  const { upsertFacilities } = require('./src/modules/healthcareAggregator/services/bulkWriteService');
  const result = await upsertFacilities(freshData, 'openstreetmap-hospitals');
  await assert(result.recordsFound === freshData.length, `All records processed by bulkWrite (${result.recordsFound})`);
  console.log(`    Bulk write: ${result.recordsInserted} new, ${result.duplicatesSkipped} dupes`);
}

async function main() {
  console.log('=== COMPREHENSIVE END-TO-END TEST ===');
  console.log(`Started: ${new Date().toISOString()}`);

  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/trustcare');
  console.log('Connected to MongoDB');

  try {
    await testDatabase();
    await testAPI();
    await testScraperFreshness();
    console.log('\n=== ALL TESTS PASSED ===');
  } catch (e: any) {
    console.error(`\n❌ ${e.message}`);
    if (server) server.close();
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

main();
