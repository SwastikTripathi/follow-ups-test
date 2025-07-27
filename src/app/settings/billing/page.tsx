
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Script from 'next/script';
import { AppLayout } from "@/components/layout/AppLayout";
import { Button, type ButtonProps } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, Circle, Loader2, CreditCard, HelpCircle, AlertTriangle, Sparkles } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import type { User } from '@supabase/supabase-js';
import { useToast } from '@/hooks/use-toast';
import type { UserSubscription, AvailablePlan, SubscriptionTier, InvoiceData, InvoiceRecord, SubscriptionStatus, Currency } from '@/lib/types';
import { createRazorpayOrder, verifyRazorpayPayment } from '@/app/actions/razorpayActions';
import { addMonths, isFuture, format, differenceInDays, startOfDay } from 'date-fns';
import { ALL_AVAILABLE_PLANS } from '@/lib/config';
import { cn } from '@/lib/utils';
import { generateInvoicePdf } from '@/lib/invoiceGenerator';
import { useCurrentSubscription } from '@/hooks/use-current-subscription';
import Link from 'next/link';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useUserDataCache } from '@/contexts/UserDataCacheContext';
import { useAuth } from '@/contexts/AuthContext';
import { AskForNameDialog } from '@/components/AskForNameDialog';
import { useCurrency } from '@/contexts/CurrencyContext'; // Import the currency hook
import { CurrencySwitcher } from '@/components/CurrencySwitcher'; // Import the switcher


const NEXT_PUBLIC_RAZORPAY_KEY_ID = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;

interface PlanDisplayInfo {
  isFree: boolean;
  isDiscounted: boolean;
  originalTotalPrice?: number;
  discountedPricePerMonth?: number;
  finalTotalPrice: number;
  priceMonthlyDirect?: number;
  durationMonths: number;
  discountPercentage?: number;
}

interface PendingInvoiceContext {
  plan: AvailablePlan;
  paymentId: string;
  orderId: string;
  finalAmountPaid: number;
  invoiceNumber: string;
}

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


