
'use client';

import React, { useState, useEffect, useMemo, useCallback, Suspense } from 'react';
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PlusCircle, Search as SearchIcon, Briefcase as BriefcaseIconLucide, Trash2, XCircle, Loader2, Star, HelpCircle, Wand2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { JobOpening, Company, Contact, FollowUp, UserSettings, DefaultFollowUpTemplates, SubscriptionTier, ResumeData, InitialEmail } from '@/lib/types';
import { AddLeadDialog } from './components/AddLeadDialog';
import type { AddLeadFormValues, EditLeadFormValues } from './components/shared/leadSchemas';
import { EditLeadDialog } from './components/EditLeadDialog';
import { LeadList } from './components/LeadList';
import { LeadCard } from './components/LeadCard';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle as ShadAlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

import { useToast } from '@/hooks/use-toast';
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { supabase } from '@/lib/supabaseClient';
import { isToday, isValid, startOfDay, isBefore } from 'date-fns';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { useCurrentSubscription } from '@/hooks/use-current-subscription';
import { useAuth } from '@/contexts/AuthContext';
import { useCounts } from '@/contexts/CountsContext';
import { useUserSettings } from '@/contexts/UserSettingsContext';
import { useUserDataCache } from '@/contexts/UserDataCacheContext';
import { LeadsHelpModal } from '@/app/leads/components/LeadsHelpModal';
import { DEFAULT_FOLLOW_UP_CADENCE_DAYS } from '@/lib/config';
import { useGeminiApiKey } from '@/hooks/useGeminiApiKey';
import { ApiKeyDialog } from './components/ApiKeyDialog';
import { GenerateLeadFromJDDialog } from './components/GenerateLeadFromJDDialog';


type SortOptionValue = 'nextFollowUpDate_asc' | 'initialEmailDate_desc' | 'initialEmailDate_asc';

const SORT_OPTIONS: { value: SortOptionValue; label: string }[] = [
  { value: 'nextFollowUpDate_asc', label: 'Next Follow-up Date (Earliest First)' },
  { value: 'initialEmailDate_desc', label: 'Initial Email Date (Newest First)' },
  { value: 'initialEmailDate_asc', label: 'Initial Email Date (Oldest First)' },
];

const emailingCycleStatuses: JobOpening['status'][] = ['Emailed', 'Followed Up - Once', 'Followed Up - Twice', 'Followed Up - Thrice'];

async function determineNewLeadStatusOnServer(
  leadId: string,
  currentLeadStatus: JobOpening['status'],
  userId: string
): Promise<JobOpening['status'] | null> {
  if (!emailingCycleStatuses.includes(currentLeadStatus)) {
    return null;
  }
  const { data: followUps, error: followUpsError } = await supabase
    .from('follow_ups')
    .select('status, created_at, original_due_date')
    .eq('job_opening_id', leadId)
    .eq('user_id', userId)
    .order('original_due_date', { ascending: true, nullsFirst: true });
  if (followUpsError) return null;
  if (!followUps || followUps.length === 0) return 'Emailed';
  const sentFollowUpsCount = followUps.filter(fu => fu.status === 'Sent').length;
  if (sentFollowUpsCount === 0) return 'Emailed';
  if (sentFollowUpsCount === 1) return 'Followed Up - Once';
  if (sentFollowUpsCount === 2) return 'Followed Up - Twice';
  if (sentFollowUpsCount >= 3) return 'Followed Up - Thrice';
  return currentLeadStatus;
}

const TutorialStepDialog = ({ isOpen, onOpenChange }: { isOpen: boolean, onOpenChange: (open: boolean) => void }) => (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle className="font-headline text-xl">The Add Lead Form</DialogTitle>
                <DialogDescription>
                    This is where you can add all the details about your new lead.
                </DialogDescription>
            </DialogHeader>
            <div className="text-sm space-y-2 py-2">
                <p>Here you can:</p>
                <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                    <li>Enter the company and role title.</li>
                    <li>Link one or more contacts.</li>
                    <li>Set the initial outreach date.</li>
                    <li>Draft your initial email and follow-up templates.</li>
                    <li>Add any relevant notes or links.</li>
                </ul>
                <p className="pt-2">When you're done, just click "Add Lead" to save it.</p>
            </div>
        </DialogContent>
    </Dialog>
);


