
'use client';

import React, { useState } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { CalendarIcon, FileText, Loader2, PlusCircle, Trash2, X, Linkedin, Instagram, Twitter, Link2, Save, Ban, Pencil, Image as ImageIcon } from 'lucide-react';
import { format, parseISO, isValid } from 'date-fns';
import type { ResumeData, UserSettings } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';

const urlFieldSchema = z.object({
  id: z.string().optional(),
  value: z.string().url("Must be a valid URL").max(2048, "URL is too long.").or(z.literal('')),
});
const skillSchema = z.object({
    id: z.string().optional(),
    value: z.string().min(1).max(50, "Skill cannot exceed 50 characters."),
});

// Zod Schemas for Resume sections
const resumeContactInfoSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, "Name cannot exceed 100 characters."),
  email: z.string().email('Invalid email address').max(254, "Email is too long."),
  phone: z.string().min(1, 'Phone number is required').max(50, "Phone number is too long."),
  location: z.string().min(1, 'Location is required').max(100, "Location cannot exceed 100 characters."),
  summary: z.string().max(1000, 'Summary is too long (max 1000 characters).').optional(),
});

const resumeSocialsSchema = z.object({
    linkedin: z.string().url("Must be a valid LinkedIn URL").optional().or(z.literal('')),
    instagram: z.string().url("Must be a valid Instagram URL").optional().or(z.literal('')),
    twitter: z.string().url("Must be a valid Twitter/X URL").optional().or(z.literal('')),
    otherLinks: z.array(urlFieldSchema).max(3, "You can add up to 3 other links.").optional(),
});

const resumeExperienceSchema = z.object({
  id: z.string(),
  company: z.string().min(1, 'Company name is required').max(100, "Company name cannot exceed 100 characters."),
  role: z.string().min(1, 'Role is required').max(100, "Role cannot exceed 100 characters."),
  description: z.string().max(2000, "Description cannot exceed 2000 characters.").optional(),
  startDate: z.date().optional(),
  endDate: z.date().optional().nullable(),
  isCurrent: z.boolean(),
  skillsUsed: z.array(skillSchema).optional(),
});

const resumeEducationSchema = z.object({
  id: z.string(),
  institution: z.string().min(1, 'Institution is required').max(150, "Institution name cannot exceed 150 characters."),
  degree: z.string().min(1, 'Degree is required').max(150, "Degree cannot exceed 150 characters."),
  field: z.string().max(150, "Field of study cannot exceed 150 characters.").optional(),
  summary: z.string().max(1000, "Summary cannot exceed 1000 characters.").optional(),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  skillsUsed: z.array(skillSchema).optional(),
});

const projectImageSchema = z.object({
  id: z.string().optional(),
  value: z.string().url("Must be a valid URL").or(z.literal('')),
});

const resumeProjectSchema = z.object({
  id: z.string(),
  title: z.string().min(1, 'Project title is required').max(150, "Title cannot exceed 150 characters."),
  description: z.string().max(2000, "Description cannot exceed 2000 characters.").optional(),
  url: z.string().url("Must be a valid URL").optional().or(z.literal('')),
  endDate: z.date().optional(),
  skillsUsed: z.array(skillSchema).optional(),
  imageUrls: z.array(projectImageSchema).max(5, "You can add up to 5 images.").optional(),
});

const certificateImageSchema = z.object({
  id: z.string().optional(),
  value: z.string().url("Must be a valid URL").or(z.literal('')),
});

const resumeCertificateSchema = z.object({
  id: z.string(),
  title: z.string().min(1, 'Title is required').max(150, "Title cannot exceed 150 characters."),
  description: z.string().max(1000, "Description is too long.").optional(),
  date: z.date().optional(),
  imageUrls: z.array(certificateImageSchema).max(5, "You can add up to 5 images.").optional(),
});

export const resumeSchema = z.object({
  contactInfo: resumeContactInfoSchema,
  socials: resumeSocialsSchema.optional(),
  experiences: z.array(resumeExperienceSchema).optional(),
  education: z.array(resumeEducationSchema).optional(),
  skills: z.array(skillSchema).optional(),
  projects: z.array(resumeProjectSchema).optional(),
  certificates: z.array(resumeCertificateSchema).optional(),
});


type ResumeFormValues = z.infer<typeof resumeSchema>;

interface ResumeFormProps {
  initialData?: ResumeData | null;
  onSave: (data: any) => void;
  isLoading: boolean;
  showSkeleton: boolean;
}

