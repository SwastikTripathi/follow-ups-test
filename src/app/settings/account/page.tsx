
'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/hooks/use-toast';
import type { UserSettings, UsagePreference, DefaultFollowUpTemplates, FollowUpTemplateContent, ResumeData } from '@/lib/types';
import { Loader2, UserCircle, Settings as SettingsIcon, SlidersHorizontal, MailQuestion, Edit3, ShieldAlert, Trash2, Info, KeyRound, FileText, Link2 } from 'lucide-react';
import type { Json, TablesInsert, TablesUpdate, Database } from '@/lib/database.types';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useRouter } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { useUserSettings } from '@/contexts/UserSettingsContext';
import { useUserDataCache } from '@/contexts/UserDataCacheContext';
import { DEFAULT_FOLLOW_UP_CADENCE_DAYS } from '@/lib/config';
import { ResumeForm, resumeSchema } from './components/ResumeForm';
import { slugify } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';


const USAGE_PREFERENCES: { value: UsagePreference; label: string }[] = [
  { value: 'job_hunt', label: 'Job Hunting / Career Opportunities' },
  { value: 'freelance', label: 'Freelance & Gig Work' },
  { value: 'sales', label: 'Sales & Lead Generation' },
  { value: 'networking', label: 'Professional Networking' },
  { value: 'recruiting', label: 'Recruiting & Talent Sourcing' },
  { value: 'other', label: 'Other / General Prospecting' },
];

const AGE_RANGES = ["Under 18", "18-24", "25-34", "35-44", "45-54", "55-64", "65+"];
const CURRENCIES = ["USD", "EUR", "GBP", "INR", "CAD", "AUD", "Other"];
const defaultIndividualFollowUpTemplate: Omit<FollowUpTemplateContent, 'signature'> = { subject: '', openingLine: '' };
const defaultAllTemplates: DefaultFollowUpTemplates = {
  followUp1: { ...defaultIndividualFollowUpTemplate },
  followUp2: { ...defaultIndividualFollowUpTemplate },
  followUp3: { ...defaultIndividualFollowUpTemplate },
  sharedSignature: '',
};

const DELETE_CONFIRMATION_PHRASE = "DELETE MY ACCOUNT";

const profileSettingsSchema = z.object({
  displayName: z.string().max(100, "Display name cannot exceed 100 characters.").optional(),
  currentRole: z.string().min(1, "Current role is required").max(100, "Role name too long"),
  ageRange: z.string().min(1, "Age range is required"),
  country: z.string().min(1, "Country is required").max(100, "Country name too long"),
  annualIncome: z.coerce.number().min(0, "Income cannot be negative").optional().or(z.literal('')),
  incomeCurrency: z.string().optional(),
});
type ProfileSettingsFormValues = z.infer<typeof profileSettingsSchema>;

const publicProfileSettingsSchema = z.object({
  public_profile_slug: z.string().max(50, 'Slug must be 50 characters or less.')
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug can only contain lowercase letters, numbers, and hyphens.')
    .optional(),
  is_profile_public: z.boolean().default(false),
});
type PublicProfileSettingsFormValues = z.infer<typeof publicProfileSettingsSchema>;

const usageCadenceSettingsSchema = z.object({
  cadenceFu1: z.coerce.number().min(1, "Days must be at least 1").max(90, "Days cannot exceed 90"),
  cadenceFu2: z.coerce.number().min(1, "Days must be at least 1").max(90, "Days cannot exceed 90"),
  cadenceFu3: z.coerce.number().min(1, "Days must be at least 1").max(90, "Days cannot exceed 90"),
}).refine(data => data.cadenceFu2 > data.cadenceFu1 && data.cadenceFu3 > data.cadenceFu2, {
  message: "Follow-up days must be sequential (e.g., FU2 > FU1, FU3 > FU2).",
  path: ["cadenceFu2"],
});
type UsageCadenceSettingsFormValues = z.infer<typeof usageCadenceSettingsSchema>;