function LeadsPageContent() {
  const router = useRouter();
  const { user: currentUser, isLoadingAuth: isLoadingUserAuth, initialAuthCheckCompleted } = useAuth();
  const { counts: globalCounts, incrementCount, decrementCount } = useCounts();
  const { userSettings } = useUserSettings();
  const { cachedData, isLoadingCache, initialCacheLoadAttempted, updateCachedJobOpening, removeCachedJobOpening, addCachedJobOpening, addCachedCompany, addCachedContact, updateCachedContact } = useUserDataCache();

  const [jobOpenings, setJobOpenings] = useState<JobOpening[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);

  const [searchTerm, setSearchTerm] = useState('');
  const [searchInNotes, setSearchInNotes] = useState(true);
  const [sortOption, setSortOption] = useState<SortOptionValue>('nextFollowUpDate_asc');
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false);

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<JobOpening | null>(null);
  const [leadToDelete, setLeadToDelete] = useState<JobOpening | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [addDialogPrefill, setAddDialogPrefill] = useState<Partial<AddLeadFormValues> | undefined>(undefined);
  const [isGenerateLeadFromJDOpen, setIsGenerateLeadFromJDOpen] = useState(false);

  const [isTutorialStepOpen, setIsTutorialStepOpen] = useState(false);


  const { toast } = useToast();
  const searchParams = useSearchParams();
  const [focusedLead, setFocusedLead] = useState<JobOpening | null>(null);
  const focusedLeadIdFromUrl = searchParams?.get('view');
  
  const { apiKey, setApiKey, isLoaded: isApiKeyLoaded } = useGeminiApiKey();
  const [isApiKeyDialogOpen, setIsApiKeyDialogOpen] = useState(false);

  const {
    effectiveLimits,
    isInGracePeriod,
    subscriptionLoading,
  } = useCurrentSubscription();

  useEffect(() => {
    if (initialAuthCheckCompleted && currentUser) {
      if (!isLoadingCache && initialCacheLoadAttempted && cachedData) {
        setJobOpenings(cachedData.jobOpenings || []);
        setCompanies(cachedData.companies || []);
        setContacts(cachedData.contacts || []);
      }
    } else if (initialAuthCheckCompleted && !currentUser) {
      setJobOpenings([]);
      setCompanies([]);
      setContacts([]);
    }
  }, [currentUser, initialAuthCheckCompleted, isLoadingCache, initialCacheLoadAttempted, cachedData]);

  useEffect(() => {
    const isTutorialNextStep = searchParams?.get('tutorialStep') === 'add-lead-form';
    if (isTutorialNextStep) {
        setIsTutorialStepOpen(true);
        // Clean up URL
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.delete('tutorialStep');
        router.replace(newUrl.pathname + newUrl.search, { scroll: false });
    }
  }, [searchParams, router]);


  const handleAddWithAIClick = () => {
    if (!isApiKeyLoaded) return;
    if (!apiKey) {
      setIsApiKeyDialogOpen(true);
    } else {
      setIsGenerateLeadFromJDOpen(true);
    }
  };
  
  const handleApiKeySubmitted = (newApiKey: string) => {
    setApiKey(newApiKey);
    setIsApiKeyDialogOpen(false);
    toast({ title: 'API Key Saved!', description: 'Your key is saved. You can now use AI features.'});
    // Now open the AI dialog
    setIsGenerateLeadFromJDOpen(true);
  };

  const handleLeadGeneratedFromAI = (prefillData: Partial<AddLeadFormValues>) => {
    setAddDialogPrefill({
        ...prefillData,
        notes: '', // Ensure notes field is blank
    });
    setIsAddDialogOpen(true);
  };

  const handleAddLeadClick = useCallback(() => {
    if (!currentUser || subscriptionLoading || isLoadingUserAuth || !initialAuthCheckCompleted) {
      return;
    }
    if (globalCounts.jobOpenings >= effectiveLimits.jobOpenings) {
      let message = `You have reached the limit of ${effectiveLimits.jobOpenings} leads for your current plan.`;
      if (isInGracePeriod && effectiveLimits.jobOpenings < Infinity) {
        message = `Your premium plan has expired, and you've reached the Free Tier limit of ${effectiveLimits.jobOpenings} leads. Please renew or manage your data.`;
      } else if (effectiveLimits.jobOpenings < Infinity) {
         message = `You've reached the limit of ${effectiveLimits.jobOpenings} leads for your Premium plan.`;
      }
      toast({ title: 'Limit Reached', description: message, variant: 'destructive' });
      return;
    }
    setAddDialogPrefill(undefined); // Clear any old prefill data
    setIsAddDialogOpen(true);
  }, [currentUser, subscriptionLoading, effectiveLimits, globalCounts.jobOpenings, toast, isInGracePeriod, setIsAddDialogOpen, isLoadingUserAuth, initialAuthCheckCompleted]);

  useEffect(() => {
    const newParam = searchParams?.get('new');
    if (newParam === 'true' && currentUser && !isLoadingUserAuth && initialAuthCheckCompleted) {
      handleAddLeadClick();
      if (typeof window !== "undefined") {
        router.replace('/leads', { scroll: false });
      }
    }
  }, [searchParams, currentUser, router, handleAddLeadClick, isLoadingUserAuth, initialAuthCheckCompleted]);


  useEffect(() => {
    if (focusedLeadIdFromUrl && jobOpenings.length > 0) {
      const leadToFocus = jobOpenings.find(op => op.id === focusedLeadIdFromUrl);
      setFocusedLead(leadToFocus || null);
    } else if (!focusedLeadIdFromUrl) {
      setFocusedLead(null);
    }
  }, [focusedLeadIdFromUrl, jobOpenings]);

  const handleCloseFocusedLeadDialog = () => {
    setFocusedLead(null);
    router.replace('/leads', { scroll: false });
  };
  
  const handleAddNewCompanyToListSupabase = async (companyName: string): Promise<Company | null> => {
    if (!currentUser) return null;
    const trimmedName = companyName.trim();
    if (!trimmedName) { toast({ title: 'Validation Error', description: 'Company name empty.', variant: 'destructive'}); return null; }

    const existingCompany = companies.find(c => c.name.toLowerCase() === trimmedName.toLowerCase() && c.user_id === currentUser.id);
    if (existingCompany) return existingCompany;

    const rpcPayload = { p_user_id: currentUser.id, p_name: trimmedName, p_is_favorite: false };
    const { data: newCompanyId, error } = await supabase.rpc('create_or_update_company', rpcPayload);

    if (error || !newCompanyId) {
        toast({ title: 'Error Adding Company', description: error?.message || "Failed to get company ID.", variant: 'destructive' }); return null;
    }

    const newCompanyForCache: Company = {
        id: newCompanyId,
        user_id: currentUser.id,
        name: trimmedName,
        is_favorite: false,
        created_at: new Date().toISOString(),
    };
    addCachedCompany(newCompanyForCache);
    incrementCount('companies');
    return newCompanyForCache;
  };

  const handleAddNewContactToListSupabase = async (contactName: string, contactEmail?: string, companyId?: string, companyNameCache?: string, linkedinUrl?: string, phone?: string): Promise<Contact | null> => {
    if (!currentUser) return null;
    const trimmedName = contactName.trim();
    const trimmedEmail = contactEmail?.trim() || null;
    const trimmedLinkedin = linkedinUrl?.trim() || null;
    const trimmedPhone = phone?.trim() || null;
    
    if (!trimmedName) { 
        toast({ title: 'Validation Error', description: 'Contact name is required.', variant: 'destructive'}); 
        return null; 
    }
    if (!trimmedEmail && !trimmedLinkedin && !trimmedPhone) {
        toast({ title: 'Validation Error', description: 'At least one of email, LinkedIn, or phone is required.', variant: 'destructive'});
        return null;
    }

    let existingContact: Contact | undefined;
    if (trimmedEmail) {
        existingContact = contacts.find(c => c.email && c.email.toLowerCase() === trimmedEmail.toLowerCase() && c.user_id === currentUser.id);
        if(existingContact) return existingContact;
    }

    const rpcPayload = { 
        p_user_id: currentUser.id, 
        p_name: trimmedName, 
        p_email: trimmedEmail,
        p_linkedin_url: trimmedLinkedin,
        p_phone: trimmedPhone,
        p_company_id: companyId || null, 
        p_company_name: companyNameCache || null, 
        p_is_favorite: false 
    };
    const { data: newContactId, error } = await supabase.rpc('create_or_update_contact_with_company', rpcPayload);


    if (error || !newContactId) {
        toast({ title: 'Error Adding Contact', description: error?.message || "Failed to get contact ID.", variant: 'destructive' }); return null;
    }

    const newContactForCache: Contact = {
        id: newContactId,
        user_id: currentUser.id,
        name: trimmedName,
        email: trimmedEmail || '',
        linkedin_url: trimmedLinkedin,
        phone: trimmedPhone,
        company_id: companyId || null,
        company_name_cache: companyNameCache || (companyId ? companies.find(c=>c.id === companyId)?.name : null),
        tags: [],
        is_favorite: false,
        created_at: new Date().toISOString(),
    };
    addCachedContact(newContactForCache);
    incrementCount('contacts');
    return newContactForCache;
  };

  const updateModifiedContacts = async (contactFormEntries: { contact_id?: string; contactName: string; contactEmail?: string; linkedin_url?: string; phone?: string; }[]) => {
    if (!currentUser || !cachedData?.contacts) return;
  
    for (const formContact of contactFormEntries) {
      if (formContact.contact_id) {
        const originalContact = cachedData.contacts.find(c => c.id === formContact.contact_id);
        if (!originalContact) continue;
  
        const wasModified =
          originalContact.name !== formContact.contactName ||
          originalContact.email !== (formContact.contactEmail || '') ||
          originalContact.linkedin_url !== (formContact.linkedin_url || null) ||
          originalContact.phone !== (formContact.phone || null);
  
        if (wasModified) {
          const rpcPayload = {
            p_user_id: currentUser.id,
            p_contact_id: formContact.contact_id,
            p_name: formContact.contactName,
            p_email: formContact.contactEmail || null,
            p_linkedin_url: formContact.linkedin_url || null,
            p_phone: formContact.phone || null,
            p_company_id: originalContact.company_id || null,
            p_company_name: originalContact.company_name_cache || null,
            p_is_favorite: originalContact.is_favorite || false,
          };
  
          const { data: updatedId, error } = await supabase.rpc('create_or_update_contact_with_company', rpcPayload);
          if (error) {
              toast({ title: `Error updating contact ${formContact.contactName}`, description: error.message, variant: 'destructive' });
          } else if (updatedId) {
              const updatedContactForCache = {
                ...originalContact,
                id: updatedId,
                name: formContact.contactName,
                email: formContact.contactEmail || '',
                linkedin_url: formContact.linkedin_url || null,
                phone: formContact.phone || null,
              };
              updateCachedContact(updatedContactForCache);
              toast({ title: 'Contact Updated', description: `${formContact.contactName}'s details were updated.`});
          }
        }
      }
    }
  };

  const handleAddLead = async (values: AddLeadFormValues) => {
    if (!currentUser) {
        toast({ title: 'Authentication Error', description: 'You must be logged in.', variant: 'destructive' });
        return;
    }
    if (globalCounts.jobOpenings >= effectiveLimits.jobOpenings) {
        toast({ title: 'Limit Reached', description: `Cannot add. Lead limit reached.`, variant: 'destructive' });
        setIsAddDialogOpen(false);
        return;
    }

    await updateModifiedContacts(values.contacts);

    const contactInputs = values.contacts.map(c => ({
        id: c.contact_id || null,
        name: c.contactName,
        email: c.contactEmail || null,
        linkedin_url: c.linkedin_url || null,
        phone: c.phone || null,
    }));

    const followUpInputs = [
        { subject: values.followUp1.subject || null, body: values.followUp1.body || null, due_days_offset: (userSettings?.follow_up_cadence_days as [number, number, number] | null)?.[0] ?? DEFAULT_FOLLOW_UP_CADENCE_DAYS[0] },
        { subject: values.followUp2.subject || null, body: values.followUp2.body || null, due_days_offset: (userSettings?.follow_up_cadence_days as [number, number, number] | null)?.[1] ?? DEFAULT_FOLLOW_UP_CADENCE_DAYS[1] },
        { subject: values.followUp3.subject || null, body: values.followUp3.body || null, due_days_offset: (userSettings?.follow_up_cadence_days as [number, number, number] | null)?.[2] ?? DEFAULT_FOLLOW_UP_CADENCE_DAYS[2] },
    ].filter(fu => fu.due_days_offset != null);

    const rpcPayload = {
      p_user_id: currentUser.id,
      p_company_name: values.companyName,
      p_role_title: values.roleTitle,
      p_initial_email_date: values.initialEmailDate.toISOString(),
      p_initial_email: values.initialEmail, // Pass the new field
      p_job_description_url: values.jobDescriptionUrl || null,
      p_notes: values.notes || null,
      p_is_favorite: false, 
      p_contact_inputs: contactInputs,
      p_follow_up_inputs: followUpInputs,
    };

    setIsAddDialogOpen(false);

    try {
        const { data: newJobOpeningId, error: rpcError } = await supabase.rpc('create_full_job_opening', rpcPayload);
        
        if (rpcError) throw rpcError;

        if (newJobOpeningId && typeof newJobOpeningId === 'string') {
            const { data: fetchedOpening, error: fetchError } = await supabase
                .from('job_openings')
                .select('*, associated_contacts:job_opening_contacts(contact:contacts(*)), followUps:follow_ups(*)')
                .eq('id', newJobOpeningId)
                .single();

            if (fetchError) {
                toast({ title: 'Cache Sync Error', description: `Could not fetch new lead details: ${fetchError.message}`, variant: 'destructive' });
            } else if (fetchedOpening) {
                const transformedOpening: JobOpening = {
                    ...fetchedOpening,
                    initial_email: fetchedOpening.initial_email as InitialEmail | null,
                    status: fetchedOpening.status as JobOpening['status'],
                    tags: fetchedOpening.tags as string[] | null,
                    initial_email_date: startOfDay(new Date(fetchedOpening.initial_email_date)),
                    favorited_at: fetchedOpening.favorited_at ? new Date(fetchedOpening.favorited_at) : null,
                    associated_contacts: (fetchedOpening.associated_contacts as any[] || []).map(joc => ({
                        contact_id: joc.contact.id, name: joc.contact.name, email: joc.contact.email,
                        linkedin_url: joc.contact.linkedin_url, phone: joc.contact.phone,
                    })),
                    followUps: (fetchedOpening.followUps || []).map(fu => ({
                        ...fu,
                        status: fu.status as FollowUp['status'],
                        follow_up_date: fu.follow_up_date ? startOfDay(new Date(fu.follow_up_date)) : new Date(),
                        original_due_date: fu.original_due_date ? startOfDay(new Date(fu.original_due_date)) : null,
                    })),
                };
                addCachedJobOpening(transformedOpening);
                incrementCount('jobOpenings');
                
                if (transformedOpening.company_id) {
                    const companyExists = companies.some(c => c.id === transformedOpening.company_id);
                    if (!companyExists) await handleAddNewCompanyToListSupabase(transformedOpening.company_name_cache);
                }
                for (const assocContact of transformedOpening.associated_contacts || []) {
                    const contactExists = contacts.some(c => c.id === assocContact.contact_id);
                    if (!contactExists) {
                        const fullContactDetails = (fetchedOpening.associated_contacts as any[]).find(joc => joc.contact.id === assocContact.contact_id)?.contact;
                        if(fullContactDetails) {
                            addCachedContact(fullContactDetails);
                            incrementCount('contacts');
                        }
                    }
                }
            }
            toast({ title: "Lead Added", description: `${values.roleTitle} has been added.` });
        } else {
             toast({ title: 'Save Error', description: `Failed to create lead. Please check logs.`, variant: 'destructive' });
        }
    } catch (error: any) {
        toast({ title: 'Error Adding Lead', description: error.message || 'An unexpected error occurred.', variant: 'destructive' });
    }
  };

  const handleEditLead = (lead: JobOpening) => {
    setEditingLead(lead);
    setIsEditDialogOpen(true);
  };

  const handleUpdateLead = async (formValues: EditLeadFormValues, leadId: string) => {
    if (!currentUser || !leadId) {
        toast({ title: 'Authentication Error', description: 'User not found or lead ID missing.', variant: 'destructive' });
        return;
    }
    const originalLead = jobOpenings.find(jo => jo.id === leadId);
    if (!originalLead) {
      toast({title: "Error", description: "Original lead not found for update.", variant: "destructive"});
      return;
    }

    await updateModifiedContacts(formValues.contacts);

    const contactInputs = formValues.contacts.map(c => ({
      id: c.contact_id || null,
      name: c.contactName,
      email: c.contactEmail || null,
      linkedin_url: c.linkedin_url || null,
      phone: c.phone || null,
    }));

    const followUpInputs = [
      { subject: formValues.followUp1.subject || null, body: formValues.followUp1.body || null, due_days_offset: (userSettings?.follow_up_cadence_days as [number, number, number] | null)?.[0] ?? DEFAULT_FOLLOW_UP_CADENCE_DAYS[0] },
      { subject: formValues.followUp2.subject || null, body: formValues.followUp2.body || null, due_days_offset: (userSettings?.follow_up_cadence_days as [number, number, number] | null)?.[1] ?? DEFAULT_FOLLOW_UP_CADENCE_DAYS[1] },
      { subject: formValues.followUp3.subject || null, body: formValues.followUp3.body || null, due_days_offset: (userSettings?.follow_up_cadence_days as [number, number, number] | null)?.[2] ?? DEFAULT_FOLLOW_UP_CADENCE_DAYS[2] },
    ].filter(fu => fu.due_days_offset != null); 

    const rpcPayload = {
        p_user_id: currentUser.id,
        p_job_opening_id: leadId,
        p_company_name: formValues.companyName,
        p_company_id: formValues.company_id || null,
        p_role_title: formValues.roleTitle,
        p_initial_email_date: formValues.initialEmailDate.toISOString(),
        p_initial_email: formValues.initialEmail, // Pass the new field
        p_status: formValues.status,
        p_job_description_url: formValues.jobDescriptionUrl || null,
        p_notes: formValues.notes || null,
        p_is_favorite: originalLead.is_favorite || false,
        p_contact_inputs: contactInputs,
        p_follow_up_inputs: followUpInputs,
    };

    setIsEditDialogOpen(false);
    setEditingLead(null);

    try {
      const { data: updatedJobOpeningId, error: rpcError } = await supabase.rpc('update_new_job_opening', rpcPayload);
      
      if (rpcError) throw rpcError;

      if (updatedJobOpeningId && typeof updatedJobOpeningId === 'string' && updatedJobOpeningId === leadId) {
          const { data: fetchedOpening, error: fetchError } = await supabase
            .from('job_openings')
            .select('*, associated_contacts:job_opening_contacts(contact:contacts(*)), followUps:follow_ups(*)')
            .eq('id', updatedJobOpeningId)
            .single();

        if (fetchError) {
             toast({ title: 'Cache Sync Error', description: `Could not fetch updated lead details: ${fetchError.message}`, variant: 'destructive' });
        } else if (fetchedOpening) {
            const transformedOpening: JobOpening = {
                ...fetchedOpening,
                initial_email: fetchedOpening.initial_email as InitialEmail | null,
                status: fetchedOpening.status as JobOpening['status'],
                tags: fetchedOpening.tags as string[] | null,
                initial_email_date: startOfDay(new Date(fetchedOpening.initial_email_date)),
                favorited_at: fetchedOpening.favorited_at ? new Date(fetchedOpening.favorited_at) : null,
                associated_contacts: (fetchedOpening.associated_contacts as any[] || []).map(joc => ({
                    contact_id: joc.contact.id, name: joc.contact.name, email: joc.contact.email,
                    linkedin_url: joc.contact.linkedin_url, phone: joc.contact.phone,
                })),
                followUps: (fetchedOpening.followUps || []).map(fu => ({
                    ...fu,
                    status: fu.status as FollowUp['status'],
                    follow_up_date: fu.follow_up_date ? startOfDay(new Date(fu.follow_up_date)) : new Date(),
                    original_due_date: fu.original_due_date ? startOfDay(new Date(fu.original_due_date)) : null,
                })),
            };
            updateCachedJobOpening(transformedOpening);
            if (focusedLead && focusedLead.id === leadId) {
              setFocusedLead(transformedOpening);
            }
             // Sync related entities
            if (transformedOpening.company_id && !companies.some(c => c.id === transformedOpening.company_id)) {
                await handleAddNewCompanyToListSupabase(transformedOpening.company_name_cache);
            }
            for (const assocContact of transformedOpening.associated_contacts || []) {
                const contactInCache = contacts.find(c => c.id === assocContact.contact_id);
                if (!contactInCache) {
                    const fullContactDetails = (fetchedOpening.associated_contacts as any[]).find(joc => joc.contact.id === assocContact.contact_id)?.contact;
                    if(fullContactDetails) {
                        addCachedContact(fullContactDetails);
                        incrementCount('contacts');
                    }
                } else if (contactInCache.phone !== assocContact.phone || contactInCache.linkedin_url !== assocContact.linkedin_url) {
                    const fullContactDetails = (fetchedOpening.associated_contacts as any[]).find(joc => joc.contact.id === assocContact.contact_id)?.contact;
                    if (fullContactDetails) updateCachedContact(fullContactDetails);
                }
            }
        }
        toast({ title: "Lead Updated", description: `${formValues.roleTitle} has been updated.`});
      } else {
          toast({title: 'Update Error', description: 'Failed to confirm lead update.', variant: 'destructive'});
      }
    } catch (error: any) {
      toast({ title: 'Error Updating Lead', description: error.message, variant: 'destructive'});
    }
  };

  const handleLogFollowUp = async (followUpId: string, leadId: string) => {
    if (!currentUser) return;
    try {
        const { data: loggedFollowUp, error: logError } = await supabase.from('follow_ups').update({ status: 'Sent', follow_up_date: startOfDay(new Date()).toISOString() }).eq('id', followUpId).eq('user_id', currentUser.id).select().single();
        if (logError) throw logError;

        if (loggedFollowUp) {
            toast({title: 'Follow-up Logged!', description: 'Status updated to Sent.'});
            const currentLead = jobOpenings.find(jo => jo.id === leadId);
            const newStatus = currentLead ? await determineNewLeadStatusOnServer(leadId, currentLead.status as JobOpening['status'], currentUser.id) : null;

            let updatedLeadForCache: JobOpening | undefined;
            setJobOpenings(prev => prev.map(jo => {
                if (jo.id === leadId) {
                    const updatedFollowUps = (jo.followUps || []).map(fu => fu.id === followUpId ? { ...fu, status: 'Sent' as FollowUp['status'], follow_up_date: startOfDay(new Date()) } : fu);
                    const updatedOpening = { ...jo, followUps: updatedFollowUps, status: (newStatus && newStatus !== jo.status) ? newStatus : jo.status };
                    updatedLeadForCache = updatedOpening;
                    if (focusedLead && focusedLead.id === leadId) {
                        setFocusedLead(updatedOpening);
                    }
                    return updatedOpening;
                }
                return jo;
            }));
            if (updatedLeadForCache) {
              updateCachedJobOpening(updatedLeadForCache);
            }

             if (newStatus && currentLead && newStatus !== currentLead.status) {
                await supabase.from('job_openings').update({ status: newStatus }).eq('id', leadId).eq('user_id', currentUser.id);
            }
        }
    } catch (error: any) { toast({title: 'Error Logging Follow-up', description: error.message, variant: 'destructive'}); }
  };

  const handleUnlogFollowUp = useCallback(async (followUpIdToUnlog: string, leadId: string) => {
    if (!currentUser) return;
    try {
      const { data: followUpToUnlog, error: fetchFollowUpError } = await supabase.from('follow_ups').select('original_due_date').eq('id', followUpIdToUnlog).eq('user_id', currentUser.id).single();
      if (fetchFollowUpError || !followUpToUnlog || !followUpToUnlog.original_due_date) { toast({ title: 'Error Unlogging', description: 'Original due date not found.', variant: 'destructive' }); return; }
      const revertedDueDate = startOfDay(new Date(followUpToUnlog.original_due_date));
      const { error: updateError } = await supabase.from('follow_ups').update({ status: 'Pending', follow_up_date: revertedDueDate.toISOString() }).eq('id', followUpIdToUnlog).eq('user_id', currentUser.id);
      if (updateError) throw updateError;

      toast({ title: 'Follow-up Unlogged', description: 'Reverted to pending.' });
      const currentLead = jobOpenings.find(jo => jo.id === leadId);
      const newStatus = currentLead ? await determineNewLeadStatusOnServer(leadId, currentLead.status as JobOpening['status'], currentUser.id) : null;

      let updatedLeadForCache: JobOpening | undefined;
      setJobOpenings(prev => prev.map(jo => {
        if (jo.id === leadId) {
            const updatedFollowUps = (jo.followUps || []).map(fu => fu.id === followUpIdToUnlog ? { ...fu, status: 'Pending' as FollowUp['status'], follow_up_date: revertedDueDate } : fu);
            const updatedOpening = { ...jo, followUps: updatedFollowUps, status: (newStatus && newStatus !== jo.status) ? newStatus : jo.status };
            updatedLeadForCache = updatedOpening;
             if (focusedLead && focusedLead.id === leadId) {
                setFocusedLead(updatedOpening);
            }
            return updatedOpening;
        }
        return jo;
      }));
      if (updatedLeadForCache) {
        updateCachedJobOpening(updatedLeadForCache);
      }

      if (newStatus && currentLead && newStatus !== currentLead.status) {
         await supabase.from('job_openings').update({ status: newStatus }).eq('id', leadId).eq('user_id', currentUser.id);
      }
    } catch (error: any) { toast({ title: 'Error Unlogging Follow-up', description: error.message, variant: 'destructive' }); }
  }, [currentUser, toast, jobOpenings, focusedLead, updateCachedJobOpening]);

  const handleInitiateDeleteLead = (lead: JobOpening) => {
    setLeadToDelete(lead); setIsEditDialogOpen(false); setIsDeleteConfirmOpen(true);
  };

  const handleConfirmDeleteLead = async () => {
    if (!leadToDelete || !currentUser) return;
    try {
      const { error: jobOpeningError } = await supabase.from('job_openings').delete().eq('id', leadToDelete.id).eq('user_id', currentUser.id);
      if (jobOpeningError) throw jobOpeningError;

      removeCachedJobOpening(leadToDelete.id);
      decrementCount('jobOpenings');
      toast({ title: "Lead Deleted", description: `${leadToDelete.role_title} removed.`});
    } catch (error: any) { toast({ title: 'Error Deleting Lead', description: error.message, variant: 'destructive'});
    } finally { setLeadToDelete(null); setIsDeleteConfirmOpen(false); }
  };

  const handleToggleFavorite = async (leadId: string, currentIsFavorite: boolean) => {
    if (!currentUser) return;
    const newIsFavorite = !currentIsFavorite;
    const { data: updatedData, error } = await supabase
      .from('job_openings')
      .update({ is_favorite: newIsFavorite, favorited_at: newIsFavorite ? new Date().toISOString() : null })
      .eq('id', leadId)
      .eq('user_id', currentUser.id)
      .select('*, associated_contacts:job_opening_contacts(contact:contacts(*)), followUps:follow_ups(*)')
      .single();

    if (error) { toast({ title: 'Error Toggling Favorite', description: error.message, variant: 'destructive' }); return; }

    if (updatedData) {
        const transformedOpening: JobOpening = {
            ...updatedData,
            status: updatedData.status as JobOpening['status'],
            tags: updatedData.tags as string[] | null,
            initial_email: updatedData.initial_email as InitialEmail | null,
            initial_email_date: startOfDay(new Date(updatedData.initial_email_date)),
            favorited_at: updatedData.favorited_at ? new Date(updatedData.favorited_at) : null,
            associated_contacts: (updatedData.associated_contacts as any[] || []).map(joc => ({
                contact_id: joc.contact.id,
                name: joc.contact?.name || 'Unknown Name',
                email: joc.contact?.email || '',
                linkedin_url: joc.contact?.linkedin_url || null,
                phone: joc.contact?.phone || null,
            })),
            followUps: (updatedData.followUps || []).map(fu => ({...fu, status: fu.status as FollowUp['status'], follow_up_date: startOfDay(new Date(fu.follow_up_date)), original_due_date: fu.original_due_date ? startOfDay(new Date(fu.original_due_date)) : null})),
        };
        updateCachedJobOpening(transformedOpening);

        if (focusedLead && focusedLead.id === leadId) {
            setFocusedLead(transformedOpening);
        }
        toast({ title: newIsFavorite ? 'Added to Favorites' : 'Removed from Favorites'});
    }
  };

  const { actionRequiredLeads, otherLeads, allFilteredAndSortedLeads } = useMemo(() => {
    let filtered = [...jobOpenings];
    if (showOnlyFavorites) filtered = filtered.filter(lead => lead.is_favorite);
    if (searchTerm) {
        filtered = filtered.filter(lead => {
        const term = searchTerm.toLowerCase();
        return (lead.company_name_cache || '').toLowerCase().includes(term) ||
               (lead.role_title || '').toLowerCase().includes(term) ||
               lead.associated_contacts?.some(ac => (ac.name || '').toLowerCase().includes(term) || (ac.email || '').toLowerCase().includes(term)) ||
               (lead.status || '').toLowerCase().includes(term) ||
               (searchInNotes && lead.notes && lead.notes.toLowerCase().includes(term));
        });
    }
    const getNextPendingFollowUpDate = (lead: JobOpening): Date | null => {
      const pendingFollowUps = (lead.followUps || []).filter(fu => fu.status === 'Pending' && isValid(fu.follow_up_date)).sort((a, b) => a.follow_up_date.getTime() - b.follow_up_date.getTime());
      return pendingFollowUps.length > 0 ? pendingFollowUps[0].follow_up_date : null;
    };
    switch (sortOption) {
      case 'initialEmailDate_desc': filtered.sort((a, b) => new Date(b.initial_email_date).getTime() - new Date(a.initial_email_date).getTime()); break;
      case 'initialEmailDate_asc': filtered.sort((a, b) => new Date(a.initial_email_date).getTime() - new Date(b.initial_email_date).getTime()); break;
      case 'nextFollowUpDate_asc':
        filtered.sort((a, b) => {
          const nextA = getNextPendingFollowUpDate(a); const nextB = getNextPendingFollowUpDate(b);
          if (nextA && !nextB) return -1; if (!nextA && nextB) return 1;
          if (!nextA && !nextB) return new Date(b.initial_email_date).getTime() - new Date(a.initial_email_date).getTime();
          return nextA!.getTime() - nextB!.getTime();
        });
        break;
      default: filtered.sort((a, b) => new Date(b.initial_email_date).getTime() - new Date(a.initial_email_date).getTime());
    }
    if (sortOption === 'nextFollowUpDate_asc') {
      const todayStart = startOfDay(new Date());
      const actionReq: JobOpening[] = []; const othersArr: JobOpening[] = [];
      filtered.forEach(lead => {
        const nextFollowUpDate = getNextPendingFollowUpDate(lead);
        if (nextFollowUpDate && isValid(nextFollowUpDate)) {
          const followUpDayStart = startOfDay(nextFollowUpDate);
          if (isToday(followUpDayStart) || isBefore(followUpDayStart, todayStart)) actionReq.push(lead);
          else othersArr.push(lead);
        } else othersArr.push(lead);
      });
      return { actionRequiredLeads: actionReq, otherLeads: othersArr, allFilteredAndSortedLeads: [] };
    }
    return { actionRequiredLeads: [], otherLeads: [], allFilteredAndSortedLeads: filtered };
  }, [jobOpenings, searchTerm, searchInNotes, sortOption, showOnlyFavorites]);

  const clearSearch = () => setSearchTerm('');
  const isAddButtonDisabled = !currentUser || isLoadingCache || subscriptionLoading || (isInGracePeriod && effectiveLimits.jobOpenings < Infinity && globalCounts.jobOpenings >= effectiveLimits.jobOpenings) || isLoadingUserAuth;
  
  if (isLoadingUserAuth || !initialAuthCheckCompleted) {
    return (<AppLayout><div className="flex justify-center items-center h-64"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div></AppLayout>);
  }

  const pageContentLoading = isLoadingCache && !initialCacheLoadAttempted;

  return (
    <AppLayout>
      <div className="space-y-6" id="leads-main-content-area">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight font-headline">Leads</h2>
            <p className="text-muted-foreground">Manage your sales leads and follow-ups.</p>
          </div>
          <div className="flex gap-2">
             <Button variant="outline" onClick={handleAddWithAIClick} disabled={isAddButtonDisabled || !isApiKeyLoaded}>
                { !isApiKeyLoaded ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" /> }
                Add with AI
             </Button>
            <Button onClick={handleAddLeadClick} disabled={isAddButtonDisabled} id="add-new-lead-button">
                <PlusCircle className="mr-2 h-4 w-4" /> Add New Lead
            </Button>
            <Button variant="outline" size="icon" className="rounded-full hover:bg-background hover:text-foreground hidden sm:inline-flex" onClick={() => setIsHelpModalOpen(true)} disabled={!currentUser || isLoadingUserAuth}>
                <HelpCircle className="h-5 w-5" />
                <span className="sr-only">Help</span>
            </Button>
          </div>
        </div>

         <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 items-center">
          <div className="relative flex items-center w-full border border-input rounded-md shadow-sm bg-background sm:col-span-2 md:col-span-1 lg:col-span-2">
            <SearchIcon className="absolute left-3 h-4 w-4 text-muted-foreground" />
            <Input id="leads-search-input" data-tutorial-target="leads-search-input" type="text" placeholder="Search leads..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 pr-3 py-2 h-10 flex-grow border-none focus:ring-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0" disabled={!currentUser || pageContentLoading || subscriptionLoading} />
            {searchTerm && ( <Button variant="ghost" size="icon" className="absolute right-28 mr-1 h-7 w-7 hover:bg-transparent focus-visible:bg-transparent hover:text-primary" onClick={clearSearch}> <XCircle className="h-4 w-4 text-muted-foreground group-hover:text-primary" /> </Button> )}
            <div className="flex items-center space-x-2 pr-3 border-l border-input h-full pl-3">
              <Checkbox id="searchLeadNotes" checked={searchInNotes} onCheckedChange={(checked) => setSearchInNotes(checked as boolean)} className="h-4 w-4" disabled={!currentUser || pageContentLoading || subscriptionLoading} />
              <Label htmlFor="searchLeadNotes" className="text-xs text-muted-foreground whitespace-nowrap">Include Notes</Label>
            </div>
          </div>
          <Select value={sortOption} onValueChange={(value) => setSortOption(value as SortOptionValue)} disabled={!currentUser || pageContentLoading || subscriptionLoading}>
            <SelectTrigger className="w-full" id="leads-sort-trigger"><SelectValue placeholder="Sort by..." /></SelectTrigger>
            <SelectContent>{SORT_OPTIONS.map(option => (<SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>))}</SelectContent>
          </Select>
           <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => setShowOnlyFavorites(!showOnlyFavorites)} disabled={!currentUser || pageContentLoading || subscriptionLoading} title={showOnlyFavorites ? "Show All Leads" : "Show Only Favorites"} className={cn("hover:bg-background h-10 w-10", showOnlyFavorites ? "text-yellow-500 bg-background" : "hover:text-muted-foreground")}>
              <Star className={cn("h-5 w-5", showOnlyFavorites ? "fill-yellow-400 text-yellow-500" : "text-muted-foreground")} /> <span className="sr-only">{showOnlyFavorites ? "Show All" : "Show Favorites"}</span>
            </Button>
          </div>
        </div>

        {pageContentLoading ? (
          <div className="flex justify-center items-center py-10"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>
        ) : !currentUser ? (
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="font-headline flex items-center"> <BriefcaseIconLucide className="mr-2 h-5 w-5 text-primary" /> Please Sign In </CardTitle>
            </CardHeader>
            <CardContent> <p className="text-muted-foreground"> You need to be signed in to view and manage leads. </p> </CardContent>
          </Card>
        ) : (allFilteredAndSortedLeads.length === 0 && actionRequiredLeads.length === 0 && otherLeads.length === 0) && !focusedLead ? (
          <Card className="shadow-lg"><CardHeader><CardTitle className="font-headline flex items-center"><BriefcaseIconLucide className="mr-2 h-5 w-5 text-primary" />
            {showOnlyFavorites ? "No Favorite Leads Match Filters" : searchTerm ? "No Leads Match Your Search" :
             jobOpenings.length === 0 && initialCacheLoadAttempted ? "No Leads Yet" :
             "Loading Leads or No Matches" 
            }
            </CardTitle></CardHeader><CardContent><p className="text-muted-foreground">
            {searchTerm || showOnlyFavorites ? "Try adjusting your filters or " : ""}
            {jobOpenings.length === 0 && initialCacheLoadAttempted ? "Click \"Add New Lead\" to get started." : "Clear filters to see all leads."}
            </p></CardContent></Card>
        ) : focusedLead ? null : (
          sortOption === 'nextFollowUpDate_asc' ? (
            <>
              {actionRequiredLeads.length > 0 && ( <div className="space-y-3"> <h3 className="text-xl font-semibold text-foreground/90 font-headline">Due Today / Overdue</h3> <LeadList leads={actionRequiredLeads} onEditLead={handleEditLead} onLogFollowUp={handleLogFollowUp} onUnlogFollowUp={handleUnlogFollowUp} onToggleFavorite={handleToggleFavorite} /> </div> )}
              {actionRequiredLeads.length > 0 && otherLeads.length > 0 && ( <Separator className="my-6" /> )}
              {otherLeads.length > 0 && ( <div className="space-y-3"> <h3 className="text-xl font-semibold text-foreground/90 font-headline">Upcoming Follow-ups</h3> <LeadList leads={otherLeads} onEditLead={handleEditLead} onLogFollowUp={handleLogFollowUp} onUnlogFollowUp={handleUnlogFollowUp} onToggleFavorite={handleToggleFavorite} /> </div> )}
            </>
          ) : ( <LeadList leads={allFilteredAndSortedLeads} onEditLead={handleEditLead} onLogFollowUp={handleLogFollowUp} onUnlogFollowUp={handleUnlogFollowUp} onToggleFavorite={handleToggleFavorite} /> )
        )}

        {focusedLead && (
          <Dialog open={!!focusedLead} onOpenChange={(open) => { if (!open) handleCloseFocusedLeadDialog(); }}><DialogContent className="sm:max-w-xl p-0 border-0 shadow-2xl bg-transparent data-[state=open]:sm:zoom-in-90 data-[state=closed]:sm:zoom-out-90"><DialogHeader className="sr-only"><DialogTitle>{focusedLead.role_title}</DialogTitle><DialogDescription>Details for {focusedLead.role_title} at {focusedLead.company_name_cache}</DialogDescription></DialogHeader>
              <LeadCard lead={focusedLead} onEdit={() => { handleCloseFocusedLeadDialog(); handleEditLead(focusedLead); }} onLogFollowUp={handleLogFollowUp} onUnlogFollowUp={handleUnlogFollowUp} onToggleFavorite={async (id, isFav) => { await handleToggleFavorite(id, isFav); const updatedFocusedLead = jobOpenings.find(op => op.id === id); if (updatedFocusedLead) setFocusedLead(updatedFocusedLead); else handleCloseFocusedLeadDialog(); }} isFocusedView={true} />
          </DialogContent></Dialog>
        )}

        <AddLeadDialog isOpen={isAddDialogOpen} onOpenChange={setIsAddDialogOpen} onAddLead={handleAddLead} companies={companies} contacts={contacts} companiesCount={globalCounts.jobOpenings} contactsCount={globalCounts.contacts} jobOpeningsCount={globalCounts.jobOpenings} onAddNewCompany={handleAddNewCompanyToListSupabase} onAddNewContact={handleAddNewContactToListSupabase} defaultEmailTemplates={userSettings?.default_email_templates as DefaultFollowUpTemplates | undefined} prefillData={addDialogPrefill} />
        {editingLead && ( <EditLeadDialog isOpen={isEditDialogOpen} onOpenChange={setIsEditDialogOpen} onUpdateLead={handleUpdateLead} leadToEdit={editingLead} onInitiateDelete={handleInitiateDeleteLead} companies={companies} contacts={contacts} companiesCount={globalCounts.jobOpenings} contactsCount={globalCounts.contacts} onAddNewCompany={handleAddNewCompanyToListSupabase} onAddNewContact={handleAddNewContactToListSupabase} user={currentUser} userSettings={userSettings}/> )}
        <AlertDialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}><AlertDialogContent><AlertDialogHeader><ShadAlertDialogTitle>Are you sure?</ShadAlertDialogTitle><AlertDialogDescription>This action cannot be undone. This will permanently delete the lead: <span className="font-semibold"> {leadToDelete?.role_title} at {leadToDelete?.company_name_cache}</span>. All associated follow-up records will also be deleted.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel onClick={() => {setLeadToDelete(null); setIsDeleteConfirmOpen(false);}}>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleConfirmDeleteLead} className="bg-destructive hover:bg-destructive/90">Delete Lead</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
        <LeadsHelpModal isOpen={isHelpModalOpen} onOpenChange={setIsHelpModalOpen} />
         {isGenerateLeadFromJDOpen && (
            <GenerateLeadFromJDDialog
                isOpen={isGenerateLeadFromJDOpen}
                onOpenChange={setIsGenerateLeadFromJDOpen}
                onLeadGenerated={handleLeadGeneratedFromAI}
                user={currentUser}
                userSettings={userSettings}
            />
        )}
        {isApiKeyDialogOpen && (
            <ApiKeyDialog
                isOpen={isApiKeyDialogOpen}
                onOpenChange={setIsApiKeyDialogOpen}
                onApiKeySubmit={handleApiKeySubmitted}
            />
        )}
      <TutorialStepDialog isOpen={isTutorialStepOpen} onOpenChange={setIsTutorialStepOpen} />
      </div>
    </AppLayout>
  );
}

export default function LeadsPage() {
  return (
    <Suspense fallback={<AppLayout><div className="flex w-full h-full items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div></AppLayout>}>
        <LeadsPageContent />
    </Suspense>
  )
}
