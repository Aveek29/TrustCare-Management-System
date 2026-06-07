'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store';
import { fetchAPI } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { User, Loader2, Search, Shield, Trash2, CheckCircle, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';

interface AppUser {
  _id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
}

export default function AdminUsersPage() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'ADMIN') { router.push('/login'); return; }
    fetchUsers();
  }, [isAuthenticated, user]);

  const fetchUsers = async () => {
    try {
      const data = await fetchAPI('/users');
      setUsers(Array.isArray(data) ? data : []);
    } catch { setUsers([]); }
    finally { setLoading(false); }
  };

  const toggleStatus = async (id: string, active: boolean) => {
    try {
      await fetchAPI(`/admin/users/${id}/status`, { method: 'PUT', body: JSON.stringify({ isActive: !active }) });
      toast.success(`User ${active ? 'deactivated' : 'activated'}`);
      fetchUsers();
    } catch { toast.error('Failed to update'); }
  };

  const filtered = users.filter(u =>
    u.name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  );

  if (!isAuthenticated || user?.role !== 'ADMIN') return null;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">User Management</h1>
          <p className="text-muted-foreground">Manage all platform users</p>
        </div>
        <div className="relative w-72">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search users..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
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
                    <th className="p-4 font-medium">Role</th>
                    <th className="p-4 font-medium">Status</th>
                    <th className="p-4 font-medium">Joined</th>
                    <th className="p-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((u) => (
                    <tr key={u._id} className="border-b last:border-0 hover:bg-muted/50">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <User className="h-4 w-4 text-primary" />
                          </div>
                          <span className="font-medium">{u.name}</span>
                        </div>
                      </td>
                      <td className="p-4 text-sm">{u.email}</td>
                      <td className="p-4">
                        <Badge variant={u.role === 'ADMIN' ? 'default' : 'secondary'}>{u.role}</Badge>
                      </td>
                      <td className="p-4">
                        <Badge className={u.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                          {u.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>
                      <td className="p-4 text-sm text-muted-foreground">{new Date(u.createdAt).toLocaleDateString()}</td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="outline" onClick={() => toggleStatus(u._id, u.isActive)}>
                            {u.isActive ? 'Deactivate' : 'Activate'}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
