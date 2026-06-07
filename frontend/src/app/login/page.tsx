'use client';

import { useState, Suspense, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { fetchAPI } from '@/lib/utils';
import { Heart, Loader2, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';

declare global {
  interface Window {
    google?: any;
  }
}

function LoginForm() {
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleReady, setGoogleReady] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({
    email: '',
    password: '',
  });

  useEffect(() => {
    const initGoogle = () => {
      if (window.google && document.getElementById('google-signin-button')) {
        window.google.accounts.id.initialize({
          client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || 'your-google-client-id.apps.googleusercontent.com',
          callback: handleGoogleCallback,
        });
        window.google.accounts.id.renderButton(
          document.getElementById('google-signin-button'),
          { theme: 'outline', size: 'large', width: '100%' }
        );
        setGoogleReady(true);
      }
    };

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      setTimeout(initGoogle, 100);
    };
    document.head.appendChild(script);

    return () => {
      document.head.removeChild(script);
    };
  }, []);

  const handleGoogleCallback = async (response: any) => {
    setGoogleLoading(true);
    try {
      const payload = JSON.parse(atob(response.credential.split('.')[1]));
      
      const data = await fetchAPI('/auth/google', {
        method: 'POST',
        body: JSON.stringify({
          googleId: payload.sub,
          email: payload.email,
          name: payload.name,
          avatar: payload.picture,
        }),
      });
      
      setAuth(data.user, data.token);
      toast.success('Login successful!');
      router.push(`/dashboard/${data.user.role.toLowerCase()}`);
    } catch (error: any) {
      toast.error(error.message || 'Google login failed');
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await fetchAPI('/auth/login', {
        method: 'POST',
        body: JSON.stringify(form),
      });
      setAuth(data.user, data.token);
      toast.success('Login successful!');
      router.push(`/dashboard/${data.user.role.toLowerCase()}`);
    } catch (error: any) {
      toast.error(error.message || 'Login failed');
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
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', duration: 0.5 }}
          >
            <Heart className="h-12 w-12 text-primary" />
          </motion.div>
        </div>
        <CardTitle className="text-2xl" style={{ color: 'var(--foreground)' }}>Welcome Back</CardTitle>
        <CardDescription style={{ color: 'var(--muted-foreground)' }}>
          Sign in to your CareSphere account
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div id="google-signin-button" className="w-full">
            {googleLoading && (
              <Button type="button" variant="outline" className="w-full h-12" disabled>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Signing in with Google...
              </Button>
            )}
          </div>
          
          {(!googleReady || googleLoading) && (
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" style={{ borderColor: 'var(--border)' }} />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="px-2" style={{ backgroundColor: 'var(--card)', color: 'var(--muted-foreground)' }}>
                  Or continue with
                </span>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email" style={{ color: 'var(--foreground)' }}>Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4" style={{ color: 'var(--muted-foreground)' }} />
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
                className="pl-10"
                style={{
                  backgroundColor: 'var(--input)',
                  borderColor: 'var(--border)',
                  color: 'var(--foreground)'
                }}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" style={{ color: 'var(--foreground)' }}>Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4" style={{ color: 'var(--muted-foreground)' }} />
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
                className="pl-10 pr-10"
                style={{
                  backgroundColor: 'var(--input)',
                  borderColor: 'var(--border)',
                  color: 'var(--foreground)'
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" style={{ color: 'var(--muted-foreground)' }} />
                ) : (
                  <Eye className="h-4 w-4" style={{ color: 'var(--muted-foreground)' }} />
                )}
              </button>
            </div>
          </div>
          <div className="text-xs text-muted-foreground space-y-1 p-3 rounded bg-muted/50">
            <p className="font-medium">Demo Credentials:</p>
            <p>Customer: rajesh.kumar@caresphere.in</p>
            <p>Caregiver: priya.sharma@caresphere.com</p>
            <p>Admin: admin@caresphere.in</p>
            <p>Password: caregiver123</p>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Sign In'}
          </Button>
          <p className="text-sm text-center" style={{ color: 'var(--muted-foreground)' }}>
            Don&apos;t have an account?{' '}
            <Link href="/register" className="text-primary hover:underline">
              Sign up
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <div 
      className="min-h-screen flex flex-col items-center justify-center p-4"
      style={{ backgroundColor: 'var(--background)' }}
    >
      <div className="mb-4">
        <Link href="/" className="text-sm text-primary hover:underline flex items-center gap-1">
          ← Return to Home
        </Link>
      </div>
      <Suspense fallback={
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Heart className="h-12 w-12 text-primary mx-auto mb-4" />
            <CardTitle className="text-2xl">Loading...</CardTitle>
          </CardHeader>
        </Card>
      }>
        <LoginForm />
      </Suspense>
    </div>
  );
}
