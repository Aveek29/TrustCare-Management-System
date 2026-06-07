'use client';

import { Home, Calendar, Star, Users, DollarSign } from 'lucide-react';
import SharedDashboardLayout from '@/components/SharedDashboardLayout';

const customerNav = [
  { name: 'Dashboard', href: '/dashboard/customer', icon: Home },
  { name: 'My Bookings', href: '/dashboard/customer/bookings', icon: Calendar },
  { name: 'Find Caregivers', href: '/caregivers', icon: Users },
  { name: 'Hire Caregiver', href: '/dashboard/customer/hire', icon: DollarSign },
  { name: 'Reviews', href: '/dashboard/customer/reviews', icon: Star },
];

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  return (
    <SharedDashboardLayout navItems={customerNav} role="CUSTOMER">
      {children}
    </SharedDashboardLayout>
  );
}