const emailTemplatesSchema = z.object({
  defaultEmailTemplates: z.object({
    followUp1: z.object({
      subject: z.string().max(255, "Subject cannot exceed 255 characters.").optional(),
      openingLine: z.string().max(500, "Opening line cannot exceed 500 characters.").optional(),
    }),
    followUp2: z.object({
      subject: z.string().max(255).optional(),
      openingLine: z.string().max(500).optional(),
    }),
    followUp3: z.object({
      subject: z.string().max(255).optional(),
      openingLine: z.string().max(500).optional(),
    }),
    sharedSignature: z.string().max(500, "Signature cannot exceed 500 characters.").optional(),
  }),
});
type EmailTemplatesFormValues = z.infer<typeof emailTemplatesSchema>;

const passwordChangeSchema = z.object({
  newPassword: z.string().min(6, "Password must be at least 6 characters."),
  confirmPassword: z.string(),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "Passwords do not match.",
  path: ["confirmPassword"],
});
type PasswordChangeFormValues = z.infer<typeof passwordChangeSchema>;

type SettingsView = 'profile-details' | 'public-profile' | 'your-resume' | 'usage-preferences' | 'email-customization' | 'security' | 'danger-zone';

// Helper function to ensure all nested properties are defined strings
const sanitizeTemplates = (templates: Json | DefaultFollowUpTemplates | null | undefined): DefaultFollowUpTemplates => {
  const defaults = defaultAllTemplates;
  if (!templates || typeof templates !== 'object' || Array.isArray(templates)) {
    return defaults;
  }
  
  const saneTemplates = templates as DefaultFollowUpTemplates;

  return {
    followUp1: {
      subject: saneTemplates.followUp1?.subject ?? defaults.followUp1.subject,
      openingLine: saneTemplates.followUp1?.openingLine ?? defaults.followUp1.openingLine,
    },
    followUp2: {
      subject: saneTemplates.followUp2?.subject ?? defaults.followUp2.subject,
      openingLine: saneTemplates.followUp2?.openingLine ?? defaults.followUp2.openingLine,
    },
    followUp3: {
      subject: saneTemplates.followUp3?.subject ?? defaults.followUp3.openingLine,
      openingLine: saneTemplates.followUp3?.openingLine ?? defaults.followUp3.openingLine,
    },
    sharedSignature: saneTemplates.sharedSignature ?? defaults.sharedSignature,
  };
};

