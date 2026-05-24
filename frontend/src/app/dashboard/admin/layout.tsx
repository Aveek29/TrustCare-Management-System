'use client';

import { Home, Users, Calendar, User, Activity } from 'lucide-react';
import SharedDashboardLayout from '@/components/SharedDashboardLayout';

const adminNav = [
  { name: 'Dashboard', href: '/dashboard/admin', icon: Home },
  { name: 'Users', href: '/dashboard/admin/users', icon: Users },
  { name: 'Caregivers', href: '/dashboard/admin/caregivers', icon: User },
  { name: 'Bookings', href: '/dashboard/admin/bookings', icon: Calendar },
  { name: 'Activity Logs', href: '/dashboard/admin/logs', icon: Activity },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <SharedDashboardLayout navItems={adminNav} role="ADMIN">
      {children}
    </SharedDashboardLayout>
  );
}
