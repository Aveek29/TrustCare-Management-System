import crypto from 'crypto';

export function generateExternalId(name: string, address: string, source: string): string {
  const raw = `${name.toLowerCase().trim()}|${address.toLowerCase().trim()}|${source.toLowerCase().trim()}`;
  return crypto.createHash('sha256').update(raw).digest('hex');
}
