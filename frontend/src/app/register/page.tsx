'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { fetchAPI } from '@/lib/utils';
import { Heart, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const defaultRole = searchParams.get('role') || 'CUSTOMER';
  const setAuth = useAuthStore((state) => state.setAuth);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: defaultRole.toUpperCase(),
    phone: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await fetchAPI('/auth/register', {
        method: 'POST',
        body: JSON.stringify(form),
      });
      setAuth(data.user, data.token);
      toast.success('Registration successful!');
      router.push(`/dashboard/${data.user.role.toLowerCase()}`);
    } catch (error: any) {
      toast.error(error.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md" style={{ 
      backgroundColor: 'var(--card)',
      borderColor: 'var(--border)'
    }}>
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          <Heart className="h-12 w-12 text-primary" />
        </div>
        <CardTitle className="text-2xl" style={{ color: 'var(--foreground)' }}>Create Account</CardTitle>
        <CardDescription style={{ color: 'var(--muted-foreground)' }}>
          Join CareSphere today
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name" style={{ color: 'var(--foreground)' }}>Full Name</Label>
            <Input
              id="name"
              type="text"
              placeholder="John Doe"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              style={{
                backgroundColor: 'var(--input)',
                borderColor: 'var(--border)',
                color: 'var(--foreground)'
              }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email" style={{ color: 'var(--foreground)' }}>Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
              style={{
                backgroundColor: 'var(--input)',
                borderColor: 'var(--border)',
                color: 'var(--foreground)'
              }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone" style={{ color: 'var(--foreground)' }}>Phone (Optional)</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="+1 234 567 8900"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              style={{
                backgroundColor: 'var(--input)',
                borderColor: 'var(--border)',
                color: 'var(--foreground)'
              }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" style={{ color: 'var(--foreground)' }}>Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
              style={{
                backgroundColor: 'var(--input)',
                borderColor: 'var(--border)',
                color: 'var(--foreground)'
              }}
            />
          </div>
          <div className="space-y-2">
            <Label style={{ color: 'var(--foreground)' }}>I want to</Label>
            <div className="flex gap-4">
              <Button
                type="button"
                variant={form.role === 'CUSTOMER' ? 'default' : 'outline'}
                className="flex-1"
                onClick={() => setForm({ ...form, role: 'CUSTOMER' })}
              >
                Find Care
              </Button>
              <Button
                type="button"
                variant={form.role === 'CAREGIVER' ? 'default' : 'outline'}
                className="flex-1"
                onClick={() => setForm({ ...form, role: 'CAREGIVER' })}
              >
                Provide Care
              </Button>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create Account'}
          </Button>
          <p className="text-sm text-center" style={{ color: 'var(--muted-foreground)' }}>
            Already have an account?{' '}
            <Link href="/login" className="text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}

export default function RegisterPage() {
  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4"
      style={{ backgroundColor: 'var(--background)' }}
    >
      <Suspense fallback={
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Heart className="h-12 w-12 text-primary mx-auto mb-4" />
            <CardTitle className="text-2xl">Loading...</CardTitle>
          </CardHeader>
        </Card>
      }>
        <RegisterForm />
      </Suspense>
    </div>
  );
}
