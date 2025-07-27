
'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button, type ButtonProps } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, Circle, ArrowRight, HelpCircle, Sparkles } from 'lucide-react'; // Added HelpCircle
import { useToast } from '@/hooks/use-toast';
import { ALL_AVAILABLE_PLANS } from '@/lib/config';
import type { AvailablePlan, PlanFeature, SubscriptionTier, Currency } from '@/lib/types';
import { cn } from '@/lib/utils';
import { PublicNavbar } from '@/components/layout/PublicNavbar';
import { PublicFooter } from '@/components/layout/PublicFooter';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useCurrency } from '@/contexts/CurrencyContext'; // Import the currency hook
import { CurrencySwitcher } from '@/components/CurrencySwitcher'; // Import the switcher

interface PublicPlanDisplayInfo {
  isFree: boolean;
  isDiscounted: boolean;
  originalTotalPrice?: number;
  discountedPricePerMonth?: number;
  finalTotalPrice: number;
  priceMonthlyDirect?: number;
  durationMonths: number;
  discountPercentage?: number;
}

const calculatePublicPlanDisplayInfo = (plan: AvailablePlan, currency: Currency): PublicPlanDisplayInfo => {
  if (plan.databaseTier === 'free') {
    return {
      isFree: true,
      isDiscounted: false,
      finalTotalPrice: 0,
      durationMonths: plan.durationMonths,
    };
  }

  const monthlyPrice = plan.price[currency];
  const originalTotal = monthlyPrice * plan.durationMonths;
  let finalTotal = originalTotal;
  let discountedPerMonth;

  if (plan.discountPercentage && plan.discountPercentage > 0) {
    const discountAmount = originalTotal * (plan.discountPercentage / 100);
    finalTotal = originalTotal - discountAmount;
    discountedPerMonth = finalTotal / plan.durationMonths;
    return {
      isFree: false,
      isDiscounted: true,
      originalTotalPrice: originalTotal,
      discountedPricePerMonth: discountedPerMonth,
      finalTotalPrice: finalTotal,
      durationMonths: plan.durationMonths,
      discountPercentage: plan.discountPercentage,
    };
  } else {
    return {
      isFree: false,
      isDiscounted: false,
      priceMonthlyDirect: monthlyPrice,
      finalTotalPrice: originalTotal,
      durationMonths: plan.durationMonths,
    };
  }
};

const faqData = [
  {
    question: "What’s included in the free plan?",
    answer: "Everything! You get full feature access — just with limits on job openings, contacts, and companies. No credit card needed."
  },
  {
    question: "How are the Pro and Business plans different?",
    answer: "The Pro plan is designed for job seekers with generous limits (100 of each) and a monthly option. The Business plan is for long-term power users, offering much higher limits (500 of each) and an annual subscription for the best value."
  },
  {
    question: "Can I try the features before subscribing?",
    answer: "Yes! Our free plan includes all the core features, so you can explore everything before deciding to upgrade."
  },
  {
    question: "Will my data be saved if I upgrade later?",
    answer: "Absolutely. All your data — job leads, contacts, notes, templates — stays right where you left it."
  },
  {
    question: "Can I cancel my subscription?",
    answer: "Yes. Since our plans are pre-paid for a fixed term (monthly for Pro, annually for Business), they don't auto-renew. You can simply let your plan expire without taking any action."
  },
  {
    question: "What happens when I reach my plan's limits?",
    answer: "We’ll notify you. You can still access and manage all your existing data, but to add more entries, you’ll need to either upgrade your plan or remove some existing data."
  },
  {
    question: "Are payments secure?",
    answer: "Yes. We use trusted payment processors (like Razorpay) and never store your card details ourselves."
  },
  {
    question: "Do you offer refunds?",
    answer: "No, we do not offer refunds once a payment is made. Please use the free tier to ensure the app fits your workflow before upgrading to a paid plan."
  },
  {
    question: "Can I change my plan?",
    answer: "Yes, you can upgrade from the Free plan to either Pro or Business at any time from the billing page. Upgrading from Pro to Business is also possible."
  },
  {
    question: "Is FollowUps only for job seekers?",
    answer: "Not at all. The Pro plan is great for job seekers, but the Business and Enterprise plans are perfect for freelancers, founders, sales reps, and anyone doing structured outreach."
  }
];


