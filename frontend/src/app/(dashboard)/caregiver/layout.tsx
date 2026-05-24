'use client';

import { Home, Calendar, User, FileText } from 'lucide-react';
import SharedDashboardLayout from '@/components/SharedDashboardLayout';

const caregiverNav = [
  { name: 'Dashboard', href: '/dashboard/caregiver', icon: Home },
  { name: 'My Bookings', href: '/dashboard/caregiver/bookings', icon: Calendar },
  { name: 'My Profile', href: '/dashboard/caregiver/profile', icon: User },
  { name: 'Documents', href: '/dashboard/caregiver/documents', icon: FileText },
];

export default function CaregiverLayout({ children }: { children: React.ReactNode }) {
  return (
    <SharedDashboardLayout navItems={caregiverNav} role="CAREGIVER">
      {children}
    </SharedDashboardLayout>
  );
}