// Helper to convert array of strings to array of objects, and vice versa
const stringsToSkillObjects = (skills: string[] = []): { value: string }[] => skills.map(s => ({ value: s }));
const skillObjectsToStrings = (skills: { value: string }[] = []): string[] => skills.map(s => s.value);
const stringsToUrlObjects = (urls: string[] = []): { value: string }[] => urls.map(u => ({ value: u }));
const urlObjectsToStrings = (urls: { value: string }[] = []): string[] => urls.map(u => u.value);
const stringsToImageObjects = (urls: string[] = []): { value: string }[] => urls.map(u => ({ value: u }));
const imageObjectsToStrings = (urls: { value: string }[] = []): string[] => urls.map(u => u.value);


const getSanitizedDefaultValues = (resume?: ResumeData | null): ResumeFormValues => {
    const safeParseDate = (date: any): Date | undefined => {
        if (!date) return undefined;
        try {
            const parsed = parseISO(date as string);
            return isValid(parsed) ? parsed : undefined;
        } catch {
            return undefined;
        }
    };
    
    return {
        contactInfo: {
            name: resume?.contactInfo?.name || '',
            email: resume?.contactInfo?.email || '',
            phone: resume?.contactInfo?.phone || '',
            location: resume?.contactInfo?.location || '',
            summary: resume?.contactInfo?.summary || '',
        },
        socials: {
            linkedin: resume?.socials?.linkedin || '',
            instagram: resume?.socials?.instagram || '',
            twitter: resume?.socials?.twitter || '',
            otherLinks: stringsToUrlObjects(resume?.socials?.otherLinks),
        },
        experiences: (resume?.experiences || []).map(exp => ({
            id: exp.id || crypto.randomUUID(),
            company: exp.company || '',
            role: exp.role || '',
            description: exp.description || '',
            startDate: safeParseDate(exp.startDate),
            endDate: exp.endDate ? safeParseDate(exp.endDate) : null,
            isCurrent: exp.isCurrent || false,
            skillsUsed: stringsToSkillObjects(exp.skillsUsed),
        })),
        education: (resume?.education || []).map(edu => ({
            id: edu.id || crypto.randomUUID(),
            institution: edu.institution || '',
            degree: edu.degree || '',
            field: edu.field || '',
            summary: edu.summary || '',
            startDate: safeParseDate(edu.startDate),
            endDate: safeParseDate(edu.endDate),
            skillsUsed: stringsToSkillObjects(edu.skillsUsed),
        })),
        skills: stringsToSkillObjects(resume?.skills),
        projects: (resume?.projects || []).map(proj => ({
            id: proj.id || crypto.randomUUID(),
            title: proj.title || '',
            description: proj.description || '',
            url: proj.url || '',
            endDate: safeParseDate(proj.endDate),
            skillsUsed: stringsToSkillObjects(proj.skillsUsed),
            imageUrls: stringsToImageObjects(proj.imageUrls),
        })),
        certificates: (resume?.certificates || []).map(cert => ({
            id: cert.id || crypto.randomUUID(),
            title: cert.title || '',
            description: cert.description || '',
            date: safeParseDate(cert.date),
            imageUrls: stringsToImageObjects(cert.imageUrls),
        })),
    };
};

