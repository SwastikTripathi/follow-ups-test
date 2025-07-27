
import type { AvailablePlan, SubscriptionTier, PlanFeature, Price } from '@/lib/types';

export const DEFAULT_FOLLOW_UP_CADENCE_DAYS = [7, 14, 21];

export type PlanLimits = {
  companies: number;
  contacts: number;
  jobOpenings: number;
  aiGenerationsPerMonth: number | typeof Infinity;
};

export const PLAN_LIMITS: Record<SubscriptionTier, PlanLimits> = {
  'free': {
    companies: 12,
    contacts: 12,
    jobOpenings: 12,
    aiGenerationsPerMonth: 25,
  },
  'pro': {
    companies: 100,
    contacts: 100,
    jobOpenings: 100,
    aiGenerationsPerMonth: Infinity,
  },
  'business': {
    companies: 500,
    contacts: 500,
    jobOpenings: 500,
    aiGenerationsPerMonth: Infinity,
  },
};

export function getLimitsForTier(tier: SubscriptionTier, isPrivileged: boolean = false): PlanLimits {
  if (isPrivileged) {
    return {
      companies: Infinity,
      contacts: Infinity,
      jobOpenings: Infinity,
      aiGenerationsPerMonth: Infinity,
    };
  }
  return PLAN_LIMITS[tier] || PLAN_LIMITS.free;
}

const commonFeatures: PlanFeature[] = [
  { text: 'Automated follow-up reminders', included: true },
  { text: 'Centralized dashboard overview', included: true },
  { text: 'Full access to our insightful blogs', included: true },
  { text: 'Integrated contact and company management', included: true },
  { text: 'Save your favorite mail templates', included: true },
];

const freeFeatures: PlanFeature[] = [
  { text: `Track up to ${PLAN_LIMITS.free.jobOpenings} leads`, included: true },
  { text: `Manage up to ${PLAN_LIMITS.free.contacts} contacts`, included: true },
  { text: `Store up to ${PLAN_LIMITS.free.companies} companies`, included: true },
  { text: `${PLAN_LIMITS.free.aiGenerationsPerMonth} AI Generations per month`, included: true },
  ...commonFeatures
];

const proFeatures: PlanFeature[] = [
  { text: `Track up to ${PLAN_LIMITS.pro.jobOpenings} leads`, included: true },
  { text: `Manage up to ${PLAN_LIMITS.pro.contacts} contacts`, included: true },
  { text: `Store up to ${PLAN_LIMITS.pro.companies} companies`, included: true },
  { text: 'Unlimited AI Generations', included: true },
  { text: '1 Month Validity', included: true },
  ...commonFeatures
];

const businessFeatures: PlanFeature[] = [
  { text: `Track up to ${PLAN_LIMITS.business.jobOpenings} leads`, included: true },
  { text: `Manage up to ${PLAN_LIMITS.business.contacts} contacts`, included: true },
  { text: `Store up to ${PLAN_LIMITS.business.companies} companies`, included: true },
  { text: 'Unlimited AI Generations', included: true },
  { text: '1 Year Validity', included: true },
  ...commonFeatures
];

export const ALL_AVAILABLE_PLANS: AvailablePlan[] = [
  {
    id: 'free',
    databaseTier: 'free',
    name: 'Free Plan',
    displayNameLines: ["Free Forever!"],
    price: { INR: 0, USD: 0 },
    durationMonths: 12 * 99, // A very long time
    description: 'Ideal for getting started and light outreach management.',
    features: freeFeatures,
    isPopular: false,
    publicCtaText: "Get Started Free",
  },
  {
    id: 'pro-monthly',
    databaseTier: 'pro',
    name: 'Pro Plan',
    displayNameLines: ["Pro Plan"],
    price: { INR: 79, USD: 0.9 },
    durationMonths: 1,
    description: 'Perfect for active job seekers who need more capacity.',
    features: proFeatures,
    isPopular: true,
    publicCtaText: "Where premium meets affordable",
  },
  {
    id: 'business-annual',
    databaseTier: 'business',
    name: 'Business Plan',
    displayNameLines: ["Business Plan"],
    price: { INR: 410.588, USD: 4.8235 },
    durationMonths: 12,
    description: 'Best for freelancers, sales pros, and network builders.',
    features: businessFeatures,
    isPopular: false,
    publicCtaText: "Lock in the savings!",
    discountPercentage: 15,
  },
];

export const OWNER_EMAIL = 'swastiktripathi.space@gmail.com';
