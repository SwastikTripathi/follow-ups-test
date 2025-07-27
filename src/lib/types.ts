

import type { Json } from './database.types';

export interface Company {
  id: string;
  user_id?: string;
  created_at?: string;
  name: string;
  website?: string | null;
  linkedin_url?: string | null;
  notes?: string | null;
  is_favorite?: boolean | null;
}

export interface Contact {
  id: string;
  user_id?: string;
  created_at?: string;
  name: string;
  role?: string | null;
  email: string; // Can be an empty string if other methods are present
  linkedin_url?: string | null;
  phone?: string | null;
  company_id?: string | null;
  company_name_cache?: string | null;
  notes?: string | null;
  tags?: string[] | null;
  is_favorite?: boolean | null;
}

export interface FollowUp {
  id: string;
  job_opening_id: string;
  user_id?: string;
  created_at?: string;
  follow_up_date: Date;
  original_due_date?: Date | null;
  email_subject?: string | null;
  email_body?: string | null;
  status: 'Pending' | 'Sent' | 'Skipped';
}

export interface JobOpeningAssociatedContact {
  contact_id: string;
  name: string;
  email: string; // Can be an empty string if other methods are present
  linkedin_url?: string | null;
  phone?: string | null;
}

export interface InitialEmail {
    subject?: string | null;
    body?: string | null;
}

export interface JobOpening {
  id: string;
  user_id?: string;
  created_at?: string;
  company_id?: string | null;
  company_name_cache: string;
  associated_contacts?: JobOpeningAssociatedContact[];
  role_title: string;
  initial_email_date: Date;
  initial_email?: InitialEmail | null;
  followUps?: FollowUp[];
  status:
    | 'Watching'
    | 'Applied'
    | 'Emailed'
    | 'Followed Up - Once'
    | 'Followed Up - Twice'
    | 'Followed Up - Thrice'
    | 'No Response'
    | 'Replied - Positive'
    | 'Replied - Negative'
    | 'Interviewing'
    | 'Offer'
    | 'Rejected'
    | 'Closed';
  tags?: string[] | null;
  job_description_url?: string | null;
  notes?: string | null;
  is_favorite?: boolean | null;
  favorited_at?: string | Date | null;
}

export type Tag = {
  id: string;
  name: string;
  color?: string;
};

export type Currency = 'INR' | 'USD';
export type Price = Record<Currency, number>;

export type SubscriptionTier = 'free' | 'pro' | 'business';
export type UsagePreference = 'job_hunt' | 'sales' | 'networking' | 'freelance' | 'recruiting' | 'other';
export type SubscriptionStatus = 'active' | 'expired' | 'cancelled' | 'pending_payment' | 'trialing' | 'payment_failed';

export interface UserSubscription {
  id: string;
  user_id: string;
  tier: SubscriptionTier;
  plan_start_date: Date | null;
  plan_expiry_date: Date | null;
  status: SubscriptionStatus;
  razorpay_order_id?: string | null;
  razorpay_payment_id?: string | null;
  razorpay_subscription_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface PlanFeature {
  text: string;
  included: boolean;
}

export interface AvailablePlan {
  id: string;
  databaseTier: SubscriptionTier;
  name: string; // Single string for descriptions, invoices, etc.
  displayNameLines: string[]; // For UI display on cards
  price: Price; // Changed to Price object
  durationMonths: number;
  discountPercentage?: number;
  description: string;
  features: PlanFeature[];
  isPopular?: boolean;
  publicCtaText: string;
}

export interface FollowUpTemplateContent {
  subject: string;
  openingLine: string;
}

export interface DefaultFollowUpTemplates {
  followUp1: FollowUpTemplateContent;
  followUp2: FollowUpTemplateContent;
  followUp3: FollowUpTemplateContent;
  sharedSignature: string;
}

// --- Resume Types ---
export interface ResumeContactInfo {
  name: string;
  email: string;
  phone: string;
  location: string;
  summary?: string;
  // profileImageUrl?: string;
}

export interface ResumeSocials {
    linkedin?: string;
    instagram?: string;
    twitter?: string;
    otherLinks?: string[];
}

export interface ResumeExperience {
  id: string; // For unique key in UI mapping
  company: string;
  role: string;
  description?: string;
  startDate?: Date;
  endDate?: Date | null; // null if current job
  isCurrent: boolean;
  skillsUsed?: string[];
}

export interface ResumeEducation {
  id: string;
  institution: string;
  degree: string;
  field?: string;
  summary?: string;
  startDate?: Date;
  endDate?: Date;
  skillsUsed?: string[];
}

export interface ResumeProject {
  id: string;
  title: string;
  description?: string;
  url?: string;
  endDate?: Date;
  skillsUsed?: string[];
  imageUrls?: string[];
}

export interface ResumeCertificate {
    id: string;
    title: string;
    description?: string;
    date?: Date;
    imageUrls?: string[];
}

export interface ResumeData {
  contactInfo: ResumeContactInfo;
  socials?: ResumeSocials;
  experiences: ResumeExperience[];
  education: ResumeEducation[];
  skills: string[];
  projects: ResumeProject[];
  certificates?: ResumeCertificate[];
}

export interface UserSettings {
  user_id: string;
  full_name?: string | null;
  follow_up_cadence_days: [number, number, number] | null;
  default_email_templates: DefaultFollowUpTemplates | Json;
  created_at?: string;
  // New onboarding fields
  age_range?: string | null;
  country?: string | null;
  annual_income?: number | null;
  income_currency?: string | null;
  current_role?: string | null;
  onboarding_complete?: boolean | null;
  // Fields from new request
  current_management_method?: string[] | null;
  outreach_volume?: string | null;
  gender?: string | null;
  gender_self_describe?: string | null;
  how_heard: string;
  ai_usage_count?: number | null;
  resume?: ResumeData | Json | null;
  public_profile_slug?: string | null;
  is_profile_public?: boolean | null;
}

export interface ContactFormEntry {
  contact_id?: string;
  contactName: string;
  contactEmail?: string;
  linkedin_url?: string;
  phone?: string;
}

export interface InvoiceData {
  invoiceNumber: string;
  invoiceDate: string;
  userName: string;
  userEmail: string;
  planName: string;
  planPrice: number;
  paymentId: string;
  orderId: string;
  companyName: string;
  companyAddress: string;
  companyContact: string;
  companyLogoUrl?: string;
}

export interface InvoiceRecord {
  id?: string;
  user_id: string;
  invoice_number: string;
  invoice_date?: string;
  plan_id: string;
  plan_name: string;
  amount_paid: number;
  currency?: string;
  razorpay_payment_id?: string | null;
  razorpay_order_id?: string | null;
  created_at?: string;
}

// Interface for the full user data cache
export interface AllUserData {
  userSettings: UserSettings | null;
  userSubscription: UserSubscription | null;
  companies: Company[];
  contacts: Contact[];
  jobOpenings: JobOpening[];
  invoices: InvoiceRecord[];
  privilegedEmails?: string[] | null;
}
