'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store';
import { Button } from '@/components/ui/button';
import { Heart, Home, LogOut, Menu, X } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeProvider';

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface SharedDashboardLayoutProps {
  children: React.ReactNode;
  navItems: NavItem[];
  role: 'ADMIN' | 'CAREGIVER' | 'CUSTOMER';
}

export default function SharedDashboardLayout({ 
  children, 
  navItems, 
  role 
}: SharedDashboardLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, logout } = useAuthStore();
  const [mounted, setMounted] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (mounted && !isAuthenticated) {
      router.push('/login');
    } else if (mounted && user?.role && user.role !== role) {
      router.push(`/dashboard/${user.role.toLowerCase()}`);
    }
  }, [mounted, isAuthenticated, user, role, router]);

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  const getRoleLabel = () => {
    switch (role) {
      case 'ADMIN': return 'Admin';
      case 'CAREGIVER': return 'Caregiver';
      case 'CUSTOMER': return 'Customer';
      default: return '';
    }
  };

  if (!mounted || !isAuthenticated || user?.role !== role) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--background)' }}>
        <div className="animate-pulse flex flex-col items-center">
          <Heart className="h-12 w-12 text-primary animate-bounce" />
          <p className="mt-4" style={{ color: 'var(--foreground)' }}>Loading {getRoleLabel()} Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--background)' }}>
      <button 
        className="fixed top-4 left-4 z-50 md:hidden p-2 rounded-md"
        style={{ backgroundColor: 'var(--card)', color: 'var(--foreground)' }}
        onClick={() => setSidebarOpen(!sidebarOpen)}
      >
        {sidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </button>

      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className="flex">
        <aside 
          className={`w-64 min-h-screen fixed shadow-lg z-40 transition-transform duration-300 md:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
          style={{ 
            backgroundColor: 'var(--card)',
            borderColor: 'var(--border)'
          }}
        >
          <div className="p-6 border-b md:mt-0 mt-16" style={{ borderColor: 'var(--border)' }}>
            <Link href="/" className="flex items-center space-x-2">
              <Heart className="h-6 w-6 text-primary" />
              <span className="text-xl font-bold text-primary">CareSphere</span>
            </Link>
            <p className="mt-2 text-sm" style={{ color: 'var(--muted-foreground)' }}>
              {getRoleLabel()} Dashboard
            </p>
          </div>
          
          <nav className="px-4 py-4 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link key={item.name} href={item.href}>
                  <Button 
                    variant={isActive ? "secondary" : "ghost"} 
                    className="w-full justify-start"
                    style={{ 
                      color: isActive ? 'var(--primary)' : 'var(--foreground)',
                      backgroundColor: isActive ? 'var(--primary)/10' : 'transparent'
                    }}
                  >
                    <Icon className="h-5 w-5 mr-3 text-primary" />
                    {item.name}
                  </Button>
                </Link>
              );
            })}
          </nav>

          <div className="absolute bottom-0 left-0 right-0 p-4 border-t flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
            <ThemeToggle />
            <Button 
              variant="ghost" 
              className="justify-start" 
              onClick={handleLogout}
              style={{ color: '#ef4444' }}
            >
              <LogOut className="h-5 w-5 mr-2" />
              Logout
            </Button>
          </div>
        </aside>

        <main className="flex-1 md:ml-64 ml-0 p-4 md:p-8 pt-16 md:pt-8" style={{ backgroundColor: 'var(--background)' }}>
          {children}
        </main>
      </div>
    </div>
  );
}
