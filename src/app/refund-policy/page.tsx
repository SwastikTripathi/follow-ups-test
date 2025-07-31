
'use client';

import { PublicNavbar } from '@/components/layout/PublicNavbar';
import { PublicFooter } from '@/components/layout/PublicFooter';
import { Card, CardContent } from '@/components/ui/card';
import { RefreshCcw } from 'lucide-react';
import Link from 'next/link';

export default function RefundPolicyPage() {
  const staticDate = "June 12, 2025 IST";

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-background to-secondary/10">
      <PublicNavbar />
      <main className="flex-1 py-16 md:py-24">
        <div className="container mx-auto px-[5vw] md:px-[10vw]">
          <header className="mb-12 text-center">
            <RefreshCcw className="h-16 w-16 text-primary mx-auto mb-4" />
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tighter font-headline text-foreground">
              Refund & Cancellation Policy
            </h1>
          </header>

          <Card className="shadow-lg">
            <CardContent className="prose prose-sm dark:prose-invert max-w-none py-8 px-6 md:px-8 space-y-6">
              <p><strong>Effective Date:</strong> {staticDate}<br />
              <strong>Last Updated:</strong> August 1, 2025 IST</p>

              <h2>1. Introduction</h2>
              <p>This policy outlines how we handle subscription payments, cancellations, and refund requests for all services offered by FollowUps.</p>
              <p>By purchasing a subscription, you agree to the terms below. This policy is part of our broader legal agreement, including our <Link href="/terms-and-conditions">Terms & Conditions</Link> and <Link href="/privacy-policy">Privacy Policy</Link>.</p>

              <h2>2. Our Plans and Billing Model</h2>
              <ul>
                <li><strong>Free Tier:</strong> Our Free Tier is always free, so no refunds are necessary. We encourage you to use it extensively to ensure FollowUps meets your needs before upgrading.</li>
                <li><strong>Paid Plans (Pro & Business):</strong> We offer pre-paid, fixed-term subscription plans (e.g., monthly for Pro, annually for Business).</li>
                <li><strong>No Auto-Renewal:</strong> You pay once for the term. We do **not** automatically charge you again when your plan expires. You are always in control of your spending.</li>
              </ul>

              <h2>3. Refund Policy: Our Stance</h2>
              <p>Due to the nature of our digital service and the availability of a comprehensive Free Tier for evaluation, **we do not offer refunds on any purchased plans.**</p>
              <p>All sales are final. We encourage you to use the Free Tier to determine if FollowUps is the right tool for you before committing to a paid plan.</p>
              
              <h3>✅ We Will Not Issue Refunds For:</h3>
              <ul>
                <li>Changing your mind after purchase.</li>
                <li>Dissatisfaction with features (please use the Free Tier to evaluate).</li>
                <li>Forgetting that your plan was for a fixed term and did not require cancellation.</li>
                <li>Lack of usage during your subscription period.</li>
                <li>Account suspension due to a violation of our Terms of Service.</li>
              </ul>

              <h2>4. Exceptional Circumstances</h2>
              <p>We may consider refunds on a case-by-case basis under these rare circumstances:</p>
              <ul>
                <li><strong>Billing Errors:</strong> If we have made a demonstrable error in billing (e.g., a double charge), we will correct it and issue a refund for the erroneous amount.</li>
                <li><strong>Extended Service Unavailability:</strong> If our paid services are completely unavailable for more than 72 consecutive hours due to a fault on our end (excluding scheduled maintenance or third-party outages), we may consider a pro-rated refund for the downtime.</li>
              </ul>

              <h2>5. How to Request a Review for an Exceptional Circumstance</h2>
              <p>If you believe your situation falls under one of the exceptional circumstances above, please contact us within 14 days of the transaction or incident.</p>
              <p><strong>📧 Email us at:</strong> <a href="mailto:followups.contact@gmail.com">followups.contact@gmail.com</a></p>
              <p><strong>Please include:</strong></p>
              <ul>
                <li>Your full name and account email.</li>
                <li>The date of purchase and the plan you subscribed to.</li>
                <li>Detailed information and any evidence (e.g., transaction ID, screenshots) supporting your claim.</li>
              </ul>
              <p>All decisions made by FollowUps regarding such requests are final.</p>

              <h2>6. Cancellation</h2>
              <p>Since our paid plans do not auto-renew, there is no need to "cancel" a subscription to prevent future charges. You can simply let the plan expire at the end of its term. You will retain full access to your plan's features until the last day of the pre-paid period.</p>

              <h2>7. Contact Us</h2>
              <p>If you have any questions about this policy, please contact us before making a purchase.</p>
              <p><strong>Support Team:</strong> <a href="mailto:followups.contact@gmail.com">followups.contact@gmail.com</a></p>
            </CardContent>
          </Card>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