export default function PricingPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { currency, getCurrencySymbol } = useCurrency(); // Use currency context

  const handleSelectPlanPublic = (planName: string) => {
    toast({
      title: 'Authentication Required',
      description: 'Please sign up or sign in to select a plan.',
      duration: 5000,
    });
    router.push('/auth?source=pricing');
  };

  const displayedPlans = ALL_AVAILABLE_PLANS.map((plan) => {
    const priceInfo = calculatePublicPlanDisplayInfo(plan, currency);
    const ctaText = plan.publicCtaText;
    let finalButtonVariant: ButtonProps['variant'] = 'secondary';

    if (plan.isPopular) {
      finalButtonVariant = 'default';
    }
    
    return {
      ...plan,
      priceInfo,
      ctaText,
      finalButtonVariant,
    };
  });

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-background to-secondary/10">
      <PublicNavbar activeLink="pricing" />

      <main className="flex-1 py-12 md:py-20">
        <section className="container mx-auto px-[5vw] md:px-[10vw] text-center mb-12 md:mb-16">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tighter mb-6 font-headline text-foreground">
            Pricing That’s a <span className="text-primary">No-Brainer</span>
          </h1>
          <p className="max-w-2xl mx-auto text-md sm:text-lg text-muted-foreground">
            Powerful outreach tools. Transparent pricing. No fluff.
            <br />
            Whether you're just starting out or going all in, FollowUps grows with you.
          </p>
        </section>

        <section className="container mx-auto px-[5vw] md:px-[10vw]">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 items-stretch">
            {displayedPlans.map((plan) => {
              const { priceInfo } = plan;
              const currencySymbol = getCurrencySymbol(currency);
              const displayPricePerMonth = priceInfo.isDiscounted ? priceInfo.discountedPricePerMonth : priceInfo.priceMonthlyDirect;
              const displayFinalPrice = priceInfo.finalTotalPrice;
              return (
                <Card key={plan.id} className={cn(
                    "flex flex-col shadow-xl hover:shadow-2xl transition-shadow duration-300 relative",
                    plan.isPopular ? 'border-primary border-2' : ''
                )}>
                  {plan.isPopular && (
                     <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <div className="bg-primary text-primary-foreground text-xs font-semibold py-1 px-3 rounded-full shadow-md">
                        Most Popular
                        </div>
                    </div>
                  )}
                  <CardHeader className={cn("pb-4")}>
                    <CardTitle className="font-headline text-2xl leading-tight">
                      {plan.displayNameLines.map((line, idx) => <div key={idx}>{line}</div>)}
                    </CardTitle>
                    <CardDescription>{plan.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex-grow space-y-1">
                    <div className="text-4xl font-bold mb-1 min-h-[3rem] flex items-baseline">
                      {priceInfo.isFree ? (
                        "Free"
                      ) : (
                        <div className="flex items-baseline flex-wrap gap-x-1.5">
                          <div className="flex items-baseline">
                             <span className="font-normal" style={{ fontFamily: 'Arial' }}>{currencySymbol}</span>
                             <span className="font-bold">{displayPricePerMonth?.toFixed(1)}</span>
                             <span className="text-base font-normal text-muted-foreground self-end">/mo</span>
                          </div>
                          {priceInfo.isDiscounted && plan.discountPercentage && (
                            <span className="text-sm font-semibold text-green-600">
                              ({plan.discountPercentage}% off)
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                     <p className="text-xs text-muted-foreground min-h-[1.5em]">
                      {!priceInfo.isFree ?
                       ( <>Total: <span className="font-normal" style={{ fontFamily: 'Arial' }}>{currencySymbol}</span><span className="font-bold">{displayFinalPrice?.toFixed(1)}</span> for {priceInfo.durationMonths} month{priceInfo.durationMonths > 1 ? 's' : ''}</> )
                       : "Forever!"
                      }
                    </p>
                    <ul className="space-y-2 text-sm pt-3">
                      {plan.features.map((feature, index) => (
                        <li key={index} className={`flex items-start ${feature.included ? 'text-foreground' : 'text-muted-foreground line-through'}`}>
                          {feature.included ? <Sparkles className="mr-2 h-4 w-4 text-primary flex-shrink-0" /> : <Circle className="mr-2 h-4 w-4 text-muted-foreground flex-shrink-0" />}
                          <span>{feature.text}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                  <CardFooter>
                    <Button
                      className="w-full"
                      onClick={() => handleSelectPlanPublic(plan.name)}
                      variant={plan.finalButtonVariant}
                    >
                      {plan.ctaText}
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
             <Card className="flex flex-col shadow-xl hover:shadow-2xl transition-shadow duration-300 relative border-accent border-2">
                <CardHeader className="pb-4">
                  <CardTitle className="font-headline text-2xl leading-tight">
                    <div>Enterprise</div>
                  </CardTitle>
                  <CardDescription>Custom tools built for power users and growing teams.</CardDescription>
                </CardHeader>
                <CardContent className="flex-grow space-y-1">
                  <p className="text-4xl font-bold mb-1 min-h-[3rem]">Custom</p>
                  <p className="text-xs text-muted-foreground min-h-[1.5em]">Tailored to your needs</p>
                  <ul className="space-y-2 text-sm pt-3">
                      <li className="flex items-start text-foreground"><Sparkles className="mr-2 h-4 w-4 text-primary flex-shrink-0" /><span>Custom limits</span></li>
                      <li className="flex items-start text-foreground"><Sparkles className="mr-2 h-4 w-4 text-primary flex-shrink-0" /><span>Team features</span></li>
                      <li className="flex items-start text-foreground"><Sparkles className="mr-2 h-4 w-4 text-primary flex-shrink-0" /><span>Priority support</span></li>
                      <li className="flex items-start text-foreground"><Sparkles className="mr-2 h-4 w-4 text-primary flex-shrink-0" /><span>Dedicated onboarding</span></li>
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button asChild className="w-full" variant="default">
                    <Link href="/contact">Contact Us</Link>
                  </Button>
                </CardFooter>
              </Card>
          </div>
           <div className="text-center mt-12">
             <p className="text-muted-foreground">Have questions? <Link href="/contact" className="text-primary hover:underline">Contact Us</Link></p>
           </div>
        </section>
        
        {/* FAQ Section Added */}
        <section className="py-16 md:py-24 bg-background">
          <div className="container mx-auto px-[5vw] md:px-[10vw]">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 font-headline text-foreground flex items-center justify-center">
                <HelpCircle className="mr-3 h-8 w-8 text-primary" />
                Frequently Asked Questions
            </h2>
            <div className="max-w-3xl mx-auto">
              <Accordion type="single" collapsible className="w-full">
                {faqData.map((faq, index) => (
                  <AccordionItem value={`item-${index + 1}`} key={index} className="border-b bg-transparent shadow-none rounded-none">
                    <AccordionTrigger className="px-0 py-4 text-left font-semibold text-foreground hover:no-underline">
                      {faq.question}
                    </AccordionTrigger>
                    <AccordionContent className="px-0 pb-4 text-muted-foreground">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </div>
        </section>

      </main>
      <PublicFooter />
      <CurrencySwitcher />
    </div>
  );
}
