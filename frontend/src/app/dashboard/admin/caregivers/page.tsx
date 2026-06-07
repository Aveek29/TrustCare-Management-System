'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store';
import { fetchAPI } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { User, Loader2, Search, Star, Shield, CheckCircle, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';

interface CaregiverUser {
  _id: string;
  userId?: { _id: string; name: string; email: string; isActive: boolean };
  name?: string;
  email?: string;
  experience?: number;
  rating?: number;
  isAvailable?: boolean;
  isVerified?: boolean;
  services?: string[];
}

export default function AdminCaregiversPage() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();
  const [caregivers, setCaregivers] = useState<CaregiverUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'ADMIN') { router.push('/login'); return; }
    fetchCaregivers();
  }, [isAuthenticated, user]);

  const fetchCaregivers = async () => {
    try {
      const data = await fetchAPI('/caregivers');
      setCaregivers(Array.isArray(data) ? data : []);
    } catch { setCaregivers([]); }
    finally { setLoading(false); }
  };

  const toggleAvailability = async (id: string, available: boolean) => {
    try {
      await fetchAPI(`/caregivers/${id}/availability`, { method: 'PUT', body: JSON.stringify({ isAvailable: !available }) });
      toast.success(`Availability updated`);
      fetchCaregivers();
    } catch { toast.error('Failed to update'); }
  };

  const toggleVerification = async (id: string, verified: boolean) => {
    try {
      await fetchAPI(`/caregivers/verify/${id}`, { method: 'PUT', body: JSON.stringify({ isVerified: !verified }) });
      toast.success(`Verification updated`);
      fetchCaregivers();
    } catch { toast.error('Failed to update'); }
  };

  const filtered = caregivers.filter(c => {
    const n = c.userId?.name || c.name || '';
    const e = c.userId?.email || c.email || '';
    const q = search.toLowerCase();
    return n.toLowerCase().includes(q) || e.toLowerCase().includes(q);
  });

  if (!isAuthenticated || user?.role !== 'ADMIN') return null;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Caregiver Management</h1>
          <p className="text-muted-foreground">Manage all registered caregivers</p>
        </div>
        <div className="relative w-72">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search caregivers..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-left text-sm text-muted-foreground">
                    <th className="p-4 font-medium">Name</th>
                    <th className="p-4 font-medium">Email</th>
                    <th className="p-4 font-medium">Experience</th>
                    <th className="p-4 font-medium">Rating</th>
                    <th className="p-4 font-medium">Status</th>
                    <th className="p-4 font-medium">Verified</th>
                    <th className="p-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c) => {
                    const name = c.userId?.name || c.name || 'Unknown';
                    const email = c.userId?.email || c.email || '';
                    const active = c.userId?.isActive ?? true;
                    return (
                      <tr key={c._id} className="border-b last:border-0 hover:bg-muted/50">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                              <User className="h-4 w-4 text-primary" />
                            </div>
                            <span className="font-medium">{name}</span>
                          </div>
                        </td>
                        <td className="p-4 text-sm">{email}</td>
                        <td className="p-4 text-sm">{c.experience ? `${c.experience}yrs` : '-'}</td>
                        <td className="p-4">
                          <div className="flex items-center gap-1">
                            <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                            <span>{(c.rating || 0).toFixed(1)}</span>
                          </div>
                        </td>
                        <td className="p-4">
                          <Badge className={c.isAvailable ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}>
                            {c.isAvailable ? 'Available' : 'Unavailable'}
                          </Badge>
                        </td>
                        <td className="p-4">
                          {c.isVerified ? <CheckCircle className="h-5 w-5 text-green-500" /> : <XCircle className="h-5 w-5 text-red-500" />}
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <Button size="sm" variant="outline" onClick={() => toggleAvailability(c._id, !!c.isAvailable)}>
                              {c.isAvailable ? 'Mark Unavailable' : 'Mark Available'}
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => toggleVerification(c._id, !!c.isVerified)}>
                              {c.isVerified ? 'Unverify' : 'Verify'}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
