
import * as z from 'zod';

const contactEntrySchema = z.object({
  contact_id: z.string().optional(),
  contactName: z.string().min(1, "Contact name is required").max(100, "Name cannot exceed 100 characters."),
  contactEmail: z.string().email("Invalid email address").max(254, "Email is too long.").optional().or(z.literal('')),
  linkedin_url: z.string().url("Must be a valid LinkedIn URL").max(2048, "URL is too long.").optional().or(z.literal('')),
  phone: z.string().max(50, "Phone number is too long.").optional(),
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

const emailContentSchema = z.object({
  subject: z.string().max(255, "Subject cannot exceed 255 characters.").optional(),
  body: z.string().max(5000, "Body cannot exceed 5000 characters.").optional(),
});

export const addLeadSchema = z.object({
  companyName: z.string().min(1, "Company name is required").max(100, "Company name cannot exceed 100 characters."),
  company_id: z.string().optional(),
  roleTitle: z.string().min(1, "Lead / Role title is required").max(150, "Title cannot exceed 150 characters."),
  contacts: z.array(contactEntrySchema).min(1, "At least one contact is required."),
  initialEmailDate: z.date({ invalid_type_error: "Initial email date is required." }).default(() => new Date()),
  initialEmail: emailContentSchema,
  jobDescriptionUrl: z.string().url("Must be a valid URL").max(2048, "URL is too long.").optional().or(z.literal('')),
  notes: z.string().max(5000, "Notes cannot exceed 5000 characters.").optional(),
  followUp1: emailContentSchema,
  followUp2: emailContentSchema,
  followUp3: emailContentSchema,
});

export const editLeadSchema = addLeadSchema.extend({
  status: z.enum(['Watching', 'Applied', 'Emailed', 'Followed Up - Once', 'Followed Up - Twice', 'Followed Up - Thrice', 'No Response', 'Replied - Positive', 'Replied - Negative', 'Interviewing', 'Offer', 'Rejected', 'Closed']),
});

export type AddLeadFormValues = z.infer<typeof addLeadSchema>;
export type EditLeadFormValues = z.infer<typeof editLeadSchema>;
