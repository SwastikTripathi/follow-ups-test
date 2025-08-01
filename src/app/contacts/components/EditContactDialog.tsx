
'use client';

import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Check, ChevronsUpDown, PlusCircle, Trash2, Loader2 } from 'lucide-react';

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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from '@/components/ui/textarea';
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
import type { Contact, Company } from '@/lib/types';
import { cn } from '@/lib/utils';

// Schema matches the fields needed to update a contact
export const editContactFormSchema = z.object({
  name: z.string().min(1, "Contact name is required").max(100, "Name cannot exceed 100 characters."),
  role: z.string().max(100, "Role cannot exceed 100 characters.").optional(),
  email: z.string().email("Must be a valid email address").max(254, "Email is too long.").optional().or(z.literal('')),
  phone: z.string().max(50, "Phone number is too long.").optional(),
  company_id: z.string().optional(), // Stores the ID of the selected or new company
  company_name_input: z.string().max(100, "Company name cannot exceed 100 characters.").optional(), // Used for typing/searching/creating new company
  linkedin_url: z.string().url("Must be a valid LinkedIn URL (e.g., https://linkedin.com/in/name)").max(2048, "URL is too long.").optional().or(z.literal('')),
  notes: z.string().max(300, "Notes cannot exceed 300 characters.").optional(),
}).superRefine((data, ctx) => {
    const emailProvided = data.email && data.email.trim() !== '';
    const linkedinProvided = data.linkedin_url && data.linkedin_url.trim() !== '';
    const phoneProvided = data.phone && data.phone.trim() !== '';

    if (!emailProvided && !linkedinProvided && !phoneProvided) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "An email, LinkedIn URL, or phone is required.",
            path: ["email"],
        });
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Please provide at least one contact method.",
            path: ["linkedin_url"],
        });
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Please provide at least one contact method.",
            path: ["phone"],
        });
    }
});


export type EditContactFormValues = z.infer<typeof editContactFormSchema>;

interface EditContactDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onUpdateContactSubmit: (values: EditContactFormValues, contactId: string) => Promise<void>;
  contactToEdit: Contact | null;
  companies: Company[];
  // onAttemptCreateCompany prop removed as RPC handles this
  onInitiateDelete: (contact: Contact) => void;
}

