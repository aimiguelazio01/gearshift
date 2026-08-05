'use client';

import { useEffect, useState } from 'react';
import { seedIfNeeded } from '@/lib/store';
import { LanguageProvider } from '@/context/LanguageContext';

export default function AppProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    seedIfNeeded();
    setReady(true);
  }, []);

  if (!ready) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
          <p className="text-sm text-[var(--muted)]">Loading workshop data...</p>
        </div>
      </div>
    );
  }

  return <LanguageProvider>{children}</LanguageProvider>;
}