export default function BillingPage() {
  const { user: currentUser } = useAuth();
  const {
    currentSubscription,
    subscriptionLoading,
    effectiveTierForLimits,
    actualUserTier,
    isInGracePeriod,
    daysLeftInGracePeriod,
    isPrivilegedUser,
    refetchSubscription,
  } = useCurrentSubscription();
  const { addCachedInvoice, updateCachedUserSubscription, updateCachedUserSettings, cachedData } = useUserDataCache();
  const { currency, getCurrencySymbol } = useCurrency();


  const [isLoadingAuthAndInitialSub, setIsLoadingAuthAndInitialSub] = useState(true);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [processingPlanId, setProcessingPlanId] = useState<string | null>(null);

  const [isAskNameDialogOpen, setIsAskNameDialogOpen] = useState(false);
  const [pendingInvoiceContext, setPendingInvoiceContext] = useState<PendingInvoiceContext | null>(null);

  const { toast } = useToast();

  const tierHierarchy: Record<SubscriptionTier, number> = { free: 0, pro: 1, business: 2 };

  useEffect(() => {
    if (!NEXT_PUBLIC_RAZORPAY_KEY_ID) {
        toast({
            title: "Razorpay Misconfiguration",
            description: "Razorpay Key ID is not properly set up. Payments may not function.",
            variant: "destructive",
            duration: 10000,
        });
    }
    setIsLoadingAuthAndInitialSub(subscriptionLoading);
  }, [toast, subscriptionLoading]);


  const calculatePlanDisplayInfo = (plan: AvailablePlan, selectedCurrency: Currency): PlanDisplayInfo => {
    if (plan.databaseTier === 'free') {
      return {
        isFree: true,
        isDiscounted: false,
        finalTotalPrice: 0,
        durationMonths: plan.durationMonths,
      };
    }

    const monthlyPrice = plan.price[selectedCurrency];
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

  const proceedToGenerateInvoiceAndSaveRecord = async (
    userNameForInvoice: string,
    context: PendingInvoiceContext
  ) => {
    if (!currentUser || !context) return;
    
    const { plan, paymentId, orderId, finalAmountPaid, invoiceNumber } = context;

    const yourCompanyName = "FollowUps";
    const yourCompanyAddress = "";
    const yourCompanyContact = "followups.contact@gmail.com";
    const yourCompanyLogoUrl = "https://res.cloudinary.com/dzxh5okyq/image/upload/v1751702473/followups-logo-circle_koctmf.png";

    const invoiceData: InvoiceData = {
      invoiceNumber: invoiceNumber,
      invoiceDate: format(new Date(), 'PPP'),
      userName: userNameForInvoice,
      userEmail: currentUser?.email || 'N/A',
      planName: plan.name,
      planPrice: finalAmountPaid,
      paymentId: paymentId,
      orderId: orderId,
      companyName: yourCompanyName,
      companyAddress: yourCompanyAddress,
      companyContact: yourCompanyContact,
      companyLogoUrl: yourCompanyLogoUrl,
    };

    try {
      generateInvoicePdf(invoiceData);
      
    } catch (pdfError: any) {
      toast({
        title: 'Invoice PDF Generation Failed',
        description: `Could not generate PDF: ${pdfError.message}. Your subscription is active. Please contact support for an invoice.`,
        variant: 'destructive',
        duration: 10000,
      });
    }

    const invoiceRecord: InvoiceRecord = {
      user_id: currentUser.id,
      invoice_number: invoiceNumber,
      plan_id: plan.id,
      plan_name: plan.name,
      amount_paid: finalAmountPaid,
      currency: currency,
      razorpay_payment_id: paymentId,
      razorpay_order_id: orderId,
      invoice_date: format(new Date(), 'yyyy-MM-dd'),
    };

    try {
      const { data: savedInvoice, error: dbError } = await supabase.from('invoices').insert(invoiceRecord).select().single();
      if (dbError) {
        throw dbError;
      }
      if (savedInvoice) {
        
        addCachedInvoice({
            ...savedInvoice,
            invoice_date: format(new Date(savedInvoice.invoice_date), 'PPP'),
            created_at: savedInvoice.created_at,
        });
      }
      toast({
        title: 'Invoice Record Saved',
        description: 'Your invoice details have been saved to our records.',
        duration: 5000,
      });
    } catch (saveError: any) {
      toast({
        title: 'Failed to Save Invoice Record',
        description: `PDF generated, but failed to save record: ${saveError.message}. Please contact support if you need this record.`,
        variant: 'destructive',
        duration: 10000,
      });
    }
  };

  const handleNameSubmittedForInvoice = async (submittedName: string) => {
    if (!currentUser || !pendingInvoiceContext) {
      toast({ title: 'Error', description: 'User or payment context missing.', variant: 'destructive' });
      setIsAskNameDialogOpen(false);
      return;
    }
    
    await proceedToGenerateInvoiceAndSaveRecord(submittedName, pendingInvoiceContext);

    setIsAskNameDialogOpen(false);
    setPendingInvoiceContext(null);
  };


  const handleSuccessfulPaymentAndSubscription = async (
    plan: AvailablePlan,
    paymentId: string,
    orderId: string,
    finalAmountPaid: number
  ) => {
    if (!currentUser) return;
    
    await refetchSubscription();

    const invoiceNumber = `INV-${format(new Date(), 'yyyyMMdd')}-${orderId.slice(-6)}`;

    setPendingInvoiceContext({ plan, paymentId, orderId, finalAmountPaid, invoiceNumber });
    setIsAskNameDialogOpen(true);
    toast({
        title: 'Payment Confirmed!',
        description: 'Please confirm the name for your invoice.',
        duration: 7000,
    });
  };

  const handleSelectPlan = async (plan: AvailablePlan) => {
    if (!currentUser) {
      toast({ title: 'Not Logged In', description: 'Please log in to select a plan.', variant: 'destructive'});
      return;
    }
    
    if(currency !== 'INR') {
        toast({ title: 'Payment Info', description: 'Currently, we only support payments in INR. Please switch your currency to proceed.', variant: 'default', duration: 7000 });
        return;
    }

    setProcessingPlanId(plan.id);
    setIsProcessingPayment(true);
    
    try {
      let newStartDate: Date;
      let newExpiryDate: Date;

      const isUserCurrentlyOnActivePremium =
        (actualUserTier === 'pro' || actualUserTier === 'business') &&
        currentSubscription &&
        currentSubscription.plan_expiry_date &&
        isFuture(new Date(currentSubscription.plan_expiry_date));

      if ((plan.databaseTier === 'pro' || plan.databaseTier === 'business') && isUserCurrentlyOnActivePremium && currentSubscription?.plan_expiry_date) {
        newStartDate = new Date(currentSubscription.plan_start_date || new Date());
        newExpiryDate = addMonths(new Date(currentSubscription.plan_expiry_date), plan.durationMonths);
      } else {
        newStartDate = new Date();
        newExpiryDate = addMonths(newStartDate, plan.durationMonths);
      }

      if (plan.databaseTier === 'free') {
        const { data: upsertedSub, error: upsertError } = await supabase
          .from('user_subscriptions')
          .upsert({
            user_id: currentUser.id,
            tier: 'free',
            plan_start_date: newStartDate.toISOString(),
            plan_expiry_date: newExpiryDate.toISOString(),
            status: 'active' as SubscriptionStatus,
            razorpay_order_id: null,
            razorpay_payment_id: null,
          }, { onConflict: 'user_id' })
          .select()
          .single();

        if (upsertError) throw new Error(upsertError.message || 'Failed to activate free plan.');
        toast({ title: 'Plan Activated!', description: `You are now on the ${plan.name}.` });
        if (upsertedSub) {
            updateCachedUserSubscription({
                ...upsertedSub,
                tier: upsertedSub.tier as SubscriptionTier,
                status: upsertedSub.status as SubscriptionStatus,
                plan_start_date: upsertedSub.plan_start_date ? new Date(upsertedSub.plan_start_date) : null,
                plan_expiry_date: upsertedSub.plan_expiry_date ? new Date(upsertedSub.plan_expiry_date) : null,
            });
        }
      } else {
        if (!NEXT_PUBLIC_RAZORPAY_KEY_ID) {
            throw new Error("Razorpay Key ID is not configured. Payment cannot proceed.");
        }
        
        const priceInfo = calculatePlanDisplayInfo(plan, currency);
        const finalAmountForPayment = priceInfo.finalTotalPrice;

        const orderPayload = {
          amount: Math.round(finalAmountForPayment * 100),
          currency: currency,
          receipt: `pf_${plan.id}_${Date.now()}`,
          notes: {
            purchaseOptionId: plan.id,
            mapsToDbTier: plan.databaseTier,
            userId: currentUser.id,
            userName: currentUser.user_metadata?.full_name || currentUser.email || 'User',
            userEmail: currentUser.email || 'N/A',
            durationMonths: plan.durationMonths
          }
        };
        const orderData = await createRazorpayOrder(orderPayload);
        
        if (!orderData || orderData.error || !orderData.order_id) {
          throw new Error(orderData?.error || 'Failed to create Razorpay order.');
        }

        const options = {
          key: NEXT_PUBLIC_RAZORPAY_KEY_ID,
          amount: orderData.amount,
          currency: orderData.currency,
          name: "FollowUps",
          description: `${plan.name}`,
          order_id: orderData.order_id,
          handler: async function (response: any) {
            setProcessingPlanId(plan.id);
            setIsProcessingPayment(true);
            
            try {
              const verificationResult = await verifyRazorpayPayment({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              });

              if (verificationResult.success) {
                const { data: upsertedSub, error: upsertError } = await supabase
                  .from('user_subscriptions')
                  .upsert({
                    user_id: currentUser!.id,
                    tier: plan.databaseTier,
                    plan_start_date: newStartDate.toISOString(),
                    plan_expiry_date: newExpiryDate.toISOString(),
                    status: 'active' as SubscriptionStatus,
                    razorpay_order_id: response.razorpay_order_id,
                    razorpay_payment_id: response.razorpay_payment_id,
                  }, { onConflict: 'user_id' })
                  .select()
                  .single();

                 if (upsertError) throw new Error(upsertError.message || 'Failed to update subscription after payment.');
                if (upsertedSub) {
                    updateCachedUserSubscription({
                        ...upsertedSub,
                        tier: upsertedSub.tier as SubscriptionTier,
                        status: upsertedSub.status as SubscriptionStatus,
                        plan_start_date: upsertedSub.plan_start_date ? new Date(upsertedSub.plan_start_date) : null,
                        plan_expiry_date: upsertedSub.plan_expiry_date ? new Date(upsertedSub.plan_expiry_date) : null,
                    });
                }
                await handleSuccessfulPaymentAndSubscription(plan, response.razorpay_payment_id, response.razorpay_order_id, finalAmountForPayment);
              } else {
                toast({ title: 'Payment Verification Failed', description: verificationResult.error || 'Please contact support.', variant: 'destructive' });
              }
            } catch (handlerError: any) {
               toast({ title: 'Error Updating Subscription', description: handlerError.message || 'Could not update your subscription after payment.', variant: 'destructive' });
            } finally {
                setIsProcessingPayment(false);
                setProcessingPlanId(null);
            }
          },
          prefill: {
            name: currentUser.user_metadata?.full_name || currentUser.email,
            email: currentUser.email,
          },
          theme: {
            color: "#673AB7"
          },
          modal: {
            ondismiss: function() {
              setIsProcessingPayment(false);
              setProcessingPlanId(null);
            }
          }
        };
        // @ts-ignore
        const rzp = new window.Razorpay(options);
        rzp.on('payment.failed', function (response: any){
            toast({
                title: 'Payment Failed',
                description: `Code: ${response.error.code}, Reason: ${response.error.description || response.error.reason}`,
                variant: 'destructive'
            });
            setIsProcessingPayment(false);
            setProcessingPlanId(null);
        });
        
        rzp.open();
        return;
      }
    } catch (error: any) {
      toast({ title: 'Error Processing Plan', description: error.message || 'Could not process your request.', variant: 'destructive' });
    }
    setIsProcessingPayment(false);
    setProcessingPlanId(null);
  };

  const displayedPlans = ALL_AVAILABLE_PLANS.map((plan) => {
    const priceInfo = calculatePlanDisplayInfo(plan, currency);
    const isCurrentlySelectedProcessing = processingPlanId === plan.id && isProcessingPayment;

    let ctaButtonContent: React.ReactNode = plan.publicCtaText;
    let finalButtonIsDisabled = isCurrentlySelectedProcessing || subscriptionLoading || isLoadingAuthAndInitialSub;
    let finalButtonVariant: ButtonProps['variant'] = (plan.isPopular) ? 'default' : 'secondary';
    
    if (isPrivilegedUser) {
        finalButtonIsDisabled = true;
        ctaButtonContent = "Diamond User";
        finalButtonVariant = 'outline';
    } else {
        const userTierValue = tierHierarchy[actualUserTier];
        const planTierValue = tierHierarchy[plan.databaseTier];
        
        const isUpgrade = planTierValue > userTierValue;
        const isSameLevel = planTierValue === userTierValue;
        const isDowngrade = planTierValue < userTierValue;

        if (plan.databaseTier === 'free') {
            if (actualUserTier === 'free') {
                finalButtonIsDisabled = true;
                ctaButtonContent = "Current Plan";
            } else {
                finalButtonIsDisabled = true;
                ctaButtonContent = "Better Plan Active";
            }
            finalButtonVariant = 'outline';
        } else {
            const currentExpiry = currentSubscription?.plan_expiry_date;
            if (currentExpiry && isFuture(new Date(currentExpiry))) {
                const potentialNewExpiry = addMonths(new Date(currentExpiry), plan.durationMonths);
                const daysFromNow = differenceInDays(potentialNewExpiry, new Date());

                if (daysFromNow > 365 * 1.5) {
                    finalButtonIsDisabled = true;
                    ctaButtonContent = "Extension limit reached";
                    finalButtonVariant = 'outline';
                }
            }
            
            if (isUpgrade && !finalButtonIsDisabled) {
                ctaButtonContent = plan.publicCtaText;
            } else if (isSameLevel && !finalButtonIsDisabled) {
                ctaButtonContent = "Extend Subscription";
            } else if (isDowngrade && !finalButtonIsDisabled) {
                const daysUntilExpiry = currentSubscription?.plan_expiry_date
                  ? differenceInDays(new Date(currentSubscription.plan_expiry_date), startOfDay(new Date()))
                  : Infinity;
                
                if (daysUntilExpiry <= 7) {
                    ctaButtonContent = `Downgrade to ${plan.displayNameLines[0]}`;
                } else {
                    finalButtonIsDisabled = true;
                    ctaButtonContent = "Better Plan Active";
                    finalButtonVariant = 'outline';
                }
            }
        }
    }
    
    if (isCurrentlySelectedProcessing) {
      finalButtonIsDisabled = true;
    }

    return {
      ...plan,
      priceInfo,
      finalButtonIsDisabled,
      ctaButtonContent,
      finalButtonVariant,
    };
  });

  let currentPlanCardTitle = "N/A";
  let currentPlanCardStatus = "N/A";
  let currentPlanCardContent: React.ReactNode = null;

  if (!isLoadingAuthAndInitialSub) {
    if ((actualUserTier === 'pro' || actualUserTier === 'business') && currentSubscription?.status === 'active' && currentSubscription.plan_expiry_date && isFuture(new Date(currentSubscription.plan_expiry_date))) {
        currentPlanCardTitle = actualUserTier === 'pro' ? "Pro Plan" : "Business Plan";
        currentPlanCardStatus = "Active";
        currentPlanCardContent = (
            <>
            {currentSubscription.plan_start_date && (
                <p>Valid From: {format(new Date(currentSubscription.plan_start_date), 'PPP')}</p>
            )}
            {currentSubscription.plan_expiry_date && (
                <p>Valid Until: {format(new Date(currentSubscription.plan_expiry_date), 'PPP')}</p>
            )}
            {currentSubscription.razorpay_order_id && (
                <p className="text-xs text-muted-foreground mt-1">Last Order ID: {currentSubscription.razorpay_order_id}</p>
            )}
            </>
        );
    } else {
        currentPlanCardTitle = "Free Tier";
        if (isInGracePeriod) {
            currentPlanCardStatus = "Grace Period";
            currentPlanCardContent = (
            <div className="text-sm text-destructive space-y-1 bg-destructive/10 p-3 rounded-md border border-destructive/20">
                <div className="flex items-center font-semibold">
                <AlertTriangle className="mr-2 h-4 w-4" />
                Paid Plan Ended
                </div>
                <p>
                You have {daysLeftInGracePeriod} day{daysLeftInGracePeriod !== 1 ? 's' : ''} remaining in your grace period.
                </p>
                <p>
                Please renew your subscription or manage your data to fit Free Tier limits.
                </p>
                <p className="text-xs">
                After this period, data exceeding Free Tier limits may be automatically removed.
                </p>
            </div>
            );
        } else {
            currentPlanCardStatus = "Active";
            currentPlanCardContent = (
            <p className="text-sm text-muted-foreground">
                You are currently on the Free Tier. Upgrade for more features and higher limits.
            </p>
            );
        }
    }
  }
  

  if (isLoadingAuthAndInitialSub) {
    return (
      <AppLayout>
        <div className="flex justify-center items-center h-full">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
      <div className="space-y-8">
        <div>
          <h2 className="text-3xl font-bold tracking-tight font-headline flex items-center">
            <CreditCard className="mr-3 h-7 w-7 text-primary" />
            Billing & Plan
          </h2>
          <p className="text-muted-foreground">Manage your subscription and billing details.</p>
        </div>

        {(isLoadingAuthAndInitialSub || subscriptionLoading) && !currentSubscription ? (
             <Card className="shadow-lg">
                <CardHeader><CardTitle className="font-headline text-xl text-primary">Loading current plan...</CardTitle></CardHeader>
                <CardContent><Loader2 className="h-6 w-6 animate-spin text-primary" /></CardContent>
             </Card>
        ): (
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="font-headline text-xl text-primary">Your Current Plan: {currentPlanCardTitle}</CardTitle>
              <CardDescription>
                  Status: <span className={`font-semibold ${
                      currentPlanCardStatus === 'Active' ? 'text-green-600'
                      : (currentPlanCardStatus === 'Cancelled' || currentPlanCardStatus === 'Expired' || currentPlanCardStatus === 'Grace Period') ? 'text-red-600'
                      : 'text-muted-foreground'
                  }`}>
                  {currentPlanCardStatus}
                  </span>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {currentPlanCardContent}
            </CardContent>
          </Card>
        )}

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
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
                   : "No cost at all"
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
                  onClick={() => handleSelectPlan(plan)}
                  disabled={plan.finalButtonIsDisabled}
                  variant={plan.finalButtonVariant}
                >
                  {(isProcessingPayment && processingPlanId === plan.id) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {plan.ctaButtonContent}
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
         <Card className="shadow-md">
            <CardHeader>
                <CardTitle className="font-headline flex items-center">
                    <HelpCircle className="mr-2 h-5 w-5 text-primary"/>Frequently Asked Questions
                </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground space-y-2">
                <Accordion type="single" collapsible className="w-full">
                {faqData.map((faq, index) => (
                  <AccordionItem value={`item-${index + 1}`} key={index} className="border-b bg-transparent shadow-none rounded-none first:border-t">
                    <AccordionTrigger className="px-0 py-3 text-left font-semibold text-foreground hover:no-underline text-sm">
                      {faq.question}
                    </AccordionTrigger>
                    <AccordionContent className="px-0 pb-3 text-muted-foreground text-sm">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
        </Card>
      </div>
      {currentUser && (
        <AskForNameDialog
          isOpen={isAskNameDialogOpen}
          onOpenChange={setIsAskNameDialogOpen}
          onSubmitName={handleNameSubmittedForInvoice}
          currentName={currentUser.user_metadata?.full_name}
          currentEmail={currentUser.email}
        />
      )}
      <CurrencySwitcher />
    </AppLayout>
  );
}