export function EditContactDialog({
    isOpen,
    onOpenChange,
    onUpdateContactSubmit,
    contactToEdit,
    companies,
    onInitiateDelete,
}: EditContactDialogProps) {
  const [companyPopoverOpen, setCompanyPopoverOpen] = useState(false);
  const [companySearchInputForPopover, setCompanySearchInputForPopover] = useState('');

  const form = useForm<EditContactFormValues>({
    resolver: zodResolver(editContactFormSchema),
  });

  useEffect(() => {
    if (contactToEdit && isOpen) {
      form.reset({
        name: contactToEdit.name,
        role: contactToEdit.role || '',
        email: contactToEdit.email,
        phone: contactToEdit.phone || '',
        company_id: contactToEdit.company_id || '',
        company_name_input: contactToEdit.company_name_cache || '', 
        linkedin_url: contactToEdit.linkedin_url || '',
        notes: contactToEdit.notes || '',
      });
      setCompanySearchInputForPopover(contactToEdit.company_name_cache || '');
    }
     if (!isOpen) {
      setCompanySearchInputForPopover(''); // Reset on close
    }
  }, [contactToEdit, isOpen, form]);

  const onSubmit = async (values: EditContactFormValues) => {
    if (!contactToEdit) return;
    // Parent (ContactsPage) will call the RPC with these values.
    await onUpdateContactSubmit(values, contactToEdit.id);
  };

  const handleDeleteClick = () => {
    if (contactToEdit) {
      onInitiateDelete(contactToEdit);
    }
  };
  
  const handleDialogCancel = () => {
    if (contactToEdit) {
      form.reset({
        name: contactToEdit.name,
        role: contactToEdit.role || '',
        email: contactToEdit.email,
        phone: contactToEdit.phone || '',
        company_id: contactToEdit.company_id || '',
        company_name_input: contactToEdit.company_name_cache || '',
        linkedin_url: contactToEdit.linkedin_url || '',
        notes: contactToEdit.notes || '',
      });
      setCompanySearchInputForPopover(contactToEdit.company_name_cache || '');
    }
    onOpenChange(false);
  };

  if (!contactToEdit) return null;

  const trimmedCompanySearchInput = companySearchInputForPopover.trim().toLowerCase();
  
  const filteredCompaniesForPopover = companies.filter(company =>
    company.name.toLowerCase().includes(trimmedCompanySearchInput)
  );
  
  const canShowCreateCompanyOption = 
    trimmedCompanySearchInput.length > 0 &&
    !companies.some(c => c.name.toLowerCase() === trimmedCompanySearchInput);

  const handleCompanySelectionOrTyping = (companyName: string, companyId?: string) => {
    form.setValue("company_name_input", companyName, { shouldValidate: true });
    form.setValue("company_id", companyId || '', { shouldValidate: true });
    setCompanySearchInputForPopover(companyName);
    setCompanyPopoverOpen(false);
  };

  let commandEmptyContent: React.ReactNode;
  if (canShowCreateCompanyOption || filteredCompaniesForPopover.length > 0) {
    commandEmptyContent = null; 
  } else if (trimmedCompanySearchInput.length > 0) {
    commandEmptyContent = `No companies found matching "${companySearchInputForPopover.trim()}". You can still type a new name.`;
  } else {
    commandEmptyContent = "Type to search or enter a new company name.";
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
        if(!open) {
            handleDialogCancel();
        } else {
            onOpenChange(open);
        }
    }}>
      <DialogContent className="sm:max-w-2xl shadow-xl">
        <DialogHeader>
          <DialogTitle className="font-headline">Edit Contact Details</DialogTitle>
          <DialogDescription>
            Update the information for {contactToEdit.name}.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="py-2 max-h-[70vh] overflow-y-auto px-2">
            <div className="grid md:grid-cols-2 gap-x-6 gap-y-4 mb-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role (Optional)</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address</FormLabel>
                    <FormControl>
                      <Input type="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="company_name_input"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Company Name (Optional)</FormLabel>
                    <Popover open={companyPopoverOpen} onOpenChange={setCompanyPopoverOpen}>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={companyPopoverOpen}
                            className={cn(
                              "w-full justify-between",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value || "Select or type company"}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                        <Command>
                          <CommandInput
                            placeholder="Search or type new company..."
                            value={companySearchInputForPopover}
                            onValueChange={(currentSearchValue) => {
                              setCompanySearchInputForPopover(currentSearchValue);
                              field.onChange(currentSearchValue); 
                              form.setValue("company_id", '', {shouldValidate: false});
                            }}
                            onKeyDown={async (e) => {
                              if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                                e.preventDefault();
                                const currentSearchValTrimmed = companySearchInputForPopover.trim();
                                if (!currentSearchValTrimmed) {
                                  form.setValue("company_name_input", '', { shouldValidate: true });
                                  form.setValue("company_id", '', { shouldValidate: true });
                                  setCompanySearchInputForPopover('');
                                  setCompanyPopoverOpen(false);
                                  return;
                                }
                                // User pressed enter, use the typed name.
                                // Parent RPC will handle if it's new or existing.
                                handleCompanySelectionOrTyping(currentSearchValTrimmed);
                              }
                            }}
                          />
                          <CommandList>
                            {canShowCreateCompanyOption && (
                              <CommandGroup>
                                <CommandItem
                                  key="__type_company__"
                                  value={`__type__${trimmedCompanySearchInput}`}
                                  onSelect={() => handleCompanySelectionOrTyping(companySearchInputForPopover.trim())}
                                  className="text-sm cursor-pointer"
                                >
                                  <PlusCircle className="mr-2 h-4 w-4" />
                                  Use name: "{companySearchInputForPopover.trim()}"
                                </CommandItem>
                              </CommandGroup>
                            )}
                            {filteredCompaniesForPopover.length > 0 && (
                              <CommandGroup heading={canShowCreateCompanyOption ? "Existing Companies" : "Select Company"}>
                                {filteredCompaniesForPopover.map((company) => (
                                  <CommandItem
                                    value={company.name}
                                    key={company.id}
                                    onSelect={() => handleCompanySelectionOrTyping(company.name, company.id)}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        form.getValues("company_id") === company.id ? "opacity-100" : "opacity-0"
                                      )}
                                    />
                                    {company.name}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            )}
                            {commandEmptyContent && <CommandEmpty>{commandEmptyContent}</CommandEmpty>}
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
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number (Optional)</FormLabel>
                    <FormControl>
                      <Input type="tel" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="linkedin_url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>LinkedIn Profile URL (Optional)</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem className="mb-4">
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={3} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="justify-between pt-4">
              <Button type="button" variant="destructive" onClick={handleDeleteClick} className="mr-auto" disabled={form.formState.isSubmitting}>
                  <Trash2 className="mr-2 h-4 w-4" /> Delete
              </Button>
              <div className="flex space-x-2">
                <Button type="button" variant="outline" onClick={handleDialogCancel} disabled={form.formState.isSubmitting}>Cancel</Button>
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Changes
                </Button>
              </div>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
