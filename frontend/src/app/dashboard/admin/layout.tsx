'use client';

import { Home, Users, Calendar, User, Activity, Database, Play, Building2, ScrollText } from 'lucide-react';
import SharedDashboardLayout from '@/components/SharedDashboardLayout';

const adminNav = [
  { name: 'Dashboard', href: '/dashboard/admin', icon: Home },
  { name: 'Users', href: '/dashboard/admin/users', icon: Users },
  { name: 'Caregivers', href: '/dashboard/admin/caregivers', icon: User },
  { name: 'Bookings', href: '/dashboard/admin/bookings', icon: Calendar },
  { name: 'Activity Logs', href: '/dashboard/admin/logs', icon: Activity },
  { name: 'Data Sources', href: '/dashboard/admin/data-sources', icon: Database },
  { name: 'Scraping Jobs', href: '/dashboard/admin/scraping-jobs', icon: Play },
  { name: 'Providers', href: '/dashboard/admin/providers', icon: Building2 },
  { name: 'Aggregator Logs', href: '/dashboard/admin/aggregator-logs', icon: ScrollText },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <SharedDashboardLayout navItems={adminNav} role="ADMIN">
      {children}
    </SharedDashboardLayout>
  );
}
