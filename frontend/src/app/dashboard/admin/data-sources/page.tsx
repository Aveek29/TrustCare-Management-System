'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store';
import { fetchAPI } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Database, Loader2, Plus, Play, Pause } from 'lucide-react';
import toast from 'react-hot-toast';

interface DataSource {
  _id: string;
  name: string;
  baseUrl: string;
  category: string;
  isActive: boolean;
  scrapeInterval: number;
  lastScrapedAt: string | null;
  totalRecords: number;
  errorCount: number;
}

export default function DataSourcesPage() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();
  const [sources, setSources] = useState<DataSource[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'ADMIN') { router.push('/login'); return; }
    fetchSources();
  }, [isAuthenticated, user]);

  const fetchSources = async () => {
    try {
      const data = await fetchAPI('/admin/aggregator/sources');
      setSources(Array.isArray(data) ? data : []);
    } catch { setSources([]); }
    finally { setLoading(false); }
  };

  const toggleSource = async (id: string, active: boolean) => {
    try {
      await fetchAPI(`/admin/aggregator/sources/${id}`, { method: 'PUT', body: JSON.stringify({ isActive: !active }) });
      toast.success(`Source ${active ? 'paused' : 'resumed'}`);
      fetchSources();
    } catch { toast.error('Failed to update source'); }
  };

  if (!isAuthenticated || user?.role !== 'ADMIN') return null;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Data Sources</h1>
          <p className="text-muted-foreground">Manage healthcare data scraping sources</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : (
        <div className="grid gap-4">
          {sources.length === 0 && (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                No data sources configured. Sources will appear here once created.
              </CardContent>
            </Card>
          )}
          {sources.map((source) => (
            <Card key={source._id}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Database className="h-8 w-8 text-primary" />
                    <div>
                      <h3 className="font-semibold">{source.name}</h3>
                      <p className="text-sm text-muted-foreground">{source.baseUrl}</p>
                      <div className="flex gap-2 mt-1">
                        <Badge variant="outline">{source.category}</Badge>
                        <Badge className={source.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}>
                          {source.isActive ? 'Active' : 'Paused'}
                        </Badge>
                        <span className="text-xs text-muted-foreground self-center">
                          {source.totalRecords} records | {source.errorCount} errors
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => toggleSource(source._id, source.isActive)}>
                      {source.isActive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                      {source.isActive ? 'Pause' : 'Resume'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
