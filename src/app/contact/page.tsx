
'use client';

import { PublicNavbar } from '@/components/layout/PublicNavbar';
import { PublicFooter } from '@/components/layout/PublicFooter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail, Users, MessageSquareQuote, Instagram, Twitter, Youtube, Linkedin, Building2 } from 'lucide-react';
import Link from 'next/link';

export default function ContactPage() {
  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-background to-secondary/10">
      <PublicNavbar />
      <main className="flex-1 py-16 md:py-24">
        <div className="container mx-auto px-[5vw] md:px-[10vw]">
          <div className="max-w-3xl mx-auto text-center mb-12">
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tighter mb-6 font-headline text-foreground">
              Get in Touch
            </h1>
            <p className="text-lg text-muted-foreground">
              We're here to help and answer any question you might have. We look forward to hearing from you!
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            <Card className="shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader>
                <CardTitle className="font-headline flex items-center text-xl">
                  <Mail className="mr-3 h-6 w-6 text-primary" />
                  General Support
                </CardTitle>
                <CardDescription>
                  For any questions about using FollowUps, technical issues, or feedback.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-2">
                  Our support team is available to assist you. Please email us at:
                </p>
                <Link href="mailto:followups.contact@gmail.com" className="text-primary font-semibold hover:underline break-all">
                  followups.contact@gmail.com
                </Link>
                <p className="text-xs text-muted-foreground mt-3">
                  We aim to respond within 24-48 business hours.
                </p>
              </CardContent>
            </Card>

            <Card className="shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader>
                <CardTitle className="font-headline flex items-center text-xl">
                  <Users className="mr-3 h-6 w-6 text-accent" />
                  Partnerships & Collaborations
                </CardTitle>
                <CardDescription>
                  Interested in partnering with us? Reach out to our partnerships team.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-2">
                  For partnership inquiries, please email us with the subject "Discussing Collaboration":
                </p>
                <Link href="mailto:followups.contact@gmail.com?subject=Discussing%20Collaboration" className="text-accent font-semibold hover:underline break-all">
                  followups.contact@gmail.com
                </Link>
                 <p className="text-xs text-muted-foreground mt-3">
                  Learn more on our <Link href="/partner-with-us" className="text-accent hover:underline">Partners Page</Link>.
                </p>
              </CardContent>
            </Card>
            
            <Card className="shadow-lg hover:shadow-xl transition-shadow md:col-span-2">
              <CardHeader>
                <CardTitle className="font-headline flex items-center text-xl">
                  <Building2 className="mr-3 h-6 w-6 text-primary" />
                  Enterprise & Team Solutions
                </CardTitle>
                <CardDescription>
                  For teams, organizations, and power users with custom needs.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-2">
                  Let's discuss custom limits, team features, priority support, and dedicated onboarding.
                </p>
                <Link href="mailto:followups.contact@gmail.com?subject=Enterprise%20Inquiry" className="text-primary font-semibold hover:underline break-all">
                  followups.contact@gmail.com
                </Link>
                <p className="text-xs text-muted-foreground mt-3">
                  We'll get back to you to schedule a consultation.
                </p>
              </CardContent>
            </Card>
          </div>

           <div className="text-center mt-16">
             <MessageSquareQuote className="h-12 w-12 text-primary mx-auto mb-4" />
             <h2 className="text-2xl font-semibold font-headline mb-3">Have Other Questions?</h2>
             <p className="text-muted-foreground max-w-md mx-auto">
               Check out our <Link href="/blog" className="text-primary hover:underline">Blog</Link> for tips and updates,
               or explore our <Link href="/pricing" className="text-primary hover:underline">Pricing</Link> page for plan details.
             </p>
           </div>

           <div className="mt-16 text-center">
            <h3 className="text-xl font-semibold mb-6 text-foreground font-headline">Connect with Us</h3>
            <div className="flex justify-center space-x-6">
              <a href="https://www.instagram.com/followups.tech/" aria-label="Instagram" className="text-muted-foreground hover:text-primary transition-colors"><Instagram size={24} /></a>
              <a href="https://www.linkedin.com/company/followups-tech" aria-label="Linkedin" className="text-muted-foreground hover:text-primary transition-colors"><Linkedin size={24} /></a>
              <a href="https://www.youtube.com/@followups_tech" aria-label="YouTube" className="text-muted-foreground hover:text-primary transition-colors"><Youtube size={24} /></a>
              <a href="https://x.com/FollowUp548679" aria-label="Twitter" className="text-muted-foreground hover:text-primary transition-colors"><Twitter size={24} /></a>
            </div>
          </div>

        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
