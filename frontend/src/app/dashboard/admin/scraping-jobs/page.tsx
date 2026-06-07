'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store';
import { fetchAPI } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Play, Loader2, Activity, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

interface AggregatorStatus {
  metrics: {
    totalFacilities: number;
    totalProviders: number;
    totalSources: number;
    activeSources: number;
    totalJobsRun: number;
    totalRecordsFound: number;
    totalRecordsInserted: number;
    totalDuplicatesSkipped: number;
    totalErrors: number;
    lastJobRun: string;
  } | null;
  recentLogs: any[];
  sources: any[];
}

export default function ScrapingJobsPage() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();
  const [status, setStatus] = useState<AggregatorStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'ADMIN') { router.push('/login'); return; }
    fetchStatus();
  }, [isAuthenticated, user]);

  const fetchStatus = async () => {
    try {
      const data = await fetchAPI('/admin/aggregator/status');
      setStatus(data);
    } catch { setStatus(null); }
    finally { setLoading(false); }
  };

  const runJob = async (jobType: string) => {
    setRunning(jobType);
    try {
      await fetchAPI(`/admin/aggregator/run/${jobType}`, { method: 'POST' });
      toast.success(`${jobType} job queued`);
      setTimeout(fetchStatus, 2000);
    } catch { toast.error(`Failed to start ${jobType} job`); }
    finally { setRunning(null); }
  };

  if (!isAuthenticated || user?.role !== 'ADMIN') return null;

  const m = status?.metrics;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Scraping Jobs</h1>
          <p className="text-muted-foreground">Monitor and control data aggregation workers</p>
        </div>
        <Button variant="outline" onClick={fetchStatus} disabled={loading}>
          <RefreshCw className="h-4 w-4 mr-2" /> Refresh
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : (
        <>
          <div className="grid md:grid-cols-4 gap-4">
            <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold">{m?.totalFacilities || 0}</p><p className="text-xs text-muted-foreground">Facilities</p></CardContent></Card>
            <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold">{m?.totalProviders || 0}</p><p className="text-xs text-muted-foreground">Providers</p></CardContent></Card>
            <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold">{m?.totalJobsRun || 0}</p><p className="text-xs text-muted-foreground">Jobs Run</p></CardContent></Card>
            <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold">{m?.totalErrors || 0}</p><p className="text-xs text-muted-foreground">Errors</p></CardContent></Card>
          </div>

          <Card>
            <CardHeader><CardTitle>Manual Job Control</CardTitle></CardHeader>
            <CardContent className="flex gap-4">
              <Button onClick={() => runJob('discovery')} disabled={running === 'discovery'}>
                {running === 'discovery' ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Play className="h-4 w-4 mr-2" />}
                Run Discovery
              </Button>
              <Button onClick={() => runJob('update')} disabled={running === 'update'} variant="outline">
                {running === 'update' ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Play className="h-4 w-4 mr-2" />}
                Run Update
              </Button>
              <Button onClick={() => runJob('cleanup')} disabled={running === 'cleanup'} variant="outline">
                {running === 'cleanup' ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Play className="h-4 w-4 mr-2" />}
                Run Cleanup
              </Button>
            </CardContent>
          </Card>

          {status?.recentLogs && status.recentLogs.length > 0 && (
            <Card>
              <CardHeader><CardTitle>Recent Job Logs</CardTitle></CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b text-left text-sm text-muted-foreground">
                        <th className="p-3 font-medium">Job Type</th>
                        <th className="p-3 font-medium">Status</th>
                        <th className="p-3 font-medium">Found</th>
                        <th className="p-3 font-medium">Inserted</th>
                        <th className="p-3 font-medium">Errors</th>
                        <th className="p-3 font-medium">Duration</th>
                        <th className="p-3 font-medium">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {status.recentLogs.map((log: any) => (
                        <tr key={log._id} className="border-b last:border-0 hover:bg-muted/50">
                          <td className="p-3 text-sm">{log.jobType}</td>
                          <td className="p-3"><Badge className={log.status === 'COMPLETED' ? 'bg-green-100 text-green-700' : log.status === 'FAILED' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}>{log.status}</Badge></td>
                          <td className="p-3 text-sm">{log.recordsFound || 0}</td>
                          <td className="p-3 text-sm">{log.recordsInserted || 0}</td>
                          <td className="p-3 text-sm">{log.errors || 0}</td>
                          <td className="p-3 text-sm">{log.duration ? `${(log.duration / 1000).toFixed(1)}s` : '-'}</td>
                          <td className="p-3 text-sm text-muted-foreground">{new Date(log.createdAt).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
