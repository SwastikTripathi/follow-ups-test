
'use client';

import { PublicNavbar } from '@/components/layout/PublicNavbar';
import { PublicFooter } from '@/components/layout/PublicFooter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldCheck } from 'lucide-react';
import Link from 'next/link'; // Added Link for internal navigation

export default function PrivacyPolicyPage() {
  const staticDate = "June 12, 2025 IST"; 

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-background to-secondary/10">
      <PublicNavbar />
      <main className="flex-1 py-16 md:py-24">
        <div className="container mx-auto px-[5vw] md:px-[10vw]">
          <header className="mb-12 text-center">
            <ShieldCheck className="h-16 w-16 text-primary mx-auto mb-4" />
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tighter font-headline text-foreground">
              Privacy Policy
            </h1>
          </header>

          <Card className="shadow-lg">
            <CardContent className="prose prose-sm dark:prose-invert max-w-none py-8 px-6 md:px-8 space-y-6">
              <p><strong>Effective Date:</strong> {staticDate}<br />
              <strong>Last Updated:</strong> August 1, 2025 IST</p>

              <p>Welcome to <strong>FollowUps</strong>. Your privacy is important to us. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our service, including through our primary website at <a href="https://followups.tech">followups.tech</a>, our alternate domains (like <a href="https://followups-tech.vercel.app">followups-tech.vercel.app</a>), and related services ("Service"). Please read this policy carefully to understand your rights and our obligations under applicable privacy laws.</p>

              <h2>1. Who We Are</h2>
              <p>This Privacy Policy is issued by <strong>FollowUps</strong> ("FollowUps", "we", "our", or "us"). We are the data controller for your personal data, except where we act on behalf of a third party.</p>
              <p><strong>Contact Information:</strong><br />
              <a href="mailto:followups.contact@gmail.com">followups.contact@gmail.com</a></p>

              <h2>2. Scope and Acceptance</h2>
              <p>By using FollowUps, you agree to the collection and use of your information in accordance with this Privacy Policy. If you do not agree, please do not use our services.</p>
              <p>This policy applies to all users, globally, and incorporates requirements under:</p>
              <ul>
                <li><strong>GDPR</strong> (EU/UK)</li>
                <li><strong>CCPA/CPRA</strong> (California, USA)</li>
                <li><strong>DPDPA</strong> (India)</li>
                <li><strong>PIPEDA</strong> (Canada)</li>
                <li><strong>LGPD</strong> (Brazil)</li>
              </ul>

              <h2>3. Information We Collect</h2>
              <h3>a. Information You Provide Directly</h3>
              <ul>
                <li><strong>Account Information:</strong> Email address, full name (optional), password (hashed), and OAuth details (if signing in via Google).</li>
                <li><strong>User Profile Settings:</strong> Display name, role, age range, country, annual income (optional), income currency, usage preferences, email cadence settings.</li>
                <li><strong>Prospecting Data You Enter:</strong>
                  <ul>
                    <li><strong>Leads/Job Openings:</strong> Company name, role title, notes, job URL, initial outreach date.</li>
                    <li><strong>Contacts:</strong> Name, title, email, phone number, LinkedIn URL, notes, and tags.</li>
                    <li><strong>Follow-Ups:</strong> Status, follow-up dates, email subjects and bodies.</li>
                    <li><strong>Email Templates:</strong> Subjects, bodies, and signatures you write or save.</li>
                  </ul>
                </li>
                <li><strong>Payment Information (via Razorpay):</strong> We collect order ID, payment ID, and subscription metadata. Credit card numbers are <strong>not stored</strong> by us.</li>
                 <li><strong>Your Gemini API Key:</strong> To use our AI features, you must provide your own Google Gemini API key. This key is stored **exclusively in your browser's local storage**. It is **never** sent to our servers, and we cannot access it.</li>
                 <li><strong>Resume & Portfolio Data:</strong> You may voluntarily provide detailed resume and portfolio information, including your work experience, education, skills, projects, and images. This data is used to personalize AI-generated content.</li>
              </ul>

              <h3>b. Information We Collect Automatically</h3>
              <ul>
                <li><strong>Device and Usage Data:</strong> IP address, browser type, device type, pages visited, timestamps, error logs.</li>
                <li><strong>Cookies & LocalStorage:</strong>
                  <ul>
                    <li>Session management (via Supabase Auth)</li>
                    <li>Theme preference (light/dark mode)</li>
                    <li>Onboarding tutorial progress</li>
                    <li>Your Gemini API Key (stored only on your device)</li>
                  </ul>
                </li>
                <li><strong>AI Usage Count:</strong> We track the number of times you use an AI generation feature to enforce plan limits, but we do not store the content of your prompts or the generated responses.</li>
              </ul>

              <h3>c. Information from Third Parties</h3>
              <ul>
                <li><strong>Google OAuth:</strong> If you sign in using Google, we receive basic profile information.</li>
                <li><strong>Razorpay:</strong> For payment processing.</li>
              </ul>

              <h2>4. How We Use Your Information</h2>
              <p>We use your information for the following purposes:</p>
              <ul>
                <li>To provide, maintain, and improve our Service.</li>
                <li>To manage your account and preferences.</li>
                <li>To process payments and subscriptions.</li>
                <li>To communicate service-related updates, notifications, and support responses.</li>
                <li>To personalize your experience and follow-up workflows.</li>
                <li>To provide AI-powered features, such as generating email drafts, by sending relevant context (like job descriptions and resume data) from your browser to the Google Gemini API using your locally-stored API key.</li>
                <li>To analyze usage and improve product functionality.</li>
                <li>To ensure data security, prevent fraud, and comply with legal obligations.</li>
                <li>With your consent, to send optional marketing communications (opt-out anytime).</li>
              </ul>

              <h2>5. Legal Bases for Processing (GDPR & DPDPA)</h2>
              <p>We process personal data under one or more of the following legal bases:</p>
              <ul>
                <li><strong>Consent:</strong> For optional fields like income or marketing emails.</li>
                <li><strong>Contract:</strong> For providing core features to registered users.</li>
                <li><strong>Legal Obligation:</strong> For financial and tax compliance.</li>
                <li><strong>Legitimate Interest:</strong> To improve functionality and prevent abuse.</li>
              </ul>

              <h2>6. Sharing Your Information</h2>
              <p>We do <strong>not sell</strong> your personal data.</p>
              <p>We may share limited data with:</p>
              <ul>
                <li><strong>Service Providers:</strong>
                  <ul>
                    <li>Supabase (data storage, authentication)</li>
                    <li>Razorpay (payment processing)</li>
                  </ul>
                </li>
                 <li><strong>Google (via AI Features):</strong> When you use an AI feature, your prompt data (e.g., job description, resume context) and your API key are sent directly from your browser to the Google Gemini API. We do not act as an intermediary for this data transfer.</li>
                <li><strong>Legal Compliance:</strong> If required by law or government request.</li>
                <li><strong>Business Transfers:</strong> In the event of a merger, acquisition, or asset sale.</li>
                <li><strong>With Your Consent:</strong> In cases where we ask for explicit permission.</li>
                <li><strong>Anonymized or Aggregated Data:</strong> For analytics or reporting that cannot identify you.</li>
              </ul>

              <h2>7. International Data Transfers</h2>
              <p>Our data infrastructure may involve transfers to and from countries like the United States. We use appropriate safeguards such as:</p>
              <ul>
                <li><strong>Standard Contractual Clauses (SCCs)</strong></li>
                <li><strong>Data Processing Agreements (DPAs)</strong> with third-party providers</li>
              </ul>

              <h2>8. Data Retention</h2>
              <p>We retain your data:</p>
              <ul>
                <li>As long as your account is active.</li>
                <li>For up to 90 days after deletion for backup, security, or legal compliance (unless otherwise required).</li>
                <li>Anonymized data may be retained for analytics purposes indefinitely.</li>
              </ul>

              <h2>9. Your Rights</h2>
              <p>Depending on your location, you may have the following rights:</p>
              <div className="overflow-x-auto">
                <table>
                  <thead>
                    <tr>
                      <th className="px-4 py-2 border text-left">Right</th>
                      <th className="px-4 py-2 border text-left">Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr><td className="px-4 py-2 border">Access</td><td className="px-4 py-2 border">Request a copy of your personal data.</td></tr>
                    <tr><td className="px-4 py-2 border">Rectification</td><td className="px-4 py-2 border">Request correction of inaccurate or incomplete data.</td></tr>
                    <tr><td className="px-4 py-2 border">Erasure ("Right to be Forgotten")</td><td className="px-4 py-2 border">Request deletion of your data.</td></tr>
                    <tr><td className="px-4 py-2 border">Restriction</td><td className="px-4 py-2 border">Limit how your data is processed.</td></tr>
                    <tr><td className="px-4 py-2 border">Portability</td><td className="px-4 py-2 border">Receive your data in a structured, machine-readable format.</td></tr>
                    <tr><td className="px-4 py-2 border">Objection</td><td className="px-4 py-2 border">Object to processing based on legitimate interests.</td></tr>
                    <tr><td className="px-4 py-2 border">Withdraw Consent</td><td className="px-4 py-2 border">If processing is based on consent, withdraw at any time.</td></tr>
                  </tbody>
                </table>
              </div>
              <p>To exercise these rights, email us at <a href="mailto:followups.contact@gmail.com">followups.contact@gmail.com</a>.</p>

              <h3>For California Residents (CCPA/CPRA)</h3>
              <p>You have the right to:</p>
              <ul>
                <li>Know what personal data we collect and why.</li>
                <li>Request deletion.</li>
                <li>Opt-out of the sharing of personal data (we do <strong>not</strong> sell data).</li>
                <li>Non-discrimination for exercising privacy rights.</li>
              </ul>

              <h2>10. Children’s Privacy</h2>
              <p>FollowUps is not intended for individuals under the age of <strong>18</strong>. We do not knowingly collect personal data from children. If we become aware that a minor has submitted data, we will promptly delete it.</p>

              <h2>11. Cookies and Tracking Technologies</h2>
              <p>We use:</p>
              <ul>
                <li><strong>Essential Cookies:</strong> For authentication and performance (e.g., Supabase session cookies)</li>
                <li><strong>LocalStorage:</strong> To save onboarding state, theme preference, and your Gemini API Key.</li>
              </ul>
              <p>For more details, please see our <Link href="/cookie-policy" className="text-primary hover:underline">Cookie Policy</Link>.</p>

              <h2>12. Data Security</h2>
              <p>We employ industry-standard security measures including:</p>
              <ul>
                <li>HTTPS encryption in transit</li>
                <li>Encryption at rest (via Supabase)</li>
                <li>Hashed passwords using secure algorithms</li>
                <li>Environment variable management of secrets</li>
                <li>Row-Level Security (RLS) in Supabase to isolate user data</li>
              </ul>
              <p>While we follow best practices, no system is 100% secure. We recommend users use strong passwords and secure their own devices.</p>

              <h2>13. Account Control & Deletion</h2>
              <p>Users may:</p>
              <ul>
                <li>Access or update their profile in the <strong>Settings</strong> page.</li>
                <li>Delete their account via the <strong>Danger Zone</strong> in Account Settings.</li>
              </ul>
              <p>Account deletion removes all application data (e.g., jobs, contacts, templates). Authentication data may persist for audit or platform requirements unless fully purged.</p>

              <h2>14. Data Ownership & Responsibility</h2>
              <p><strong>User Responsibility & Data Integrity:</strong> Users retain ownership of their personal data that they store within FollowUps. While we employ industry-standard security practices and rely on trusted third-party infrastructure providers (such as Supabase and Razorpay), we are not liable for data breaches or unauthorized access resulting from user negligence (e.g., weak passwords, phishing, insecure devices) or from external factors beyond our control. We act solely as a platform provider to help users securely store and access their own data.</p>
              
              <h2>15. Dispute Resolution & Complaints</h2>
              <p>If you have a privacy-related complaint:</p>
              <ul>
                <li>Contact us at <a href="mailto:followups.contact@gmail.com">followups.contact@gmail.com</a></li>
              </ul>

              <h2>16. Third-Party Links</h2>
              <p>Our app may contain links to external websites not controlled by us. We are not responsible for the content or privacy practices of those sites. We encourage you to review their policies.</p>

              <h2>17. Changes to This Policy</h2>
              <p>We may update this Privacy Policy periodically. Material changes will be:</p>
              <ul>
                <li>Reflected in the "Last Updated" date</li>
                <li>Communicated via in-app notification or email, if appropriate</li>
              </ul>
              <p>We recommend reviewing this policy regularly to stay informed.</p>

              <h2>18. Contact Us</h2>
              <p>If you have questions, concerns, or requests regarding this Privacy Policy or your data, please contact:</p>
              <p>📧 <strong>Email:</strong> <a href="mailto:followups.contact@gmail.com">followups.contact@gmail.com</a></p>
            </CardContent>
          </Card>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