export function ResumeForm({ initialData, onSave, isLoading, showSkeleton }: ResumeFormProps) {
  const { toast } = useToast();
  const form = useForm<ResumeFormValues>({
    resolver: zodResolver(resumeSchema),
    defaultValues: getSanitizedDefaultValues(initialData),
  });
  
  React.useEffect(() => {
    form.reset(getSanitizedDefaultValues(initialData));
  }, [initialData, form]);

  const { fields: expFields, append: appendExp, remove: removeExp } = useFieldArray({ control: form.control, name: 'experiences' });
  const { fields: eduFields, append: appendEdu, remove: removeEdu } = useFieldArray({ control: form.control, name: 'education' });
  const { fields: projFields, append: appendProj, remove: removeProj } = useFieldArray({ control: form.control, name: 'projects' });
  const { fields: skillFields, append: appendSkill, remove: removeSkill } = useFieldArray({ control: form.control, name: 'skills' });
  const { fields: otherLinkFields, append: appendOtherLink, remove: removeOtherLink } = useFieldArray({ control: form.control, name: 'socials.otherLinks' });
  const { fields: certFields, append: appendCert, remove: removeCert } = useFieldArray({ control: form.control, name: 'certificates' });

  const [skillInput, setSkillInput] = useState('');
  
  const handleSkillKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, fieldName?: `experiences.${number}.skillsUsed` | `education.${number}.skillsUsed` | `projects.${number}.skillsUsed` | 'skills', index?: number) => {
    const target = e.target as HTMLInputElement;
    const value = target.value.trim();
    if (e.key === 'Enter' && value !== '') {
      e.preventDefault();
      
      const currentSkills: {value: string}[] = fieldName ? form.getValues(fieldName) || [] : form.getValues('skills') || [];
      if (currentSkills.some(skill => skill.value.toLowerCase() === value.toLowerCase())) {
        toast({ title: "Duplicate Skill", description: "This skill has already been added.", variant: 'default' });
        return;
      }
      
      if (fieldName) {
        form.setValue(fieldName, [...currentSkills, { value }]);
      } else {
        appendSkill({ value });
      }
      
      target.value = '';
    }
  };
  
  const onInvalid = (errors: any) => {
    console.error("Form validation failed. Errors:", errors);
    toast({
        title: "Validation Error",
        description: "Please check the form for errors. Some fields may have invalid data.",
        variant: "destructive"
    });
  };

  const onSubmit = (data: ResumeFormValues) => {
    // Convert arrays of objects back to arrays of strings before saving
    const finalData = {
        ...data,
        socials: {
            ...data.socials,
            otherLinks: urlObjectsToStrings(data.socials?.otherLinks),
        },
        experiences: data.experiences?.map(exp => ({ ...exp, skillsUsed: skillObjectsToStrings(exp.skillsUsed) })),
        education: data.education?.map(edu => ({ ...edu, skillsUsed: skillObjectsToStrings(edu.skillsUsed) })),
        skills: skillObjectsToStrings(data.skills),
        projects: data.projects?.map(proj => ({ ...proj, skillsUsed: skillObjectsToStrings(proj.skillsUsed), imageUrls: imageObjectsToStrings(proj.imageUrls) })),
        certificates: data.certificates?.map(cert => ({ ...cert, imageUrls: imageObjectsToStrings(cert.imageUrls) })),
    };
    onSave(finalData);
  };
  
  if (showSkeleton) {
    return (
       <Card id="your-resume" className="shadow-lg">
          <CardHeader>
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="h-4 w-3/4" />
          </CardHeader>
          <CardContent className="space-y-6">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-20 w-full" />
          </CardContent>
          <CardFooter>
            <Skeleton className="h-10 w-24 ml-auto" />
          </CardFooter>
        </Card>
    )
  }

  return (
    <Card id="your-resume" className="shadow-lg">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit, onInvalid)}>
          <CardHeader>
            <CardTitle className="font-headline flex items-center"><FileText className="mr-2 h-5 w-5 text-primary"/> Your Resume</CardTitle>
            <CardDescription>Fill out your resume details. This information will be used to help generate highly personalized AI content.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            
            {/* Contact Info */}
            <section>
              <h3 className="text-lg font-semibold mb-3">Contact Information</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField control={form.control} name="contactInfo.name" render={({ field }) => ( <FormItem><FormLabel>Full Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                  <FormField control={form.control} name="contactInfo.email" render={({ field }) => ( <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem> )} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField control={form.control} name="contactInfo.phone" render={({ field }) => ( <FormItem><FormLabel>Phone</FormLabel><FormControl><Input type="tel" {...field} /></FormControl><FormMessage /></FormItem> )} />
                  <FormField control={form.control} name="contactInfo.location" render={({ field }) => ( <FormItem><FormLabel>Location</FormLabel><FormControl><Input {...field} placeholder="e.g. San Francisco, CA" /></FormControl><FormMessage /></FormItem> )} />
                </div>
                <FormField control={form.control} name="contactInfo.summary" render={({ field }) => ( <FormItem><FormLabel>Professional Summary (Optional)</FormLabel><FormControl><Textarea {...field} rows={4} /></FormControl><FormMessage /></FormItem> )} />
              </div>
            </section>
            
            <hr />

            {/* Socials */}
            <section>
              <h3 className="text-lg font-semibold mb-3">Socials</h3>
              <div className="space-y-4">
                <FormField control={form.control} name="socials.linkedin" render={({ field }) => ( <FormItem><FormLabel className="flex items-center"><Linkedin className="mr-2 h-4 w-4 text-muted-foreground"/>LinkedIn URL</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                <FormField control={form.control} name="socials.instagram" render={({ field }) => ( <FormItem><FormLabel className="flex items-center"><Instagram className="mr-2 h-4 w-4 text-muted-foreground"/>Instagram URL</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                <FormField control={form.control} name="socials.twitter" render={({ field }) => ( <FormItem><FormLabel className="flex items-center"><Twitter className="mr-2 h-4 w-4 text-muted-foreground"/>Twitter/X URL</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                <div>
                    <FormLabel>Other Links (max 3)</FormLabel>
                    <div className="space-y-2 mt-2">
                        {otherLinkFields.map((field, index) => (
                             <FormField
                                key={field.id}
                                control={form.control}
                                name={`socials.otherLinks.${index}.value`}
                                render={({ field }) => (
                                <FormItem>
                                    <div className="flex items-center gap-2">
                                        <FormControl><Input {...field} placeholder="https://your-portfolio.com"/></FormControl>
                                        <Button type="button" variant="ghost" size="icon" onClick={() => removeOtherLink(index)}><Trash2 className="h-4 w-4 text-destructive"/></Button>
                                    </div>
                                    <FormMessage/>
                                </FormItem>
                                )}
                            />
                        ))}
                    </div>
                     {otherLinkFields.length < 3 && (
                        <Button type="button" variant="outline" size="sm" onClick={() => appendOtherLink({ value: '' })} className="mt-2"><PlusCircle className="mr-2 h-4 w-4"/>Add Other Link</Button>
                    )}
                </div>
              </div>
            </section>

            <hr />

            {/* Experience */}
            <section>
              <h3 className="text-lg font-semibold mb-3">Work Experience</h3>
              <div className="space-y-6">
                {expFields.map((field, index) => (
                  <div key={field.id} className="p-4 border rounded-md relative space-y-4">
                     <Button type="button" variant="ghost" size="icon" className="absolute top-1 right-1 h-7 w-7 text-destructive hover:text-destructive/80" onClick={() => removeExp(index)}><Trash2 className="h-4 w-4" /></Button>
                    <FormField control={form.control} name={`experiences.${index}.company`} render={({ field }) => ( <FormItem><FormLabel>Company</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                    <FormField control={form.control} name={`experiences.${index}.role`} render={({ field }) => ( <FormItem><FormLabel>Role</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField control={form.control} name={`experiences.${index}.startDate`} render={({ field }) => ( <FormItem><FormLabel>Start Date</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant="outline" className={cn("w-full text-left font-normal", !field.value && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4" />{field.value ? format(field.value, 'PPP') : <span>Pick a date</span>}</Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value ?? undefined} onSelect={field.onChange} /></PopoverContent></Popover><FormMessage /></FormItem> )} />
                      <FormField control={form.control} name={`experiences.${index}.endDate`} render={({ field }) => ( <FormItem><FormLabel>End Date</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant="outline" disabled={form.watch(`experiences.${index}.isCurrent`)} className={cn("w-full text-left font-normal", !field.value && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4" />{field.value ? format(field.value, 'PPP') : <span>Pick a date</span>}</Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value || undefined} onSelect={field.onChange} /></PopoverContent></Popover><FormMessage /></FormItem> )} />
                    </div>
                     <FormField control={form.control} name={`experiences.${index}.isCurrent`} render={({ field }) => ( <FormItem className="flex flex-row items-center space-x-3 space-y-0"><FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl><FormLabel className="font-normal">I currently work here</FormLabel></FormItem> )} />
                    <FormField control={form.control} name={`experiences.${index}.description`} render={({ field }) => ( <FormItem><FormLabel>Description (Optional)</FormLabel><FormControl><Textarea {...field} rows={4} /></FormControl><FormMessage /></FormItem> )} />
                    <FormItem>
                      <FormLabel>Skills Used (Optional)</FormLabel>
                       <div className="flex flex-wrap gap-2">
                        {form.watch(`experiences.${index}.skillsUsed`)?.map((skill, skillIndex) => (
                          <div key={skillIndex} className="flex items-center gap-1 bg-muted text-muted-foreground rounded-full px-3 py-1 text-sm">
                            <span>{skill.value}</span>
                            <button type="button" onClick={() => { const current = form.getValues(`experiences.${index}.skillsUsed`) || []; form.setValue(`experiences.${index}.skillsUsed`, current.filter((_, i) => i !== skillIndex)); }} className="rounded-full hover:bg-muted-foreground/20 p-0.5"><X className="h-3 w-3"/></button>
                          </div>
                        ))}
                      </div>
                      <FormControl><Input placeholder="Type skill and press Enter" onKeyDown={(e) => handleSkillKeyDown(e, `experiences.${index}.skillsUsed`)} /></FormControl>
                    </FormItem>
                  </div>
                ))}
                <Button type="button" variant="outline" onClick={() => appendExp({ id: crypto.randomUUID(), company: '', role: '', description: '', isCurrent: false, skillsUsed: [] })}><PlusCircle className="mr-2"/> Add Experience</Button>
              </div>
            </section>
            
            <hr />

            {/* Education */}
            <section>
              <h3 className="text-lg font-semibold mb-3">Education</h3>
              <div className="space-y-6">
                {eduFields.map((field, index) => (
                  <div key={field.id} className="p-4 border rounded-md relative space-y-4">
                     <Button type="button" variant="ghost" size="icon" className="absolute top-1 right-1 h-7 w-7 text-destructive hover:text-destructive/80" onClick={() => removeEdu(index)}><Trash2 className="h-4 w-4" /></Button>
                    <FormField control={form.control} name={`education.${index}.institution`} render={({ field }) => ( <FormItem><FormLabel>Institution</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField control={form.control} name={`education.${index}.degree`} render={({ field }) => ( <FormItem><FormLabel>Degree</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                      <FormField control={form.control} name={`education.${index}.field`} render={({ field }) => ( <FormItem><FormLabel>Field of Study (Optional)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                    </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField control={form.control} name={`education.${index}.startDate`} render={({ field }) => ( <FormItem><FormLabel>Start Date</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant="outline" className={cn("w-full text-left font-normal", !field.value && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4" />{field.value ? format(field.value, 'PPP') : <span>Pick a date</span>}</Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} /></PopoverContent></Popover><FormMessage /></FormItem> )} />
                      <FormField control={form.control} name={`education.${index}.endDate`} render={({ field }) => ( <FormItem><FormLabel>End Date (or expected)</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant="outline" className={cn("w-full text-left font-normal", !field.value && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4" />{field.value ? format(field.value, 'PPP') : <span>Pick a date</span>}</Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} /></PopoverContent></Popover><FormMessage /></FormItem> )} />
                    </div>
                    <FormField control={form.control} name={`education.${index}.summary`} render={({ field }) => ( <FormItem><FormLabel>Summary (Optional)</FormLabel><FormControl><Textarea {...field} rows={3} /></FormControl><FormMessage /></FormItem> )} />
                     <FormItem>
                      <FormLabel>Skills Gained (Optional)</FormLabel>
                      <div className="flex flex-wrap gap-2">
                        {form.watch(`education.${index}.skillsUsed`)?.map((skill, skillIndex) => (
                          <div key={skillIndex} className="flex items-center gap-1 bg-muted text-muted-foreground rounded-full px-3 py-1 text-sm">
                            <span>{skill.value}</span>
                            <button type="button" onClick={() => { const current = form.getValues(`education.${index}.skillsUsed`) || []; form.setValue(`education.${index}.skillsUsed`, current.filter((_, i) => i !== skillIndex)); }} className="rounded-full hover:bg-muted-foreground/20 p-0.5"><X className="h-3 w-3"/></button>
                          </div>
                        ))}
                      </div>
                      <FormControl><Input placeholder="Type skill and press Enter" onKeyDown={(e) => handleSkillKeyDown(e, `education.${index}.skillsUsed`)} /></FormControl>
                    </FormItem>
                  </div>
                ))}
                <Button type="button" variant="outline" onClick={() => appendEdu({ id: crypto.randomUUID(), institution: '', degree: '', skillsUsed: [] })}><PlusCircle className="mr-2"/> Add Education</Button>
              </div>
            </section>

            <hr />

            {/* Skills */}
            <section>
              <h3 className="text-lg font-semibold mb-3">General Skills</h3>
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {skillFields.map((field, index) => (
                    <div key={field.id} className="flex items-center gap-1 bg-muted text-muted-foreground rounded-full px-3 py-1 text-sm">
                      <span>{field.value}</span>
                      <button type="button" onClick={() => removeSkill(index)} className="rounded-full hover:bg-muted-foreground/20 p-0.5"><X className="h-3 w-3"/></button>
                    </div>
                  ))}
                </div>
                <Input value={skillInput} onChange={(e) => setSkillInput(e.target.value)} onKeyDown={(e) => handleSkillKeyDown(e, 'skills')} placeholder="Type a general skill and press Enter" />
              </div>
            </section>
            
            <hr />

            {/* Projects */}
             <section>
              <h3 className="text-lg font-semibold mb-3">Projects</h3>
              <div className="space-y-6">
                {projFields.map((field, index) => (
                  <div key={field.id} className="p-4 border rounded-md relative space-y-4">
                    <Button type="button" variant="ghost" size="icon" className="absolute top-1 right-1 h-7 w-7 text-destructive hover:text-destructive/80" onClick={() => removeProj(index)}><Trash2 className="h-4 w-4" /></Button>
                    <FormField control={form.control} name={`projects.${index}.title`} render={({ field }) => ( <FormItem><FormLabel>Project Title</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                    <FormField control={form.control} name={`projects.${index}.url`} render={({ field }) => ( <FormItem><FormLabel>Project URL (Optional)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                    <FormField control={form.control} name={`projects.${index}.description`} render={({ field }) => ( <FormItem><FormLabel>Description (Optional)</FormLabel><FormControl><Textarea {...field} rows={3} /></FormControl><FormMessage /></FormItem> )} />
                    <FormField control={form.control} name={`projects.${index}.endDate`} render={({ field }) => ( <FormItem><FormLabel>End Date</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant="outline" className={cn("w-full text-left font-normal", !field.value && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4" />{field.value ? format(field.value, 'PPP') : <span>Pick a date</span>}</Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} /></PopoverContent></Popover><FormMessage /></FormItem> )} />
                    <FormItem>
                      <FormLabel>Skills Used (Optional)</FormLabel>
                       <div className="flex flex-wrap gap-2">
                        {form.watch(`projects.${index}.skillsUsed`)?.map((skill, skillIndex) => (
                          <div key={skillIndex} className="flex items-center gap-1 bg-muted text-muted-foreground rounded-full px-3 py-1 text-sm">
                            <span>{skill.value}</span>
                            <button type="button" onClick={() => { const current = form.getValues(`projects.${index}.skillsUsed`) || []; form.setValue(`projects.${index}.skillsUsed`, current.filter((_, i) => i !== skillIndex)); }} className="rounded-full hover:bg-muted-foreground/20 p-0.5"><X className="h-3 w-3"/></button>
                          </div>
                        ))}
                      </div>
                      <FormControl><Input placeholder="Type skill and press Enter" onKeyDown={(e) => handleSkillKeyDown(e, `projects.${index}.skillsUsed`)} /></FormControl>
                    </FormItem>
                    <Controller
                        control={form.control}
                        name={`projects.${index}.imageUrls`}
                        render={({ field }) => (
                           <ProjectImageGallery
                                imageUrls={field.value || []}
                                onUrlsChange={(urls) => field.onChange(urls)}
                            />
                        )}
                    />
                  </div>
                ))}
                <Button type="button" variant="outline" onClick={() => appendProj({ id: crypto.randomUUID(), title: '', url: '', skillsUsed: [], imageUrls: [] })}><PlusCircle className="mr-2"/> Add Project</Button>
              </div>
            </section>

             <hr />

            {/* Certificates & Achievements */}
            <section>
              <h3 className="text-lg font-semibold mb-3">Certificates &amp; Achievements</h3>
              <div className="space-y-6">
                {certFields.map((field, index) => (
                  <div key={field.id} className="p-4 border rounded-md relative space-y-4">
                     <Button type="button" variant="ghost" size="icon" className="absolute top-1 right-1 h-7 w-7 text-destructive hover:text-destructive/80" onClick={() => removeCert(index)}><Trash2 className="h-4 w-4" /></Button>
                    <FormField control={form.control} name={`certificates.${index}.title`} render={({ field }) => ( <FormItem><FormLabel>Title</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                    <FormField control={form.control} name={`certificates.${index}.description`} render={({ field }) => ( <FormItem><FormLabel>Description (Optional)</FormLabel><FormControl><Textarea {...field} rows={2} /></FormControl><FormMessage /></FormItem> )} />
                    <FormField control={form.control} name={`certificates.${index}.date`} render={({ field }) => ( <FormItem><FormLabel>Date Awarded</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant="outline" className={cn("w-full text-left font-normal", !field.value && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4" />{field.value ? format(field.value, 'PPP') : <span>Pick a date</span>}</Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} /></PopoverContent></Popover><FormMessage /></FormItem> )} />
                    <Controller
                        control={form.control}
                        name={`certificates.${index}.imageUrls`}
                        render={({ field }) => (
                            <CertificateImageGallery
                                imageUrls={field.value || []}
                                onUrlsChange={(urls) => field.onChange(urls)}
                            />
                        )}
                    />
                  </div>
                ))}
                <Button type="button" variant="outline" onClick={() => appendCert({ id: crypto.randomUUID(), title: '', description: '', imageUrls: [] })}><PlusCircle className="mr-2"/> Add Certificate/Achievement</Button>
              </div>
            </section>


          </CardContent>
          <CardFooter className="justify-end pt-4">
            <Button type="submit" size="lg" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save Resume
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}

// Reusable Image Gallery Component
const ProjectImageGallery: React.FC<{
  imageUrls: {id?:string, value: string}[];
  onUrlsChange: (urls: {id?:string, value: string}[]) => void;
}> = ({ imageUrls, onUrlsChange }) => {
  const { toast } = useToast();
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [enlargedImageUrl, setEnlargedImageUrl] = useState<string | null>(null);

  const handleAdd = () => {
    if (imageUrls.length >= 5) {
      toast({ title: "Image Limit Reached", description: "You can add a maximum of 5 images.", variant: 'default' });
      return;
    }
    onUrlsChange([...imageUrls, { value: '' }]);
    setEditingIndex(imageUrls.length);
    setInputValue('');
  };

  const handleEdit = (index: number) => {
    setEditingIndex(index);
    const fieldObject = imageUrls[index];
    setInputValue(fieldObject.value);
  };

  const handleSave = (index: number) => {
    const newUrls = [...imageUrls];
    newUrls[index] = { ...newUrls[index], value: inputValue };
    onUrlsChange(newUrls);
    setEditingIndex(null);
    setInputValue('');
  };
  
  const handleRemove = (index: number) => {
    onUrlsChange(imageUrls.filter((_, i) => i !== index));
    if (editingIndex === index) {
      setEditingIndex(null);
      setInputValue('');
    }
  };
  
  const handleCancel = (index: number) => {
    if (imageUrls[index]?.value === '') {
        handleRemove(index);
    }
    setEditingIndex(null);
    setInputValue('');
  };
  
  const convertGoogleDriveUrl = (url: string): string => {
    if (typeof url !== 'string' || !url) return '';
    if (url.includes('drive.google.com/file/d/')) {
      const fileIdMatch = url.match(/file\/d\/([a-zA-Z0-9_-]+)/);
      if (fileIdMatch && fileIdMatch[1]) {
        return `https://drive.google.com/uc?export=view&id=${fileIdMatch[1]}`;
      }
    }
    return url;
  };

  return (
    <>
      <div className="space-y-3">
        <label className="text-sm font-medium">Images (up to 5)</label>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {imageUrls.map((field, index) => {
            const imageUrl = field.value;
            const displayUrl = convertGoogleDriveUrl(imageUrl);
            return (
              <div key={index} className="relative aspect-video group">
                {editingIndex === index ? (
                  <div className="w-full h-full flex flex-col items-center justify-center p-2 border-2 border-primary rounded-md bg-muted/50">
                    <Input
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      placeholder="Paste image URL"
                      className="h-8 text-xs mb-2 focus-visible:ring-0 focus-visible:ring-offset-0"
                    />
                    <div className="flex gap-1.5">
                      <Button type="button" size="icon" className="h-6 w-6" onClick={() => handleSave(index)}><Save className="h-3.5 w-3.5" /></Button>
                      <Button type="button" variant="ghost" size="icon" className="h-6 w-6 hover:bg-transparent text-muted-foreground hover:text-muted-foreground" onClick={() => handleCancel(index)}><Ban className="h-3.5 w-3.5" /></Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <Image
                      src={displayUrl || 'https://placehold.co/400x300.png'}
                      alt={`Image ${index + 1}`}
                      width={400}
                      height={300}
                      className="w-full h-full object-cover rounded-md border cursor-pointer"
                      onClick={() => displayUrl && setEnlargedImageUrl(displayUrl)}
                      onError={(e) => { e.currentTarget.src = 'https://placehold.co/400x300.png'; }}
                    />
                    <div className="absolute top-1 right-1 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button type="button" size="icon" className="h-6 w-6 bg-black/60 hover:bg-black/80" onClick={() => handleEdit(index)}><Pencil className="h-3.5 w-3.5 text-white" /></Button>
                      <Button type="button" variant="destructive" size="icon" className="h-6 w-6 bg-destructive/80 hover:bg-destructive" onClick={() => handleRemove(index)}><Trash2 className="h-3.5 w-3.5 text-white" /></Button>
                    </div>
                  </>
                )}
              </div>
            )
          })}
          {imageUrls.length < 5 && (
            <Button type="button" variant="outline" className="h-full aspect-video w-full border-2 border-solid flex flex-col items-center justify-center hover:bg-muted/30" onClick={handleAdd}>
              <ImageIcon className="h-6 w-6 text-muted-foreground" />
              <span className="text-xs mt-1 text-muted-foreground">Add Image</span>
            </Button>
          )}
        </div>
      </div>
      {enlargedImageUrl && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 cursor-default"
          onClick={() => setEnlargedImageUrl(null)}
        >
          <Image
            src={enlargedImageUrl}
            alt="Enlarged view"
            width={1200}
            height={800}
            className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-2xl"
          />
        </div>
      )}
    </>
  );
};


const CertificateImageGallery: React.FC<{
    imageUrls: {id?:string, value: string}[];
    onUrlsChange: (urls: {id?:string, value: string}[]) => void;
  }> = ({ imageUrls, onUrlsChange }) => {
    const { toast } = useToast();
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [inputValue, setInputValue] = useState('');
    const [enlargedImageUrl, setEnlargedImageUrl] = useState<string | null>(null);
  
    const handleAdd = () => {
      if (imageUrls.length >= 5) {
        toast({ title: "Image Limit Reached", description: "You can add a maximum of 5 images.", variant: 'default' });
        return;
      }
      onUrlsChange([...imageUrls, { value: '' }]);
      setEditingIndex(imageUrls.length);
      setInputValue('');
    };
  
    const handleEdit = (index: number) => {
      setEditingIndex(index);
      const fieldObject = imageUrls[index];
      setInputValue(fieldObject.value);
    };
  
    const handleSave = (index: number) => {
      const newUrls = [...imageUrls];
      newUrls[index] = { ...newUrls[index], value: inputValue };
      onUrlsChange(newUrls);
      setEditingIndex(null);
      setInputValue('');
    };
    
    const handleRemove = (index: number) => {
      onUrlsChange(imageUrls.filter((_, i) => i !== index));
      if (editingIndex === index) {
        setEditingIndex(null);
        setInputValue('');
      }
    };
    
    const handleCancel = (index: number) => {
      if (imageUrls[index]?.value === '') {
          handleRemove(index);
      }
      setEditingIndex(null);
      setInputValue('');
    };
    
    const convertGoogleDriveUrl = (url: string): string => {
      if (typeof url !== 'string' || !url) return '';
      if (url.includes('drive.google.com/file/d/')) {
        const fileIdMatch = url.match(/file\/d\/([a-zA-Z0-9_-]+)/);
        if (fileIdMatch && fileIdMatch[1]) {
          return `https://drive.google.com/uc?export=view&id=${fileIdMatch[1]}`;
        }
      }
      return url;
    };
  
    return (
      <>
        <div className="space-y-3">
          <label className="text-sm font-medium">Images (up to 5)</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {imageUrls.map((field, index) => {
              const imageUrl = field.value;
              const displayUrl = convertGoogleDriveUrl(imageUrl);
              return (
                <div key={index} className="relative aspect-video group">
                  {editingIndex === index ? (
                    <div className="w-full h-full flex flex-col items-center justify-center p-2 border-2 border-primary rounded-md bg-muted/50">
                      <Input
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        placeholder="Paste image URL"
                        className="h-8 text-xs mb-2 focus-visible:ring-0 focus-visible:ring-offset-0"
                      />
                      <div className="flex gap-1.5">
                        <Button type="button" size="icon" className="h-6 w-6" onClick={() => handleSave(index)}><Save className="h-3.5 w-3.5" /></Button>
                        <Button type="button" variant="ghost" size="icon" className="h-6 w-6 hover:bg-transparent text-muted-foreground hover:text-muted-foreground" onClick={() => handleCancel(index)}><Ban className="h-3.5 w-3.5" /></Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <Image
                        src={displayUrl || 'https://placehold.co/400x300.png'}
                        alt={`Image ${index + 1}`}
                        width={400}
                        height={300}
                        className="w-full h-full object-cover rounded-md border cursor-pointer"
                        onClick={() => displayUrl && setEnlargedImageUrl(displayUrl)}
                        onError={(e) => { e.currentTarget.src = 'https://placehold.co/400x300.png'; }}
                      />
                      <div className="absolute top-1 right-1 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button type="button" size="icon" className="h-6 w-6 bg-black/60 hover:bg-black/80" onClick={() => handleEdit(index)}><Pencil className="h-3.5 w-3.5 text-white" /></Button>
                        <Button type="button" variant="destructive" size="icon" className="h-6 w-6 bg-destructive/80 hover:bg-destructive" onClick={() => handleRemove(index)}><Trash2 className="h-3.5 w-3.5 text-white" /></Button>
                      </div>
                    </>
                  )}
                </div>
              )
            })}
            {imageUrls.length < 5 && (
              <Button type="button" variant="outline" className="h-full aspect-video w-full border-2 border-solid flex flex-col items-center justify-center hover:bg-muted/30" onClick={handleAdd}>
                <ImageIcon className="h-6 w-6 text-muted-foreground" />
                <span className="text-xs mt-1 text-muted-foreground">Add Image</span>
              </Button>
            )}
          </div>
        </div>
        {enlargedImageUrl && (
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 cursor-default"
            onClick={() => setEnlargedImageUrl(null)}
          >
            <Image
              src={enlargedImageUrl}
              alt="Enlarged view"
              width={1200}
              height={800}
              className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-2xl"
            />
          </div>
        )}
      </>
    );
  };
