
'use client';

import React, { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { CalendarIcon, Check, ChevronsUpDown, Loader2, Trash2, PlusCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from '@/components/ui/textarea';
import type { Company, Contact, DefaultFollowUpTemplates, FollowUpTemplateContent, ContactFormEntry } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useCurrentSubscription } from '@/hooks/use-current-subscription';
import { getLimitsForTier } from '@/lib/config';
import { useToast } from '@/hooks/use-toast';


export const DEFAULT_FOLLOW_UP_CADENCE_DAYS = [7, 14, 21];

const contactEntrySchema = z.object({
  contact_id: z.string().optional(),
  contactName: z.string().min(1, "Contact name is required"),
  contactEmail: z.string().email("Invalid email address").optional().or(z.literal('')),
  linkedin_url: z.string().url("Must be a valid LinkedIn URL").optional().or(z.literal('')),
  phone: z.string().min(5, "Phone number is too short").optional().or(z.literal('')),
}).superRefine((data, ctx) => {
  const emailProvided = data.contactEmail && data.contactEmail.trim() !== '';
  const linkedinProvided = data.linkedin_url && data.linkedin_url.trim() !== '';
  const phoneProvided = data.phone && data.phone.trim() !== '';

  if (!emailProvided && !linkedinProvided && !phoneProvided) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Please provide at least an email, LinkedIn URL, or phone number for the contact.",
      path: ["contactEmail"],
    });
     ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "At least one contact method is required.",
      path: ["linkedin_url"],
    });
     ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "At least one contact method is required.",
      path: ["phone"],
    });
  }
});

const followUpContentSchema = z.object({
  subject: z.string().max(255, "Subject cannot exceed 255 characters.").optional(),
  body: z.string().max(5000, "Body cannot exceed 5000 characters.").optional(),
});

const addJobOpeningSchema = z.object({
  companyName: z.string().min(1, "Company name is required"),
  company_id: z.string().optional(),
  roleTitle: z.string().min(1, "Lead / Role title is required"),
  contacts: z.array(contactEntrySchema).min(1, "At least one contact is required."),
  initialEmailDate: z.date({ invalid_type_error: "Initial email date is required." }).default(() => new Date()),
  jobDescriptionUrl: z.string().url("Must be a valid URL").optional().or(z.literal('')),
  notes: z.string().optional(),
  followUp1: followUpContentSchema,
  followUp2: followUpContentSchema,
  followUp3: followUpContentSchema,
});

export type AddJobOpeningFormValues = z.infer<typeof addJobOpeningSchema>;

interface AddJobOpeningDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onAddJobOpening: (values: AddJobOpeningFormValues) => Promise<void>;
  companies: Company[];
  contacts: Contact[];
  companiesCount: number;
  contactsCount: number;
  jobOpeningsCount: number;
  onAddNewCompany: (companyName: string) => Promise<Company | null>; 
  onAddNewContact: (contactName: string, contactEmail?: string, companyId?: string, companyName?: string, linkedinUrl?: string, phone?: string) => Promise<Contact | null>;
  defaultEmailTemplates?: DefaultFollowUpTemplates;
}

const getDefaultFollowUpValues = (template?: FollowUpTemplateContent, sharedSignature?: string) => {
  const bodyContent = (template?.openingLine || '') + (sharedSignature ? `\n\n${sharedSignature}` : '');
  return {
    subject: template?.subject || '',
    body: bodyContent.trim(),
  };
};


