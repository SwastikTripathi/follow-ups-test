
'use client';

import React, { useEffect, useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format, isValid, isBefore, startOfDay } from 'date-fns';
import { CalendarIcon, Check, ChevronsUpDown, Loader2, Trash2, PlusCircle, Mail, MailCheck, AlertTriangle, CalendarClock, XCircle, Sparkles } from 'lucide-react';
import type { User } from '@supabase/supabase-js';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from '@/components/ui/textarea';
import type { JobOpening, Company, Contact, ContactFormEntry, UserSettings, ResumeData } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCurrentSubscription } from '@/hooks/use-current-subscription';
import { useToast } from '@/hooks/use-toast';
import { editLeadSchema, type EditLeadFormValues } from './shared/leadSchemas';
import { useGeminiApiKey } from '@/hooks/useGeminiApiKey';
import { ApiKeyDialog } from './ApiKeyDialog';
import { generateInitialEmail, generateSingleFollowUp } from '@/lib/ai/client';
import { useUserDataCache } from '@/contexts/UserDataCacheContext';


interface TimelineEvent {
  date: Date;
  description: string;
  isOccurred: boolean;
  type: 'initial_email' | 'follow_up_1' | 'follow_up_2' | 'follow_up_3';
}

const JOB_STATUSES: JobOpening['status'][] = [
    'Watching', 'Applied', 'Emailed',
    'Followed Up - Once', 'Followed Up - Twice', 'Followed Up - Thrice',
    'No Response', 'Replied - Positive', 'Replied - Negative',
    'Interviewing', 'Offer', 'Rejected', 'Closed'
];