export default function AccountSettingsPage() {
  const { user: currentUser, isLoadingAuth, initialAuthCheckCompleted } = useAuth();
  const { userSettings, setUserSettings: setGlobalUserSettings, isLoadingSettings, hasFetchedSettingsOnce } = useUserSettings();
  const { updateCachedUserSettings } = useUserDataCache();
  
  const [isSubmitting, setIsSubmitting] = useState<Partial<Record<SettingsView, boolean>>>({});
  const [activeView, setActiveView] = useState<SettingsView>('profile-details');

  const [isPasswordUpdating, setIsPasswordUpdating] = useState(false);
  const [isDeleteStep1Open, setIsDeleteStep1Open] = useState(false);
  const [isDeleteStep2Open, setIsDeleteStep2Open] = useState(false);
  const [deleteConfirmationInput, setDeleteConfirmationInput] = useState('');
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const profileForm = useForm<ProfileSettingsFormValues>({
    resolver: zodResolver(profileSettingsSchema),
  });
  const publicProfileForm = useForm<PublicProfileSettingsFormValues>({
    resolver: zodResolver(publicProfileSettingsSchema),
  });
  const usageCadenceForm = useForm<UsageCadenceSettingsFormValues>({
    resolver: zodResolver(usageCadenceSettingsSchema),
    defaultValues: {
      cadenceFu1: DEFAULT_FOLLOW_UP_CADENCE_DAYS[0],
      cadenceFu2: DEFAULT_FOLLOW_UP_CADENCE_DAYS[1],
      cadenceFu3: DEFAULT_FOLLOW_UP_CADENCE_DAYS[2],
    }
  });
  const emailTemplatesForm = useForm<EmailTemplatesFormValues>({
    resolver: zodResolver(emailTemplatesSchema),
  });
  const passwordForm = useForm<PasswordChangeFormValues>({
    resolver: zodResolver(passwordChangeSchema),
    defaultValues: { newPassword: '', confirmPassword: '' },
  });

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.substring(1) as SettingsView;
      setActiveView(hash || 'profile-details');
    };
    window.addEventListener('hashchange', handleHashChange, false);
    handleHashChange(); 
    return () => window.removeEventListener('hashchange', handleHashChange, false);
  }, []);

  const getSafeStringValue = (value: any) => value || '';
  const getSafeNumberValue = (value: any) => value === null || value === undefined ? '' : value;


  useEffect(() => {
    if (currentUser && hasFetchedSettingsOnce) {
        const profileData = {
            displayName: getSafeStringValue(userSettings?.full_name || currentUser.user_metadata?.full_name),
            currentRole: getSafeStringValue(userSettings?.current_role),
            ageRange: getSafeStringValue(userSettings?.age_range),
            country: getSafeStringValue(userSettings?.country),
            annualIncome: getSafeNumberValue(userSettings?.annual_income),
            incomeCurrency: getSafeStringValue(userSettings?.income_currency),
        };
        profileForm.reset(profileData);
        
        const publicProfileData = {
            public_profile_slug: userSettings?.public_profile_slug || '',
            is_profile_public: userSettings?.is_profile_public || false,
        };
        publicProfileForm.reset(publicProfileData);

        const cadenceDaysSource = userSettings?.follow_up_cadence_days;
        const isValidCadenceArray = Array.isArray(cadenceDaysSource) &&
                                 cadenceDaysSource.length === 3 &&
                                 cadenceDaysSource.every(d => typeof d === 'number');

        const cadenceDays = isValidCadenceArray
            ? (cadenceDaysSource as [number, number, number])
            : DEFAULT_FOLLOW_UP_CADENCE_DAYS;

        const usageData = {
            cadenceFu1: cadenceDays[0],
            cadenceFu2: cadenceDays[1],
            cadenceFu3: cadenceDays[2],
        };
        usageCadenceForm.reset(usageData);

        const emailData = {
            defaultEmailTemplates: sanitizeTemplates(userSettings?.default_email_templates),
        };
        emailTemplatesForm.reset(emailData);
    }
  }, [currentUser, userSettings, isLoadingSettings, hasFetchedSettingsOnce, profileForm, publicProfileForm, usageCadenceForm, emailTemplatesForm]);


  const handleSaveSection = async (section: SettingsView, values: any) => {
    if (!currentUser) {
      toast({ title: 'Not Authenticated', description: 'Please log in.', variant: 'destructive' });
      return;
    }
    setIsSubmitting(prev => ({ ...prev, [section]: true }));
    
    let updatePayload: Partial<TablesUpdate<'user_settings'>> = {};

    switch(section) {
      case 'profile-details':
        const annualIncomeValue = values.annualIncome;
        updatePayload = {
          full_name: values.displayName || null,
          current_role: values.currentRole || null,
          age_range: values.ageRange || null,
          country: values.country || null,
          annual_income: (annualIncomeValue === '' || annualIncomeValue === undefined || annualIncomeValue === null) ? null : Number(annualIncomeValue),
          income_currency: values.incomeCurrency || null,
        };
        if (currentUser.user_metadata?.full_name !== values.displayName) {
            await supabase.auth.updateUser({ data: { full_name: values.displayName || '' } });
        }
        break;
      case 'public-profile':
        updatePayload = {
          public_profile_slug: values.public_profile_slug ? slugify(values.public_profile_slug) : null,
          is_profile_public: values.is_profile_public,
        };
        break;
      case 'usage-preferences':
        updatePayload = {
          follow_up_cadence_days: [values.cadenceFu1, values.cadenceFu2, values.cadenceFu3],
        };
        break;
      case 'email-customization':
        updatePayload = {
          default_email_templates: values.defaultEmailTemplates as unknown as Json,
        };
        break;
      case 'your-resume':
        updatePayload = {
          resume: values as unknown as Json,
        };
        break;
      default:
        toast({title: "Invalid Section", variant: "destructive"});
        setIsSubmitting(prev => ({ ...prev, [section]: false }));
        return;
    }
    
    updatePayload.onboarding_complete = userSettings?.onboarding_complete ?? true;

    try {
      const finalPayload: TablesInsert<'user_settings'> = {
        user_id: currentUser.id,
        how_heard: userSettings?.how_heard || 'Other',
        ...updatePayload, 
      };

      const { data: savedData, error } = await supabase
        .from('user_settings')
        .upsert(finalPayload, { onConflict: 'user_id' })
        .select()
        .single();


      if (error) {
          if (error.code === '23505') { // Unique constraint violation
            throw new Error('This profile URL slug is already taken. Please choose another.');
          }
          throw error;
      }
      toast({ title: 'Settings Updated', description: `Your ${section.replace('-', ' ')} settings have been saved.` });
      if (savedData) {
        setGlobalUserSettings(savedData as UserSettings); 
        updateCachedUserSettings(savedData as UserSettings); 
      }
    } catch (error: any) {
      toast({ title: 'Error Saving Settings', description: error.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(prev => ({ ...prev, [section]: false }));
    }
  };

  const onPasswordSubmit = async (values: PasswordChangeFormValues) => {
    if (!currentUser) {
      toast({ title: 'Not Authenticated', description: 'Please log in.', variant: 'destructive' });
      return;
    }
    setIsPasswordUpdating(true);
    
    try {
      const { error } = await supabase.auth.updateUser({ password: values.newPassword });
      if (error) throw error;
      toast({ title: 'Password Updated', description: 'Your password has been changed successfully.' });
      passwordForm.reset();
      
    } catch (error: any) {
      toast({ title: 'Error Updating Password', description: error.message, variant: 'destructive' });
    } finally {
      setIsPasswordUpdating(false);
    }
  };

  const handleProceedToDeleteStep2 = () => {
    setIsDeleteStep1Open(false);
    setIsDeleteStep2Open(true);
    setDeleteConfirmationInput('');
  };

  const handleConfirmAccountDeletion = async () => {
    if (!currentUser || deleteConfirmationInput !== DELETE_CONFIRMATION_PHRASE) {
      toast({ title: 'Confirmation Failed', description: 'Please type the confirmation phrase correctly.', variant: 'destructive' });
      return;
    }
    setIsDeletingAccount(true);

    const tablesToDeleteFrom: (keyof Database['public']['Tables'])[] = [
        'job_opening_contacts',
        'follow_ups',
        'job_openings',
        'contacts',
        'companies',
        'user_subscriptions',
        'user_settings',
        'posts',
        // 'invoices' is intentionally omitted
    ];

    try {
        const deletePromises = tablesToDeleteFrom.map(table =>
            supabase.from(table).delete().eq('user_id', currentUser.id)
        );

        const results = await Promise.all(deletePromises);

        const failedDeletes = results.filter(res => res.error);

        if (failedDeletes.length > 0) {
            const errorMessages = failedDeletes.map(res => res.error!.message).join('; ');
            throw new Error(`Failed to delete data from some tables: ${errorMessages}`);
        }
        
        toast({ title: 'Account Data Deleted', description: 'All your application data has been deleted. You will be signed out.', duration: 10000 });
        await supabase.auth.signOut();
        
        router.push('/landing');

    } catch (error: any) {
        toast({ title: 'Account Deletion Failed', description: error.message, variant: 'destructive' });
    } finally {
        setIsDeletingAccount(false);
        setIsDeleteStep2Open(false);
        setDeleteConfirmationInput('');
    }
  };


  if (isLoadingAuth || !initialAuthCheckCompleted) {
    
    return <AppLayout><div className="flex justify-center items-center h-64"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div></AppLayout>;
  }
  if (!currentUser) {
    
     return <AppLayout><Card><CardHeader><CardTitle>Access Denied</CardTitle></CardHeader><CardContent><p>Please log in to access account settings.</p><Button asChild className="mt-4"><Link href="/auth">Sign In</Link></Button></CardContent></Card></AppLayout>;
  }

  const showSkeleton = !!((isLoadingSettings && !hasFetchedSettingsOnce) || (isSubmitting[activeView] && !hasFetchedSettingsOnce));


  return (
    <AppLayout>
      <div className="space-y-8">
        <div>
          <h2 className="text-3xl font-bold tracking-tight font-headline flex items-center">
            <SettingsIcon className="mr-3 h-7 w-7 text-primary" />
            Account Settings
          </h2>
          <p className="text-muted-foreground">Manage your profile, preferences, and application settings.</p>
        </div>

        {activeView === 'profile-details' && (
          <Card id="profile-details" className="shadow-lg">
            <Form {...profileForm}>
              <form onSubmit={profileForm.handleSubmit((data) => handleSaveSection('profile-details', data))}>
                <CardHeader>
                  <CardTitle className="font-headline flex items-center"><UserCircle className="mr-2 h-5 w-5 text-primary"/> Profile</CardTitle>
                  <CardDescription>Update your display name and general profile information.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {showSkeleton ? <SkeletonItem label="Display Name" /> : (
                  <FormField control={profileForm.control} name="displayName" render={({ field }) => (
                      <FormItem><FormLabel>Display Name</FormLabel><FormControl><Input placeholder="Your Name" {...field} value={getSafeStringValue(field.value)} disabled={isSubmitting['profile-details']} /></FormControl><FormMessage /></FormItem>)}
                  /> )}
                  {showSkeleton ? <SkeletonItem label="Current Role/Profession" /> : (
                  <FormField control={profileForm.control} name="currentRole" render={({ field }) => (
                      <FormItem><FormLabel>Current Role/Profession</FormLabel><FormControl><Input placeholder="e.g., Software Engineer" {...field} value={getSafeStringValue(field.value)} disabled={isSubmitting['profile-details']} /></FormControl><FormMessage /></FormItem>)}
                  /> )}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {showSkeleton ? <SkeletonItem label="Age Range" type="select" /> : (
                    <FormField control={profileForm.control} name="ageRange" render={({ field }) => (
                        <FormItem><FormLabel>Age Range</FormLabel><Select onValueChange={field.onChange} value={getSafeStringValue(field.value)} disabled={isSubmitting['profile-details']}><FormControl><SelectTrigger><SelectValue placeholder="Select your age range" /></SelectTrigger></FormControl><SelectContent>{AGE_RANGES.map(range => <SelectItem key={range} value={range}>{range}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)}
                    /> )}
                    {showSkeleton ? <SkeletonItem label="Country of Residence" /> : (
                    <FormField control={profileForm.control} name="country" render={({ field }) => (
                        <FormItem><FormLabel>Country of Residence</FormLabel><FormControl><Input placeholder="e.g., United States" {...field} value={getSafeStringValue(field.value)} disabled={isSubmitting['profile-details']} /></FormControl><FormMessage /></FormItem>)}
                    /> )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {showSkeleton ? <SkeletonItem label="Annual Income (Optional)" /> : (
                    <FormField control={profileForm.control} name="annualIncome" render={({ field }) => (
                        <FormItem><FormLabel>Annual Income (Optional)</FormLabel><FormControl><Input type="number" placeholder="e.g., 50000" {...field} value={getSafeNumberValue(field.value)} onChange={e => field.onChange(e.target.value === '' ? '' : parseFloat(e.target.value))} disabled={isSubmitting['profile-details']} /></FormControl><FormMessage /></FormItem>)}
                    /> )}
                    {showSkeleton ? <SkeletonItem label="Income Currency (Optional)" type="select" /> : (
                    <FormField control={profileForm.control} name="incomeCurrency" render={({ field }) => (
                        <FormItem><FormLabel>Income Currency (Optional)</FormLabel><Select onValueChange={field.onChange} value={getSafeStringValue(field.value)} disabled={isSubmitting['profile-details']}><FormControl><SelectTrigger><SelectValue placeholder="Select currency" /></SelectTrigger></FormControl><SelectContent>{CURRENCIES.map(currency => <SelectItem key={currency} value={currency}>{currency}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>)}
                    /> )}
                  </div>
                </CardContent>
                <CardFooter className="justify-end pt-4">
                  <Button type="submit" size="lg" disabled={isSubmitting['profile-details'] || isLoadingSettings}>
                    {(isSubmitting['profile-details'] || isLoadingSettings) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save Profile
                  </Button>
                </CardFooter>
              </form>
            </Form>
          </Card>
        )}
        
        {activeView === 'public-profile' && (
          <Card id="public-profile" className="shadow-lg">
             <Form {...publicProfileForm}>
                <form onSubmit={publicProfileForm.handleSubmit((data) => handleSaveSection('public-profile', data))}>
                    <CardHeader>
                        <CardTitle className="font-headline flex items-center"><Link2 className="mr-2 h-5 w-5 text-primary"/> Public Profile</CardTitle>
                        <CardDescription>Manage your public-facing resume page. Choose a unique URL and set its visibility.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {showSkeleton ? <> <SkeletonItem label="Profile URL Slug" /> <SkeletonItem label="Enable Public Profile" /> </> : (
                        <>
                        <FormField
                            control={publicProfileForm.control}
                            name="public_profile_slug"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>Profile URL Slug</FormLabel>
                                <div className="flex items-center">
                                <span className="text-sm text-muted-foreground bg-muted px-3 py-2 rounded-l-md border border-r-0 border-input">followups.tech/user/</span>
                                <FormControl>
                                    <Input
                                    placeholder="your-unique-slug"
                                    className="rounded-l-none"
                                    {...field}
                                    value={getSafeStringValue(field.value)}
                                    onChange={(e) => field.onChange(slugify(e.target.value))}
                                    disabled={isSubmitting['public-profile'] || isLoadingSettings}
                                    />
                                </FormControl>
                                </div>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                        <FormField
                            control={publicProfileForm.control}
                            name="is_profile_public"
                            render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 shadow-sm">
                                <div className="space-y-0.5">
                                <FormLabel className="text-base">Enable Public Profile</FormLabel>
                                <p className="text-sm text-muted-foreground">
                                    Make your resume visible to anyone with the link.
                                </p>
                                </div>
                                <FormControl>
                                <Switch
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                    disabled={isSubmitting['public-profile'] || isLoadingSettings}
                                />
                                </FormControl>
                            </FormItem>
                            )}
                        />
                        </>
                        )}
                    </CardContent>
                    <CardFooter className="justify-end pt-4">
                        <Button type="submit" size="lg" disabled={isSubmitting['public-profile'] || isLoadingSettings}>
                            {(isSubmitting['public-profile'] || isLoadingSettings) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save Public Profile
                        </Button>
                    </CardFooter>
                </form>
            </Form>
          </Card>
        )}

        {activeView === 'your-resume' && (
           <ResumeForm 
              initialData={userSettings?.resume as ResumeData | null}
              onSave={(data) => handleSaveSection('your-resume', data)}
              isLoading={!!isSubmitting['your-resume'] || isLoadingSettings}
              showSkeleton={!!showSkeleton}
            />
        )}

        {activeView === 'usage-preferences' && (
          <Card id="usage-preferences" className="shadow-lg">
            <Form {...usageCadenceForm}>
              <form onSubmit={usageCadenceForm.handleSubmit((data) => handleSaveSection('usage-preferences', data))}>
                <CardHeader>
                  <CardTitle className="font-headline flex items-center"><SlidersHorizontal className="mr-2 h-5 w-5 text-primary"/> Follow-up Cadence</CardTitle>
                  <CardDescription>Set your default follow-up timings. This will be used to automatically schedule reminders for new leads.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid md:grid-cols-3 gap-4">
                    {showSkeleton ? <> <SkeletonItem label="Follow-up 1 (days)" /> <SkeletonItem label="Follow-up 2 (days)" /> <SkeletonItem label="Follow-up 3 (days)" /> </> : (
                    <>
                    <FormField control={usageCadenceForm.control} name="cadenceFu1" render={({ field }) => (
                        <FormItem><FormLabel>Follow-up 1 (days after initial)</FormLabel><FormControl><Input type="number" min="1" max="90" {...field} disabled={isSubmitting['usage-preferences'] || isLoadingSettings} /></FormControl><FormMessage /></FormItem>)}
                    />
                    <FormField control={usageCadenceForm.control} name="cadenceFu2" render={({ field }) => (
                        <FormItem><FormLabel>Follow-up 2 (days after initial)</FormLabel><FormControl><Input type="number" min="1" max="90" {...field} disabled={isSubmitting['usage-preferences'] || isLoadingSettings} /></FormControl><FormMessage /></FormItem>)}
                    />
                    <FormField control={usageCadenceForm.control} name="cadenceFu3" render={({ field }) => (
                        <FormItem><FormLabel>Follow-up 3 (days after initial)</FormLabel><FormControl><Input type="number" min="1" max="90" {...field} disabled={isSubmitting['usage-preferences'] || isLoadingSettings} /></FormControl><FormMessage /></FormItem>)}
                    />
                    </> )}
                  </div>
                  {usageCadenceForm.formState.errors?.cadenceFu2 && (
                    <p className="text-sm font-medium text-destructive pt-1">{usageCadenceForm.formState.errors.cadenceFu2.message}</p>
                 )}
                </CardContent>
                <CardFooter className="justify-end pt-4">
                  <Button type="submit" size="lg" disabled={isSubmitting['usage-preferences'] || isLoadingSettings}>
                    {(isSubmitting['usage-preferences'] || isLoadingSettings) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save Cadence
                  </Button>
                </CardFooter>
              </form>
            </Form>
          </Card>
        )}

        {activeView === 'email-customization' && (
          <Card id="email-customization" className="shadow-lg">
             <Form {...emailTemplatesForm}>
              <form onSubmit={emailTemplatesForm.handleSubmit((data) => handleSaveSection('email-customization', data))}>
                <CardHeader>
                  <CardTitle className="font-headline flex items-center"><MailQuestion className="mr-2 h-5 w-5 text-primary"/> Default Email Templates</CardTitle>
                  <CardDescription>Set default content for your follow-up emails. These will pre-fill when creating a new lead.</CardDescription>
                </CardHeader>
                <CardContent>
                  {showSkeleton ? <div className="space-y-2"><Skeleton className="h-8 w-full" /><Skeleton className="h-20 w-full" /></div> : (
                  <Accordion type="multiple" className="w-full mb-6">
                    {(['followUp1', 'followUp2', 'followUp3'] as const).map((fuKey, index) => (
                      <AccordionItem value={`item-${index + 1}`} key={fuKey}>
                        <AccordionTrigger className="font-semibold">Default Content for Follow-up {index + 1}</AccordionTrigger>
                        <AccordionContent className="space-y-4 pt-2">
                          <FormField control={emailTemplatesForm.control} name={`defaultEmailTemplates.${fuKey}.subject`} render={({ field }) => (
                              <FormItem><FormLabel>Subject Line</FormLabel><FormControl><Input placeholder={`Subject for Follow-up ${index + 1}`} {...field} value={getSafeStringValue(field.value)} disabled={isSubmitting['email-customization'] || isLoadingSettings} /></FormControl><FormMessage /></FormItem> )}
                          />
                          <FormField control={emailTemplatesForm.control} name={`defaultEmailTemplates.${fuKey}.openingLine`} render={({ field }) => (
                              <FormItem><FormLabel>Opening Line / Main Content</FormLabel><FormControl><Textarea placeholder={`Opening line/body for Follow-up ${index + 1}`} {...field} value={getSafeStringValue(field.value)} rows={3} disabled={isSubmitting['email-customization'] || isLoadingSettings} /></FormControl><FormMessage /></FormItem>)}
                          />
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion> )}
                  {showSkeleton ? <SkeletonItem label="Shared Email Signature" type="textarea" /> : (
                  <FormField control={emailTemplatesForm.control} name="defaultEmailTemplates.sharedSignature" render={({ field }) => (
                      <FormItem><FormLabel className="text-base font-semibold flex items-center"><Edit3 className="mr-2 h-4 w-4 text-muted-foreground" /> Shared Email Signature</FormLabel>
                        <CardDescription className="text-xs mb-2">This signature will be appended to all default follow-up email templates.</CardDescription>
                        <FormControl><Textarea placeholder="Your default signature (e.g., Best regards, Your Name)" {...field} value={getSafeStringValue(field.value)} rows={3} disabled={isSubmitting['email-customization'] || isLoadingSettings}/></FormControl><FormMessage />
                      </FormItem>)}
                  /> )}
                </CardContent>
                <CardFooter className="justify-end pt-4">
                  <Button type="submit" size="lg" disabled={isSubmitting['email-customization'] || isLoadingSettings}>
                    {(isSubmitting['email-customization'] || isLoadingSettings) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save Email Templates
                  </Button>
                </CardFooter>
              </form>
            </Form>
          </Card>
        )}

        {activeView === 'security' && (
          <Card id="security" className="shadow-lg">
            <Form {...passwordForm}>
              <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)}>
                <CardHeader>
                  <CardTitle className="font-headline flex items-center"><KeyRound className="mr-2 h-5 w-5 text-primary"/> Change Password</CardTitle>
                  <CardDescription>Update your account password. Choose a strong, unique password.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {showSkeleton ? <> <SkeletonItem label="New Password" /> <SkeletonItem label="Confirm New Password" /> </> : (
                  <>
                  <FormField control={passwordForm.control} name="newPassword" render={({ field }) => (
                      <FormItem><FormLabel>New Password</FormLabel><FormControl><Input type="password" placeholder="Enter new password" {...field} disabled={isPasswordUpdating || isSubmitting['security'] || isLoadingSettings} /></FormControl><FormMessage /></FormItem> )}
                  />
                  <FormField control={passwordForm.control} name="confirmPassword" render={({ field }) => (
                      <FormItem><FormLabel>Confirm New Password</FormLabel><FormControl><Input type="password" placeholder="Confirm new password" {...field} disabled={isPasswordUpdating || isSubmitting['security'] || isLoadingSettings} /></FormControl><FormMessage /></FormItem>)}
                  />
                  </> )}
                </CardContent>
                <CardFooter className="justify-end pt-4">
                  <Button type="submit" size="lg" disabled={isPasswordUpdating || isSubmitting['security'] || isLoadingSettings}>
                    {(isPasswordUpdating || isLoadingSettings) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Update Password
                  </Button>
                </CardFooter>
              </form>
            </Form>
          </Card>
        )}

        {activeView === 'danger-zone' && (
          <Card id="danger-zone" className="shadow-lg border-destructive">
            <CardHeader>
              <CardTitle className="font-headline flex items-center text-destructive"><ShieldAlert className="mr-2 h-5 w-5"/> Danger Zone</CardTitle>
              <CardDescription className="text-destructive/90">Account deletion is permanent and cannot be undone.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Deleting your account will permanently remove all your associated data, including:
                leads, contacts, companies, follow-up schedules, and email templates. Invoices will be retained for our records.
                <br /><br />
                <strong className="text-destructive">This action is irreversible. Your email address cannot be used to create a new account in the future.</strong>
              </p>
              <Button variant="destructive" onClick={() => setIsDeleteStep1Open(true)} disabled={isDeletingAccount || Object.values(isSubmitting).some(s => s) || isLoadingSettings}>
                {(isDeletingAccount || isLoadingSettings) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Delete My Account
              </Button>
            </CardContent>
          </Card>
        )}

        <AlertDialog open={isDeleteStep1Open} onOpenChange={setIsDeleteStep1Open}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action is irreversible. All your data will be <strong>permanently deleted</strong>.
                <br />
                <strong className="text-destructive mt-2 block">This email address cannot be used to register again.</strong>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setIsDeleteStep1Open(false)}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleProceedToDeleteStep2} className="bg-destructive hover:bg-destructive/90">
                I understand, proceed to delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={isDeleteStep2Open} onOpenChange={setIsDeleteStep2Open}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Final Confirmation Required</AlertDialogTitle>
              <AlertDialogDescription>
                To confirm permanent deletion, please type: <strong className="text-destructive font-mono my-2 block">{DELETE_CONFIRMATION_PHRASE}</strong>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <Input
              type="text"
              value={deleteConfirmationInput}
              onChange={(e) => setDeleteConfirmationInput(e.target.value)}
              placeholder="Type the phrase here"
              className="border-destructive focus-visible:ring-destructive"
            />
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setIsDeleteStep2Open(false)}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmAccountDeletion}
                disabled={deleteConfirmationInput !== DELETE_CONFIRMATION_PHRASE || isDeletingAccount}
                className="bg-destructive hover:bg-destructive/90"
              >
                {isDeletingAccount && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Confirm Permanent Deletion
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AppLayout>
  );
}

const SkeletonItem: React.FC<{label: string, type?: 'input' | 'select' | 'textarea'}> = ({label, type = 'input'}) => (
  <FormItem>
    <FormLabel><Label>{label}</Label></FormLabel>
    <Skeleton className={type === 'textarea' ? "h-20 w-full" : "h-10 w-full"} />
  </FormItem>
);

    