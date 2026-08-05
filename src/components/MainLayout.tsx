'use client';

import { usePathname } from 'next/navigation';
import Sidebar from '@/components/Sidebar';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPortal = pathname?.startsWith('/portal');

  if (isPortal) {
    return (
      <div className="min-h-screen bg-slate-950">
        {children}
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 min-w-0">
        <div className="p-6 lg:p-8 pt-16 lg:pt-8">
          {children}
        </div>
      </main>
    </div>
  );
}
