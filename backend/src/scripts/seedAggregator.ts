import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { scrapeRealSources } from '../modules/healthcareAggregator/services/httpScraper';
import { upsertFacilities, logScrapingRun, updateAggregationMetrics } from '../modules/healthcareAggregator/services/bulkWriteService';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/trustcare';

async function seedAggregator() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB');

  console.log('Clearing existing facility data...');
  await mongoose.connection.db!.collection('healthcarefacilities').drop().catch(() => {});

  console.log('Starting real web scraping from OpenStreetMap & Wikidata...');
  const startedAt = Date.now();

  try {
    const facilities = await scrapeRealSources();
    console.log(`Scraped ${facilities.length} real facilities`);

    const result = await upsertFacilities(facilities, 'openstreetmap-hospitals');
    const duration = Date.now() - startedAt;

    console.log(`\n=== SEED RESULT ===`);
    console.log(`Records found:   ${result.recordsFound}`);
    console.log(`Records inserted: ${result.recordsInserted}`);
    console.log(`Duplicates skipped: ${result.duplicatesSkipped}`);
    console.log(`Errors:          ${result.errors}`);
    if (result.errorMessages.length > 0) {
      console.log(`Error messages:  ${result.errorMessages.slice(0, 3).join(', ')}`);
    }
    console.log(`Duration:        ${duration}ms`);

    await updateAggregationMetrics(result, 'seed');

    const totalInDb = await mongoose.model('HealthcareFacility').countDocuments();
    console.log(`\nTotal facilities in database: ${totalInDb}`);

    if (totalInDb > 0) {
      const sample = await mongoose.model('HealthcareFacility').find().limit(5).lean();
      console.log('\nSample facilities in DB:');
      sample.forEach((f: any, i: number) => {
        console.log(`  ${i + 1}. ${f.name} — ${f.address?.city || ''}, ${f.address?.state || ''}`);
      });
    }
  } catch (error: any) {
    console.error('Seed failed:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\nDone.');
  }
}

seedAggregator();
