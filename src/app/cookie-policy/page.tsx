
'use client';

import { PublicNavbar } from '@/components/layout/PublicNavbar';
import { PublicFooter } from '@/components/layout/PublicFooter';
import { Card, CardContent } from '@/components/ui/card';
import { Cookie } from 'lucide-react';
import Link from 'next/link';

export default function CookiePolicyPage() {
  const staticDate = "June 12, 2025 IST";

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-background to-secondary/10">
      <PublicNavbar />
      <main className="flex-1 py-16 md:py-24">
        <div className="container mx-auto px-[5vw] md:px-[10vw]">
          <header className="mb-12 text-center">
            <Cookie className="h-16 w-16 text-primary mx-auto mb-4" />
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tighter font-headline text-foreground">
              Cookie Policy
            </h1>
          </header>

          <Card className="shadow-lg">
            <CardContent className="prose prose-sm dark:prose-invert max-w-none py-8 px-6 md:px-8 space-y-6">
              <p><strong>Effective Date:</strong> {staticDate}<br />
              <strong>Last Updated:</strong> August 1, 2025 IST</p>

              <h2>1. Introduction</h2>
              <p>Welcome to <strong>FollowUps</strong> ("we", "us", or "our"). This Cookie Policy explains how we use cookies and similar technologies when you visit our primary website at <a href="https://followups.tech">followups.tech</a> or use any of our related services ("Service").</p>
              <p>This policy works alongside our <Link href="/privacy-policy">Privacy Policy</Link>, which details how we handle personal data.</p>
              <p>By using our Service, you agree to the use of essential cookies and local storage as outlined here. If we introduce non-essential cookies (e.g., for analytics or advertising), we will ask for your explicit consent via a cookie banner.</p>

              <h2>2. What Are Cookies & Similar Technologies?</h2>
              <p>Cookies are small text files placed on your device when you visit a website. They allow the site to function properly, remember your preferences, and enhance your experience.</p>
              <p>We also use technologies like <strong>localStorage</strong> to store data directly in your browser. Unlike cookies, this data is not sent to our servers with every request.</p>

              <h2>3. How We Use Cookies and Similar Technologies</h2>
              <h3>a. Strictly Necessary (Essential)</h3>
              <p>These are vital for our service to function:</p>
              <ul>
                <li><strong>Authentication (Supabase):</strong> Supabase uses cookies (e.g., <code>sb-access-token</code>, <code>sb-refresh-token</code>) to store tokens that keep you logged in and manage your session securely.</li>
                <li><strong>Payments (Razorpay):</strong> Our payment processor uses cookies for fraud detection and to ensure smooth transaction processing.</li>
                <li><strong>Google Sign-In:</strong> If you use Google to sign in, Google places cookies to manage your authentication session.</li>
              </ul>
              
              <h3>b. Functionality (localStorage)</h3>
              <p>We use your browser's localStorage to improve your experience. This data stays on your device and is not sent to us:</p>
              <ul>
                <li><code>theme</code> – Stores your light/dark mode preference.</li>
                <li><code>onboardingCompleted</code> – Tracks if you've completed the welcome tutorial.</li>
                <li><code>followups-gemini-api-key</code> – Securely stores your Google Gemini API key **only on your device**. We never see or have access to this key.</li>
                <li><code>followups-selected-currency</code> - Stores your preferred currency (USD or INR) for viewing pricing.</li>
                <li><code>prospectflow-cached-user-data</code> & <code>prospectflow-last-full-data-fetch</code> - Temporarily caches your data to make the app load faster for you.</li>
              </ul>
              <p>These items are stored persistently in your browser and do not expire unless manually cleared.</p>

              <h3>c. Performance / Analytics</h3>
              <p>We use <strong>Counter.dev</strong>, a privacy-focused, cookieless analytics service, to understand general website traffic and improve our Service. This service does not track individual users or use cookies. We do not currently use other analytics services like Google Analytics.</p>

              <h3>d. Advertising / Targeting</h3>
              <p>We do <strong>not</strong> use any advertising or tracking cookies. If this changes in the future, we will ask for your consent first.</p>
              
              <h2>4. Cookie & Storage Types</h2>
              <div className="overflow-x-auto">
                <table>
                  <thead>
                    <tr>
                      <th>Type</th>
                      <th>Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td><strong>Session Cookies</strong></td>
                      <td>Deleted when you close your browser. Used for login sessions.</td>
                    </tr>
                    <tr>
                      <td><strong>Persistent Cookies/Storage</strong></td>
                      <td>Remain on your device until you delete them. Used for preferences, API keys, etc.</td>
                    </tr>
                    <tr>
                      <td><strong>First-Party Cookies</strong></td>
                      <td>Set by <code>followups.tech</code> (e.g., Supabase auth).</td>
                    </tr>
                    <tr>
                      <td><strong>Third-Party Cookies</strong></td>
                      <td>Set by tools we integrate with (e.g., Razorpay, Google).</td>
                    </tr>
                  </tbody>
                </table>
              </div>


              <h2>5. Managing Your Data</h2>
              <h3>a. Browser Controls</h3>
              <p>You can manage cookies and clear site data (including localStorage) through your browser settings:</p>
              <ul>
                <li><a href="https://support.google.com/chrome/answer/95647" target="_blank" rel="noopener noreferrer">Chrome</a></li>
                <li><a href="https://support.mozilla.org/en-US/kb/cookies-information-websites-store-on-your-computer" target="_blank" rel="noopener noreferrer">Firefox</a></li>
                <li><a href="https://support.apple.com/en-us/HT201265" target="_blank" rel="noopener noreferrer">Safari</a></li>
                <li><a href="https://support.microsoft.com/en-us/help/4027947" target="_blank" rel="noopener noreferrer">Edge</a></li>
              </ul>
              <p>Note: Disabling essential cookies or clearing localStorage may prevent you from logging in, break AI features, or reset your preferences.</p>
              
              <h3>b. Do Not Track (DNT)</h3>
              <p>We do not currently respond to “Do Not Track” signals, as no consistent industry standard exists. However, we limit tracking by default by using privacy-focused analytics and avoiding advertising cookies.</p>

              <h2>6. Changes to This Policy</h2>
              <p>We may update this policy if we introduce new features or technologies. Any changes will be reflected in the "Last Updated" date at the top of this page.</p>

              <h2>7. Contact Information</h2>
              <p>If you have questions or concerns about this Cookie Policy, please contact us at <a href="mailto:followups.contact@gmail.com">followups.contact@gmail.com</a>.</p>
            </CardContent>
          </Card>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
