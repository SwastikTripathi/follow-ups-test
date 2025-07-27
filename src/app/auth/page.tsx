
import React, { Suspense } from 'react';
import AuthComponent from './AuthComponent';
import { PublicNavbar } from '@/components/layout/PublicNavbar';
import { Loader2 } from 'lucide-react';

export default function AuthPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <PublicNavbar />
      <main className="flex flex-1 items-center justify-center p-4">
        <Suspense fallback={<Loader2 className="h-12 w-12 animate-spin text-primary" />}>
          <AuthComponent />
        </Suspense>
      </main>
    </div>
  );
}