export function EditLeadDialog({
    isOpen,
    onOpenChange,
    onUpdateLead,
    leadToEdit,
    onInitiateDelete,
    companies,
    contacts: allExistingContacts,
    companiesCount,
    contactsCount,
    onAddNewCompany,
    onAddNewContact,
    user,
    userSettings,
}: {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    onUpdateLead: (values: EditLeadFormValues, leadId: string) => Promise<void>;
    leadToEdit: JobOpening | null;
    onInitiateDelete: (lead: JobOpening) => void;
    companies: Company[];
    contacts: Contact[];
    companiesCount: number;
    contactsCount: number;
    onAddNewCompany: (companyName: string) => Promise<Company | null>;
    onAddNewContact: (contactName: string, contactEmail?: string, companyId?: string, companyName?: string, linkedinUrl?:string, phone?: string) => Promise<Contact | null>;
    user: User | null;
    userSettings: UserSettings | null;
}) {
  const [companyPopoverOpen, setCompanyPopoverOpen] = useState(false);
  const [companySearchInput, setCompanySearchInput] = useState('');

  const [contactPopoverStates, setContactPopoverStates] = useState<boolean[]>([]);
  const [contactSearchInputs, setContactSearchInputs] = useState<string[]>([]);
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);
  const { toast } = useToast();
  const { effectiveLimits, isInGracePeriod, subscriptionLoading } = useCurrentSubscription();
  const { apiKey, setApiKey, isLoaded: isApiKeyLoaded } = useGeminiApiKey();
  const [isApiKeyDialogOpen, setIsApiKeyDialogOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState<number | null>(null);
  const { incrementCachedAiUsage } = useUserDataCache();

  const form = useForm<EditLeadFormValues>({
    resolver: zodResolver(editLeadSchema),
  });

  const { fields: contactFields, append: appendContact, remove: removeContactField } = useFieldArray({
    control: form.control,
    name: "contacts"
  });

  const resetFormWithLeadData = (op: JobOpening | null) => {
    if (op) {
        const formContacts: ContactFormEntry[] = (op.associated_contacts || []).map(assocContact => {
            const existingContactDetails = allExistingContacts.find(c => c.id === assocContact.contact_id);
            return {
                contact_id: assocContact.contact_id,
                contactName: assocContact.name,
                contactEmail: assocContact.email || '', 
                linkedin_url: existingContactDetails?.linkedin_url || '',
                phone: existingContactDetails?.phone || '',
            };
        });
        if (formContacts.length === 0) {
            formContacts.push({ contactName: '', contactEmail: '', contact_id: '', linkedin_url: '', phone: '' });
        }

        form.reset({
            companyName: op.company_name_cache || '',
            company_id: op.company_id || '',
            roleTitle: op.role_title,
            contacts: formContacts,
            initialEmailDate: typeof op.initial_email_date === 'string' ? new Date(op.initial_email_date) : op.initial_email_date || new Date(),
            initialEmail: {
              subject: op.initial_email?.subject ?? '',
              body: op.initial_email?.body ?? '',
            },
            jobDescriptionUrl: op.job_description_url || '',
            notes: op.notes || '',
            followUp1: {
                subject: op.followUps?.[0]?.email_subject || '',
                body: op.followUps?.[0]?.email_body || '',
            },
            followUp2: {
                subject: op.followUps?.[1]?.email_subject || '',
                body: op.followUps?.[1]?.email_body || '',
            },
            followUp3: {
                subject: op.followUps?.[2]?.email_subject || '',
                body: op.followUps?.[2]?.email_body || '',
            },
            status: op.status || 'Watching',
        });
        setCompanySearchInput(op.company_name_cache || '');
        setContactPopoverStates(formContacts.map(() => false));
        setContactSearchInputs(formContacts.map(fc => fc.contactName || ''));

    } else {
        form.reset({
            companyName: '', company_id: '', roleTitle: '',
            contacts: [{ contactName: '', contactEmail: '', contact_id: '', linkedin_url: '', phone: '' }],
            initialEmailDate: new Date(), jobDescriptionUrl: '', notes: '',
            initialEmail: { subject: '', body: '' },
            followUp1: { subject: '', body: '' },
            followUp2: { subject: '', body: '' },
            followUp3: { subject: '', body: '' },
            status: 'Watching',
        });
        setCompanySearchInput('');
        setContactPopoverStates([false]);
        setContactSearchInputs(['']);
    }
  };

  useEffect(() => {
    if (isOpen) {
      resetFormWithLeadData(leadToEdit);
    }
  }, [leadToEdit, isOpen, form.reset, allExistingContacts]); 

   useEffect(() => {
    if (isOpen) {
        setContactPopoverStates(prev => {
            const newStates = [...prev];
            while (newStates.length < contactFields.length) newStates.push(false);
            return newStates.slice(0, contactFields.length);
        });
        setContactSearchInputs(prev => {
            const newSearches = [...prev];
            while (newSearches.length < contactFields.length) {
                const fieldNameVal = form.getValues(`contacts.${newSearches.length}.contactName`);
                newSearches.push(fieldNameVal || '');
            }
            return newSearches.slice(0, contactFields.length);
        });
    }
  }, [contactFields.length, isOpen, form]);

  useEffect(() => {
    if (leadToEdit) {
      const occurredEvents: TimelineEvent[] = [];
      const emailSentStatuses: JobOpening['status'][] = [
        'Emailed', 'Followed Up - Once', 'Followed Up - Twice', 'Followed Up - Thrice',
        'No Response', 'Replied - Positive', 'Replied - Negative', 'Interviewing', 'Offer', 'Rejected', 'Closed'
      ];
  
      const initialEmailDate = leadToEdit.initial_email_date ? new Date(leadToEdit.initial_email_date) : null;
      if (initialEmailDate && isValid(initialEmailDate) && emailSentStatuses.includes(leadToEdit.status as any)) {
        occurredEvents.push({
          date: initialEmailDate,
          description: "Initial Email Sent",
          isOccurred: true,
          type: 'initial_email'
        });
      }
  
      const sentFollowUps = (leadToEdit.followUps || [])
        .filter(fu => fu.status === 'Sent' && fu.follow_up_date && isValid(new Date(fu.follow_up_date)))
        .sort((a, b) => new Date(a.follow_up_date).getTime() - new Date(b.follow_up_date).getTime());
  
      const followUpEventTypes: TimelineEvent['type'][] = ['follow_up_1', 'follow_up_2', 'follow_up_3'];
      sentFollowUps.forEach((fu, index) => {
        if (index < 3) {
          occurredEvents.push({
            date: new Date(fu.follow_up_date),
            description: `Follow-up ${index + 1} Sent`,
            isOccurred: true,
            type: followUpEventTypes[index]
          });
        }
      });
      
      occurredEvents.sort((a, b) => a.date.getTime() - b.date.getTime());
      setTimelineEvents(occurredEvents);
  
    } else {
      setTimelineEvents([]);
    }
  }, [leadToEdit]);


  const onSubmit = async (values: EditLeadFormValues) => {
    if (!leadToEdit) return;
    if (subscriptionLoading) {
      toast({ title: "Please wait", description: "Subscription status is loading.", variant: "default" });
      return;
    }

    const isCreatingNewCompanyForEdit = !values.company_id && values.companyName &&
        (values.company_id !== leadToEdit.company_id || values.companyName !== leadToEdit.company_name_cache);

    if (isCreatingNewCompanyForEdit && companiesCount >= effectiveLimits.companies) {
      toast({ title: 'Company Limit Reached', description: `Cannot assign to new company "${values.companyName}" as you have reached the limit of ${effectiveLimits.companies} companies.`, variant: 'destructive' });
      return;
    }
    
    const originalNewContactsCount = leadToEdit.associated_contacts?.filter(c => !allExistingContacts.find(ec => ec.id === c.contact_id)).length || 0;
    const currentNewContactsInForm = values.contacts.filter(c => !c.contact_id).length;
    const netNewContactsToAdd = currentNewContactsInForm - originalNewContactsCount;


    if (netNewContactsToAdd > 0 && (contactsCount + netNewContactsToAdd) > effectiveLimits.contacts) {
       toast({ title: 'Contact Limit Reached', description: `Adding ${netNewContactsToAdd} new contact(s) would exceed your limit of ${effectiveLimits.contacts} contacts.`, variant: 'destructive' });
      return;
    }

    await onUpdateLead(values, leadToEdit.id);
  };

  const handleDeleteLeadClick = () => {
    if (leadToEdit) {
      onInitiateDelete(leadToEdit);
    }
  };
  
  const handleDialogCancel = () => {
    onOpenChange(false);
  };
  
  const handleApiKeySubmitted = (newApiKey: string) => {
    setApiKey(newApiKey);
    setIsApiKeyDialogOpen(false);
    toast({ title: 'API Key Saved!', description: 'Your key is saved in your browser. You can now generate follow-ups.' });
  };
  
  const handleGenerateClick = async (type: 'initial' | 'followup', index: 1 | 2 | 3 | null) => {
    if (!apiKey) {
      setIsApiKeyDialogOpen(true);
      return;
    }

    if (effectiveLimits.aiGenerationsPerMonth !== Infinity && (userSettings?.ai_usage_count ?? 0) >= effectiveLimits.aiGenerationsPerMonth) {
        toast({
            title: 'AI Generation Limit Reached',
            description: `You have used all ${effectiveLimits.aiGenerationsPerMonth} of your AI generations for this month. Upgrade your plan for unlimited generations.`,
            variant: 'destructive',
            duration: 7000,
        });
        return;
    }
    
    const generationIndex = type === 'initial' ? 0 : index;
    setIsGenerating(generationIndex);

    try {
        const formData = form.getValues();
        let generatedContent: { subject: string; body: string; } | null = null;

        const aiContext = {
            roleTitle: formData.roleTitle,
            companyName: formData.companyName,
            notes: formData.notes || '',
            contacts: formData.contacts,
            previousFollowUps: {
                initialEmail: formData.initialEmail,
                followUp1: formData.followUp1,
                followUp2: formData.followUp2,
                followUp3: formData.followUp3,
            },
            user: user,
            userSettings: userSettings,
            resumeData: userSettings?.resume as ResumeData | null,
        };

        if (type === 'initial') {
            generatedContent = await generateInitialEmail(apiKey, aiContext);
        } else if (type === 'followup' && index) {
            generatedContent = await generateSingleFollowUp(apiKey, aiContext, index);
        }

        if (generatedContent) {
            incrementCachedAiUsage();
            if (type === 'initial') {
                form.setValue(`initialEmail.subject`, generatedContent.subject, { shouldDirty: true });
                form.setValue(`initialEmail.body`, generatedContent.body, { shouldDirty: true });
                toast({ title: 'Initial Email Generated!', description: `Content for the initial email has been populated.` });
            } else if (index) {
                form.setValue(`followUp${index}.subject`, generatedContent.subject, { shouldDirty: true });
                form.setValue(`followUp${index}.body`, generatedContent.body, { shouldDirty: true });
                toast({ title: 'Follow-up Generated!', description: `Content for follow-up #${index} has been populated.` });
            }
        }
    } catch (error: any) {
        toast({ title: 'AI Generation Error', description: error.message, variant: 'destructive' });
        if (error.message.includes('API key not valid')) {
            setApiKey(null);
            setIsApiKeyDialogOpen(true);
        }
    } finally {
        setIsGenerating(null);
    }
  };

  if (!leadToEdit && isOpen) {
      return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent><DialogHeader><DialogTitle>Error</DialogTitle></DialogHeader>Lead data not available. Please close and retry.</DialogContent>
        </Dialog>
      )
  }
  if (!leadToEdit) return null;

  const currentCompanyIdForContactFilter = form.watch('company_id');
  const currentCompanyNameForContactFilter = form.watch('companyName');

  const trimmedCompanySearchInput = companySearchInput.trim().toLowerCase();
  const filteredCompaniesForDropdown = companies.filter(company =>
    company.name.toLowerCase().includes(trimmedCompanySearchInput)
  );
  
 const canShowCreateCompanyOption = 
    trimmedCompanySearchInput.length > 0 &&
    !companies.some(c => c.name.toLowerCase() === trimmedCompanySearchInput);

  const stageNewCompanyInFormAfterLimitCheck = (name: string): boolean => {
    if (companiesCount >= effectiveLimits.companies && !subscriptionLoading) {
      toast({
        title: 'Company Limit Reached',
        description: `You have reached the limit of ${effectiveLimits.companies} companies.`,
        variant: 'destructive',
      });
      return false;
    }
    form.setValue("companyName", name.trim(), { shouldValidate: true });
    form.control.getFieldState("companyName").isTouched = true; 
    form.setValue("company_id", "", { shouldValidate: true });
    setCompanySearchInput(name.trim());
    setCompanyPopoverOpen(false);
    return true;
  };
  
  const handlePotentialNewContactSelection = (contactName: string, index: number): boolean => {
    const existingNewContactsInForm = form.getValues('contacts').filter(c => !c.contact_id && c !== form.getValues('contacts')[index]).length;
    const totalProspectiveContacts = contactsCount + existingNewContactsInForm + 1;

    if (totalProspectiveContacts > effectiveLimits.contacts && !subscriptionLoading) {
      toast({ title: 'Contact Limit Reached', description: `Adding this new contact would exceed your limit of ${effectiveLimits.contacts} contacts.`, variant: 'destructive' });
      return false; 
    }

    form.setValue(`contacts.${index}.contactName`, contactName.trim(), { shouldValidate: true });
    form.setValue(`contacts.${index}.contact_id`, undefined, { shouldValidate: true }); 
    form.setValue(`contacts.${index}.contactEmail`, '', { shouldValidate: false }); 
    form.setValue(`contacts.${index}.linkedin_url`, '', { shouldValidate: false });
    form.setValue(`contacts.${index}.phone`, '', { shouldValidate: false });
    setContactSearchInputs(prev => prev.map((s, i) => (i === index ? contactName.trim() : s)));
    setContactPopoverStates(prev => prev.map((s, i) => (i === index ? false : s)));
    return true;
  };


  const getFilteredContactsForPopover = (search: string) => {
    return allExistingContacts.filter(contact => {
      const nameMatch = contact.name.toLowerCase().includes(search.toLowerCase());
      if (currentCompanyIdForContactFilter) {
        return nameMatch && contact.company_id === currentCompanyIdForContactFilter;
      }
      if (currentCompanyNameForContactFilter && !currentCompanyIdForContactFilter) {
        return nameMatch && contact.company_name_cache?.toLowerCase() === currentCompanyNameForContactFilter.toLowerCase();
      }
      return nameMatch;
    });
  }

  return (
    <>
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) handleDialogCancel();
      else onOpenChange(open);
    }}>
      <DialogContent className="sm:max-w-3xl shadow-xl">
        <DialogHeader>
          <DialogTitle className="font-headline">Edit Lead</DialogTitle>
          <DialogDescription>
            Update the details for this lead.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="py-2 max-h-[70vh] overflow-y-auto px-2 space-y-4">

            <div className="grid md:grid-cols-2 gap-x-6 gap-y-4 items-start">
              <FormField control={form.control} name="companyName" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company Name</FormLabel>
                    <Popover open={companyPopoverOpen} onOpenChange={setCompanyPopoverOpen}>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button variant="outline" role="combobox" aria-expanded={companyPopoverOpen} className={cn("w-full justify-between",!field.value && "text-muted-foreground")}>
                            {field.value || "Select or type company"}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                        <Command>
                          <CommandInput placeholder="Search or create company..." value={companySearchInput}
                            onValueChange={(currentValue) => {
                               setCompanySearchInput(currentValue);
                               field.onChange(currentValue);
                               form.setValue("company_id", "");
                            }}
                           onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                                e.preventDefault();
                                const currentSearchVal = companySearchInput.trim();
                                if (!currentSearchVal) {
                                  setCompanyPopoverOpen(false);
                                  return;
                                }
                                const exactMatch = companies.find(
                                  (c) => c.name.toLowerCase() === currentSearchVal.toLowerCase()
                                );

                                if (exactMatch) {
                                  form.setValue("companyName", exactMatch.name, { shouldValidate: true });
                                  field.onChange(exactMatch.name);
                                  form.setValue("company_id", exactMatch.id, { shouldValidate: true });
                                  setCompanySearchInput(exactMatch.name);
                                  setCompanyPopoverOpen(false);
                                } else {
                                  stageNewCompanyInFormAfterLimitCheck(currentSearchVal);
                                }
                              }
                            }}
                            />
                          <CommandList>
                              {canShowCreateCompanyOption && (
                                <CommandGroup>
                                  <CommandItem
                                    key="__create_company__"
                                    value={`__create__${companySearchInput.trim()}`}
                                    onSelect={() => {
                                      stageNewCompanyInFormAfterLimitCheck(companySearchInput.trim());
                                    }}
                                    className="text-sm cursor-pointer"
                                  >
                                    <PlusCircle className="mr-2 h-4 w-4" />
                                    Create new company: "{companySearchInput.trim()}"
                                  </CommandItem>
                                </CommandGroup>
                              )}
                              {filteredCompaniesForDropdown.length > 0 && (
                                <CommandGroup heading={canShowCreateCompanyOption ? "Existing Companies" : "Select Company"}>
                                  {filteredCompaniesForDropdown.map((company) => (
                                    <CommandItem
                                      value={company.name}
                                      key={company.id}
                                      onSelect={() => {
                                        form.setValue("companyName", company.name, { shouldValidate: true });
                                        field.onChange(company.name);
                                        form.setValue("company_id", company.id, { shouldValidate: true });
                                        setCompanyPopoverOpen(false);
                                        setCompanySearchInput(company.name);
                                      }}
                                    >
                                      <Check className={cn("mr-2 h-4 w-4", form.getValues("company_id") === company.id ? "opacity-100" : "opacity-0")} />
                                      {company.name}
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              )}
                              {!canShowCreateCompanyOption && filteredCompaniesForDropdown.length === 0 && (
                                <CommandEmpty>
                                  {trimmedCompanySearchInput.length > 0
                                    ? `No companies found matching "${companySearchInput.trim()}".`
                                    : "Type to search or create a company."}
                                </CommandEmpty>
                              )}
                            </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>)}
              />
              <FormField control={form.control} name="roleTitle" render={({ field }) => (
                  <FormItem><FormLabel>Lead / Role Title</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )}
              />
            </div>
            
            {contactFields.map((item, index) => (
              <div key={item.id} className="space-y-0"> 
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                  <FormField control={form.control} name={`contacts.${index}.contactName`} render={({ field }) => (
                      <FormItem>
                        <div className="flex justify-between">
                            <FormLabel>Contact Person {index + 1}</FormLabel>
                            {contactFields.length > 1 ? (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 p-1 text-destructive hover:text-destructive/80 hover:bg-transparent shrink-0"
                                    onClick={() => removeContactField(index)}
                                    tabIndex={-1}
                                >
                                    <Trash2 className="h-4 w-4" />
                                    <span className="sr-only">Delete contact</span>
                                </Button>
                            ) : (
                                <div className="h-7 w-7 shrink-0" /> 
                            )}
                        </div>
                         <Popover
                            open={contactPopoverStates[index]}
                            onOpenChange={(open) => setContactPopoverStates(prev => prev.map((s, i) => i === index ? open : s))}
                         >
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button variant="outline" role="combobox" className={cn("w-full justify-between", !field.value && "text-muted-foreground")}>
                                {field.value || "Select or type contact"}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                            <Command>
                              <CommandInput placeholder="Search or create contact..." value={contactSearchInputs[index] || ''}
                                onValueChange={(searchValue) => {
                                  setContactSearchInputs(prev => prev.map((s, i) => i === index ? searchValue : s));
                                  field.onChange(searchValue);
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                                      e.preventDefault();
                                      const currentContactSearch = (contactSearchInputs[index] || '').trim();
                                      if (!currentContactSearch) {
                                          setContactPopoverStates(prev => prev.map((s, i) => i === index ? false : s));
                                          return;
                                      }
                                      const exactContactMatch = getFilteredContactsForPopover(currentContactSearch).find(c => c.name.toLowerCase() === currentContactSearch.toLowerCase());
                                      if (exactContactMatch) {
                                          form.setValue(`contacts.${index}.contactName`, exactContactMatch.name, { shouldValidate: true });
                                          field.onChange(exactContactMatch.name);
                                          form.setValue(`contacts.${index}.contactEmail`, exactContactMatch.email || '', { shouldValidate: true });
                                          form.setValue(`contacts.${index}.linkedin_url`, exactContactMatch.linkedin_url || '', { shouldValidate: true });
                                          form.setValue(`contacts.${index}.phone`, exactContactMatch.phone || '', { shouldValidate: true });
                                          form.setValue(`contacts.${index}.contact_id`, exactContactMatch.id, { shouldValidate: true });
                                          setContactSearchInputs(prev => prev.map((s, i) => i === index ? exactContactMatch.name : s));
                                          setContactPopoverStates(prev => prev.map((s, i) => (i === index ? false : s)));

                                      } else {
                                          handlePotentialNewContactSelection(currentContactSearch, index);
                                      }
                                    }
                                }}
                                />
                               <CommandList>
                                  {(() => {
                                    const trimmedContactSearch = (contactSearchInputs[index] || '').trim().toLowerCase();
                                    const filteredExistingContacts = getFilteredContactsForPopover(contactSearchInputs[index] || '');
                                    const showCreateContactOption = trimmedContactSearch.length > 0 && !filteredExistingContacts.some(c => c.name.toLowerCase() === trimmedContactSearch);

                                    return (
                                      <>
                                        {showCreateContactOption && (
                                          <CommandGroup>
                                            <CommandItem
                                              key={`__create_contact_edit_${index}`}
                                              value={`__create__${(contactSearchInputs[index] || '').trim()}`}
                                              onSelect={() => {
                                                handlePotentialNewContactSelection((contactSearchInputs[index] || '').trim(), index);
                                              }}
                                              className="text-sm cursor-pointer"
                                            >
                                              <PlusCircle className="mr-2 h-4 w-4" />
                                              Use name: "{(contactSearchInputs[index] || '').trim()}"
                                            </CommandItem>
                                          </CommandGroup>
                                        )}
                                        {filteredExistingContacts.length > 0 && (
                                          <CommandGroup heading={showCreateContactOption ? "Existing Contacts" : "Select Contact"}>
                                            {filteredExistingContacts.map((contact) => (
                                              <CommandItem
                                                value={contact.name}
                                                key={contact.id}
                                                onSelect={() => {
                                                  form.setValue(`contacts.${index}.contactName`, contact.name, { shouldValidate: true });
                                                  field.onChange(contact.name);
                                                  form.setValue(`contacts.${index}.contactEmail`, contact.email || '', { shouldValidate: true });
                                                  form.setValue(`contacts.${index}.linkedin_url`, contact.linkedin_url || '', { shouldValidate: true });
                                                  form.setValue(`contacts.${index}.phone`, contact.phone || '', { shouldValidate: true });
                                                  form.setValue(`contacts.${index}.contact_id`, contact.id, { shouldValidate: true });
                                                  if(contact.company_id && !form.getValues("company_id")){
                                                       form.setValue("company_id", contact.company_id);
                                                       form.setValue("companyName", contact.company_name_cache || '', {shouldValidate: true});
                                                       setCompanySearchInput(contact.company_name_cache || '');
                                                  }
                                                  setContactPopoverStates(prev => prev.map((s, i) => i === index ? false : s));
                                                  setContactSearchInputs(prev => prev.map((s, i) => i === index ? contact.name : s));
                                                }}
                                              >
                                                <Check className={cn("mr-2 h-4 w-4", form.getValues(`contacts.${index}.contact_id`) === contact.id ? "opacity-100" : "opacity-0")} />
                                                {contact.name} {contact.company_name_cache && `(${contact.company_name_cache})`}
                                              </CommandItem>
                                            ))}
                                          </CommandGroup>
                                        )}
                                        {!showCreateContactOption && filteredExistingContacts.length === 0 && (
                                          <CommandEmpty>
                                            {trimmedContactSearch.length > 0 ? `No contacts found matching "${trimmedContactSearch}". You can add a new one by typing their name and then email below.` : "Type to search, or type name and email below to add new."}
                                          </CommandEmpty>
                                        )}
                                      </>
                                    );
                                  })()}
                                </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>)}
                  />
                  <FormField control={form.control} name={`contacts.${index}.contactEmail`} render={({ field }) => (
                      <FormItem>
                        <div className="flex justify-between">
                            <FormLabel>Contact Email {index + 1}</FormLabel>
                            <div className="h-7 w-7 shrink-0" />
                        </div>
                        <FormControl><Input type="email" placeholder="e.g. jane.doe@example.com" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>)}
                  />
                  <FormField control={form.control} name={`contacts.${index}.linkedin_url`} render={({ field }) => (
                      <FormItem>
                        <div className="flex justify-between">
                            <FormLabel>LinkedIn URL (Optional)</FormLabel>
                            <div className="h-7 w-7 shrink-0" />
                        </div>
                        <FormControl><Input placeholder="https://linkedin.com/in/janedoe" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>)}
                  />
                  <FormField control={form.control} name={`contacts.${index}.phone`} render={({ field }) => (
                      <FormItem>
                        <div className="flex justify-between">
                            <FormLabel>Phone Number (Optional)</FormLabel>
                            <div className="h-7 w-7 shrink-0" />
                        </div>
                        <FormControl><Input type="tel" placeholder="e.g. +1 234 567 8900" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>)}
                  />
                </div>
                {index < contactFields.length - 1 && (
                    <hr className="my-4 border-border" />
                )}
              </div>
              ))}

            <div className="pt-0">
                 <Button
                    type="button"
                    variant="link"
                    onClick={() => appendContact({ contactName: '', contactEmail: '', contact_id: '', linkedin_url: '', phone: '' })}
                    className="mt-1 text-primary hover:text-primary/90 no-underline hover:underline self-start px-0 text-sm"
                >
                    Add another contact
                </Button>
            </div>

            <div className="grid md:grid-cols-2 gap-x-6 gap-y-4 items-start pt-2">
              <FormField control={form.control} name="initialEmailDate" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Initial Email Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                            {field.value ? format(new Date(field.value), "PPP") : <span>Pick a date</span>}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={field.value ? new Date(field.value) : undefined} onSelect={field.onChange} disabled={(date) => date > new Date() || date < new Date("1900-01-01")} initialFocus />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>)}
              />
              <FormField control={form.control} name="status" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {JOB_STATUSES.map(status => (
                          <SelectItem key={status} value={status}>{status}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>)}
              />
               <FormField control={form.control} name="jobDescriptionUrl" render={({ field }) => (
                  <FormItem> <FormLabel>URL (Optional)</FormLabel> <FormControl><Input {...field} /></FormControl> <FormMessage /></FormItem>)}
              />
            </div>

            <FormField control={form.control} name="notes" render={({ field }) => (
                <FormItem> <FormLabel>Notes (Optional)</FormLabel> <FormControl><Textarea placeholder="Paste job description or any other notes..." {...field} rows={3}/></FormControl> <FormMessage /></FormItem>)}
            />
            
            <div className="space-y-6">
                <div className="space-y-2 p-4 border rounded-md shadow-sm">
                    <div className="flex justify-between items-center">
                        <h4 className="text-md font-semibold text-primary">Initial Email Draft</h4>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleGenerateClick('initial', null)}
                            disabled={isGenerating === 0 || !isApiKeyLoaded}
                        >
                            {isGenerating === 0 ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4 text-primary" />}
                            Generate
                        </Button>
                    </div>
                    <FormField
                        control={form.control}
                        name="initialEmail.subject"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Subject</FormLabel>
                                <FormControl><Input placeholder="Subject for your initial email" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="initialEmail.body"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Body</FormLabel>
                                <FormControl><Textarea placeholder="Body for your initial email..." {...field} rows={4} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

              {(['followUp1', 'followUp2', 'followUp3'] as const).map((key, index) => {
                const num = index + 1 as 1 | 2 | 3;
                return (
                  <div key={key} className="space-y-2 p-4 border rounded-md shadow-sm">
                     <div className="flex justify-between items-center">
                        <h4 className="text-md font-semibold text-primary">{num === 1 ? '1st' : num === 2 ? '2nd' : '3rd'} Follow-Up draft</h4>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleGenerateClick('followup', num)}
                            disabled={isGenerating === num || !isApiKeyLoaded}
                        >
                            {isGenerating === num ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4 text-primary" />}
                            Generate
                        </Button>
                     </div>
                    <FormField
                      control={form.control}
                      name={`${key}.subject`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Subject</FormLabel>
                          <FormControl><Input placeholder={`Subject for follow-up ${num}`} {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`${key}.body`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Body</FormLabel>
                          <FormControl><Textarea placeholder={`Body for follow-up ${num}...`} {...field} rows={4} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                );
              })}
            </div>
            
            {timelineEvents.length > 0 && (
              <div className="mt-6 pt-4">
                <div className="overflow-x-auto pb-2">
                  <div className="relative flex justify-around items-center min-w-[500px] px-4 py-12">
                    <div className="absolute top-1/2 left-0 w-full h-0.5 bg-border -translate-y-1/2 z-0"></div>
                    
                    {timelineEvents.map((event, index) => (
                      <div key={index} className="relative flex flex-col items-center flex-1">
                        <div
                          className={cn(
                            "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full z-30",
                            "bg-primary shadow-[0_0_6px_1px_hsl(var(--primary)/0.9),_0_0_12px_3px_hsl(var(--primary)/0.5)]"
                          )}
                          title={event.description}
                        ></div>
                        
                        <div
                          className={cn(
                            "absolute left-1/2 -translate-x-1/2 min-w-[7rem] text-center z-20",
                            index % 2 === 0 ? "bottom-full mb-3" : "top-full mt-3"
                          )}
                        >
                          <div className={cn(
                            "absolute left-1/2 -translate-x-1/2 w-px bg-border",
                            index % 2 === 0 ? "top-full h-3" : "bottom-full h-3"
                          )}></div>
                          
                          {index % 2 === 0 ? (
                            <>
                              <p className="text-xs font-medium text-foreground">{event.description}</p>
                              <p className="text-xs text-muted-foreground">{format(event.date, "MMM d, yy")}</p>
                            </>
                          ) : ( 
                            <>
                              <p className="text-xs text-muted-foreground">{format(event.date, "MMM d, yy")}</p>
                              <p className="text-xs font-medium text-foreground">{event.description}</p>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}


            <DialogFooter className="justify-between pt-6">
              <Button type="button" variant="destructive" onClick={handleDeleteLeadClick} className="mr-auto" disabled={form.formState.isSubmitting || subscriptionLoading}>
                 <Trash2 className="mr-2 h-4 w-4" /> Delete
              </Button>
              <div className="flex space-x-2">
                <Button type="button" variant="outline" onClick={handleDialogCancel} disabled={form.formState.isSubmitting || subscriptionLoading}>Cancel</Button>
                <Button type="submit" disabled={form.formState.isSubmitting || subscriptionLoading}>
                  {(form.formState.isSubmitting || subscriptionLoading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Changes
                </Button>
              </div>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
    {isApiKeyDialogOpen && (
        <ApiKeyDialog
            isOpen={isApiKeyDialogOpen}
            onOpenChange={setIsApiKeyDialogOpen}
            onApiKeySubmit={handleApiKeySubmitted}
        />
    )}
    </>
  );
}

    