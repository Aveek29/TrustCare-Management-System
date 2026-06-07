import { scrapeRealSources } from './httpScraper';
import { withRetry } from '../utils/retry';

export async function scrapeSampleDirectory(_sourceName: string): Promise<import('./httpScraper').ScrapedFacility[]> {
  return withRetry(() => scrapeRealSources(), 2, 3000);
}

export async function scrapePublicSource(sourceName: string): Promise<import('./httpScraper').ScrapedFacility[]> {
  return scrapeSampleDirectory(sourceName);
}
