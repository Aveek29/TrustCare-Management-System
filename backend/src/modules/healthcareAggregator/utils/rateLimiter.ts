const domainTimestamps: Map<string, number[]> = new Map();

export async function politeDelay(domain: string, minDelayMs: number = 2500): Promise<void> {
  const now = Date.now();
  const timestamps = domainTimestamps.get(domain) || [];
  const recent = timestamps.filter(t => now - t < 60000);
  const lastRequest = recent.length > 0 ? Math.max(...recent) : 0;
  const waitMs = Math.max(0, minDelayMs - (now - lastRequest));
  if (waitMs > 0) {
    await new Promise(resolve => setTimeout(resolve, waitMs));
  }
  recent.push(Date.now());
  domainTimestamps.set(domain, recent.slice(-20));
}