export function AddJobOpeningDialog({
  isOpen,
  onOpenChange,
  onAddJobOpening,
  companies,
  contacts: allExistingContacts,
  companiesCount,
  contactsCount,
  jobOpeningsCount,
  onAddNewCompany, 
  onAddNewContact,
  defaultEmailTemplates,
}: AddJobOpeningDialogProps) {
  const [companyPopoverOpen, setCompanyPopoverOpen] = useState(false);
  const [companySearchInput, setCompanySearchInput] = useState('');

  const [contactPopoverStates, setContactPopoverStates] = useState<boolean[]>([]);
  const [contactSearchInputs, setContactSearchInputs] = useState<string[]>([]);
  const { toast } = useToast();
  const { effectiveLimits, isInGracePeriod, subscriptionLoading } = useCurrentSubscription();


  const form = useForm<AddJobOpeningFormValues>({
    resolver: zodResolver(addJobOpeningSchema),
    defaultValues: {
      companyName: '',
      company_id: '',
      roleTitle: '',
      contacts: [{ contactName: '', contactEmail: '', contact_id: '', linkedin_url: '', phone: '' }],
      initialEmailDate: new Date(),
      jobDescriptionUrl: '',
      notes: '',
      followUp1: getDefaultFollowUpValues(defaultEmailTemplates?.followUp1, defaultEmailTemplates?.sharedSignature),
      followUp2: getDefaultFollowUpValues(defaultEmailTemplates?.followUp2, defaultEmailTemplates?.sharedSignature),
      followUp3: getDefaultFollowUpValues(defaultEmailTemplates?.followUp3, defaultEmailTemplates?.sharedSignature),
    },
  });

  const { fields: contactFields, append: appendContact, remove: removeContactField } = useFieldArray({
    control: form.control,
    name: "contacts"
  });

  useEffect(() => {
    if (isOpen) {
      form.reset({
        companyName: '',
        company_id: '',
        roleTitle: '',
        contacts: [{ contactName: '', contactEmail: '', contact_id: '', linkedin_url: '', phone: '' }],
        initialEmailDate: new Date(),
        jobDescriptionUrl: '',
        notes: '',
        followUp1: getDefaultFollowUpValues(defaultEmailTemplates?.followUp1, defaultEmailTemplates?.sharedSignature),
        followUp2: getDefaultFollowUpValues(defaultEmailTemplates?.followUp2, defaultEmailTemplates?.sharedSignature),
        followUp3: getDefaultFollowUpValues(defaultEmailTemplates?.followUp3, defaultEmailTemplates?.sharedSignature),
      });
      setCompanySearchInput('');
      setContactPopoverStates([false]);
      setContactSearchInputs(['']);
    }
  }, [isOpen, defaultEmailTemplates, form]);

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


  const onSubmit = async (values: AddJobOpeningFormValues) => {
    if (subscriptionLoading) {
      toast({ title: "Please wait", description: "Subscription status is loading.", variant: "default" });
      return;
    }

    let limitMessage = "";

    if (jobOpeningsCount >= effectiveLimits.jobOpenings) {
      limitMessage = `You have reached the limit of ${effectiveLimits.jobOpenings} leads.`;
      if (isInGracePeriod) {
        limitMessage = `Your premium plan has expired. You've reached the Free Tier limit of ${effectiveLimits.jobOpenings} leads.`;
      }
      toast({ title: 'Limit Reached', description: limitMessage, variant: 'destructive' });
      return;
    }

    const isCreatingNewCompany = !values.company_id && values.companyName;
    if (isCreatingNewCompany && companiesCount >= effectiveLimits.companies) {
      limitMessage = `Cannot create new company "${values.companyName}" as you have reached the limit of ${effectiveLimits.companies} companies.`;
       if (isInGracePeriod) {
        limitMessage = `Your premium plan has expired. Cannot create new company "${values.companyName}" as you've reached the Free Tier limit of ${effectiveLimits.companies} companies.`;
      }
      toast({ title: 'Company Limit Reached', description: limitMessage, variant: 'destructive' });
      return;
    }

    const numPotentiallyNewContacts = values.contacts.filter(c => !c.contact_id).length;
    if (numPotentiallyNewContacts > 0 && (contactsCount + numPotentiallyNewContacts) > effectiveLimits.contacts) {
      limitMessage = `Adding ${numPotentiallyNewContacts} new contact(s) would exceed your limit of ${effectiveLimits.contacts} contacts.`;
       if (isInGracePeriod) {
        limitMessage = `Your premium plan has expired. Adding ${numPotentiallyNewContacts} new contact(s) would exceed your Free Tier limit of ${effectiveLimits.contacts} contacts.`;
      }
      toast({ title: 'Contact Limit Reached', description: limitMessage, variant: 'destructive' });
      return;
    }

    await onAddJobOpening(values); 
    if(isOpen) {
      // Form reset is handled by useEffect on isOpen
    }
  };

  const handleDialogCancel = () => {
    onOpenChange(false);
  };

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
      let message = `You have reached the limit of ${effectiveLimits.companies} companies.`;
      if (isInGracePeriod) {
        message = `Your premium plan has expired. You've reached the Free Tier limit of ${effectiveLimits.companies} companies.`;
      }
      toast({
        title: 'Company Limit Reached',
        description: message,
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
      let message = `Adding this new contact would exceed your limit of ${effectiveLimits.contacts} contacts.`;
      if (isInGracePeriod) {
        message = `Your premium plan has expired. Adding this new contact would exceed your Free Tier limit of ${effectiveLimits.contacts} contacts.`;
      }
      toast({ title: 'Contact Limit Reached', description: message, variant: 'destructive' });
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
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) handleDialogCancel();
      else onOpenChange(open);
    }}>
      <DialogContent className="sm:max-w-3xl shadow-xl">
        <DialogHeader>
          <DialogTitle className="font-headline">Add New Lead</DialogTitle>
          <DialogDescription>
            Enter the details of the lead and associated contacts.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="py-2 max-h-[70vh] overflow-y-auto px-2 space-y-4">

            <div className="grid md:grid-cols-2 gap-x-6 gap-y-4 items-start">
              <FormField
                control={form.control}
                name="companyName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company Name</FormLabel>
                    <Popover open={companyPopoverOpen} onOpenChange={setCompanyPopoverOpen}>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={companyPopoverOpen}
                            className={cn("w-full justify-between", !field.value && "text-muted-foreground")}
                          >
                            {field.value || "Select or type company"}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                        <Command>
                          <CommandInput
                            placeholder="Search or create company..."
                            value={companySearchInput}
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
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="roleTitle"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Lead / Role Title</FormLabel>
                    <FormControl><Input placeholder="e.g. Q4 Deal / Software Engineer" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {contactFields.map((item, index) => (
              <div key={item.id} className="space-y-0">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                    <FormField
                        control={form.control}
                        name={`contacts.${index}.contactName`}
                        render={({ field }) => (
                        <FormItem>
                            <div className="flex justify-between"> {/* Removed items-center */}
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
                                <CommandInput
                                    placeholder="Search or create contact..."
                                    value={contactSearchInputs[index] || ''}
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
                                                key={`__create_contact_${index}`}
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
                        </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name={`contacts.${index}.contactEmail`}
                        render={({ field }) => (
                        <FormItem>
                             <div className="flex justify-between"> {/* Removed items-center */}
                                <FormLabel>Contact Email {index + 1}</FormLabel>
                                <div className="h-7 w-7 shrink-0" /> {/* Placeholder */}
                            </div>
                            <FormControl>
                                <Input type="email" placeholder="e.g. jane.doe@example.com" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name={`contacts.${index}.linkedin_url`}
                        render={({ field }) => (
                        <FormItem>
                            <div className="flex justify-between"> {/* Removed items-center */}
                                <FormLabel>LinkedIn URL (Optional)</FormLabel>
                                <div className="h-7 w-7 shrink-0" /> {/* Placeholder */}
                            </div>
                            <FormControl>
                                <Input placeholder="https://linkedin.com/in/janedoe" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name={`contacts.${index}.phone`}
                        render={({ field }) => (
                        <FormItem>
                            <div className="flex justify-between"> {/* Removed items-center */}
                                <FormLabel>Phone Number (Optional)</FormLabel>
                                <div className="h-7 w-7 shrink-0" /> {/* Placeholder */}
                            </div>
                            <FormControl>
                                <Input type="tel" placeholder="e.g. +1 234 567 8900" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
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
              <FormField
                control={form.control}
                name="initialEmailDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Initial Email Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                            {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date > new Date() || date < new Date("1900-01-01")} initialFocus />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="jobDescriptionUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>URL (Optional)</FormLabel>
                    <FormControl><Input placeholder="https://example.com/deal/123" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl><Textarea placeholder="Any additional notes..." {...field} rows={3}/></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-6">
              {(['followUp1', 'followUp2', 'followUp3'] as const).map((key, index) => {
                const num = index + 1;
                return (
                  <div key={key} className="space-y-2 p-4 border rounded-md shadow-sm">
                    <h4 className="text-md font-semibold text-primary">{num === 1 ? '1st' : num === 2 ? '2nd' : '3rd'} Follow-Up draft</h4>
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


            <DialogFooter className="pt-6">
              <Button type="button" variant="outline" onClick={handleDialogCancel}>Cancel</Button>
              <Button type="submit" disabled={form.formState.isSubmitting || subscriptionLoading}>
                 {(form.formState.isSubmitting || subscriptionLoading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Add Lead
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
