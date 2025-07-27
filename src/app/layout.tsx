import type {Metadata} from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { UserSettingsProvider } from '@/contexts/UserSettingsContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { CountsProvider } from '@/contexts/CountsContext';
import { UserDataCacheProvider } from '@/contexts/UserDataCacheContext';
import { UserSessionProvider } from '@/contexts/UserSessionContext';
import { CurrencyProvider } from '@/contexts/CurrencyContext'; // Added import
import Script from 'next/script';

export const metadata: Metadata = {
  title: 'FollowUps',
  description: 'Manage your cold outreach efficiently.',
  icons: [],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning={true}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=PT+Sans:ital,wght@0,400;0,700;1,400;1,700&family=Playfair+Display:wght@700&display=swap" rel="stylesheet" />
        
        <Script
          src="https://cdn.counter.dev/script.js"
          data-id="98085fe6-e70d-4ff5-a443-07a2b5a22649"
          data-utcoffset="6"
          strategy="lazyOnload"
        />
        
      </head>
      <body className="font-body antialiased" suppressHydrationWarning={true}>
        <UserSessionProvider>
          <AuthProvider>
            <UserDataCacheProvider>
              <UserSettingsProvider>
                <CountsProvider>
                  <CurrencyProvider>
                    {children}
                  </CurrencyProvider>
                </CountsProvider>
              </UserSettingsProvider>
            </UserDataCacheProvider>
          </AuthProvider>
        </UserSessionProvider>
        <Toaster />
      </body>
    </html>
  );
}
