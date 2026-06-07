'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store';
import { fetchAPI } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, ScrollText, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ScrapingLog {
  _id: string;
  jobId: string;
  jobType: string;
  sourceName: string;
  status: string;
  recordsFound: number;
  recordsInserted: number;
  duplicatesSkipped: number;
  errors: number;
  errorMessages: string[];
  duration: number;
  createdAt: string;
}

export default function AggregatorLogsPage() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();
  const [logs, setLogs] = useState<ScrapingLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'ADMIN') { router.push('/login'); return; }
    fetchLogs();
  }, [isAuthenticated, user, page]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const data = await fetchAPI(`/admin/aggregator/logs?page=${page}&limit=50`);
      setLogs(data.logs || []);
      setTotalPages(data.pagination?.pages || 1);
    } catch { setLogs([]); }
    finally { setLoading(false); }
  };

  if (!isAuthenticated || user?.role !== 'ADMIN') return null;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Aggregator Logs</h1>
          <p className="text-muted-foreground">Detailed scraping job history</p>
        </div>
        <Button variant="outline" onClick={fetchLogs} disabled={loading}>
          <RefreshCw className="h-4 w-4 mr-2" /> Refresh
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : (
        <>
          {logs.length === 0 && (
            <Card><CardContent className="p-8 text-center text-muted-foreground">No scraping logs yet.</CardContent></Card>
          )}
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b text-left text-sm text-muted-foreground">
                      <th className="p-3 font-medium">Job Type</th>
                      <th className="p-3 font-medium">Source</th>
                      <th className="p-3 font-medium">Status</th>
                      <th className="p-3 font-medium">Found</th>
                      <th className="p-3 font-medium">Inserted</th>
                      <th className="p-3 font-medium">Skipped</th>
                      <th className="p-3 font-medium">Errors</th>
                      <th className="p-3 font-medium">Duration</th>
                      <th className="p-3 font-medium">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log) => (
                      <tr key={log._id} className="border-b last:border-0 hover:bg-muted/50">
                        <td className="p-3 text-sm font-medium">{log.jobType}</td>
                        <td className="p-3 text-sm">{log.sourceName}</td>
                        <td className="p-3">
                          <Badge className={
                            log.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                            log.status === 'FAILED' ? 'bg-red-100 text-red-700' :
                            'bg-yellow-100 text-yellow-700'
                          }>{log.status}</Badge>
                        </td>
                        <td className="p-3 text-sm">{log.recordsFound}</td>
                        <td className="p-3 text-sm">{log.recordsInserted}</td>
                        <td className="p-3 text-sm">{log.duplicatesSkipped || 0}</td>
                        <td className="p-3 text-sm">{log.errors}</td>
                        <td className="p-3 text-sm">{log.duration ? `${(log.duration / 1000).toFixed(1)}s` : '-'}</td>
                        <td className="p-3 text-sm text-muted-foreground">{new Date(log.createdAt).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-4">
              <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                <ChevronLeft className="h-4 w-4" /> Previous
              </Button>
              <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
              <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                Next <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
