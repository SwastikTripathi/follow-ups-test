
'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from '@/hooks/use-toast';
import { Loader2, Sparkles } from 'lucide-react';
import { useGeminiApiKey } from '@/hooks/useGeminiApiKey';
import { ApiKeyDialog } from './ApiKeyDialog';
import { GoogleGenerativeAI } from '@google/generative-ai';

const generateSchema = z.object({
  jobDescription: z.string().min(20, "Please provide a more detailed job description (at least 20 characters).").max(5000, "Job description cannot exceed 5000 characters."),
});
type GenerateFormValues = z.infer<typeof generateSchema>;

interface GenerateFollowUpsDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  jobDescription: string;
  onFollowUpsGenerated: (followUps: {
    followUp1: { subject: string, body: string },
    followUp2: { subject: string, body: string },
    followUp3: { subject: string, body: string }
  }) => void;
}

const followUpOutputSchema = z.object({
  roleTitle: z.string().describe("The role or job title extracted from the description."),
  companyName: z.string().describe("The company name extracted from the description."),
  followUp1: z.object({
    subject: z.string().describe("Subject line for the first follow-up email."),
    body: z.string().describe("Body content for the first follow-up email, WITHOUT any signature."),
  }),
  followUp2: z.object({
    subject: z.string().describe("Subject line for the second follow-up email."),
    body: z.string().describe("Body content for the second follow-up email, WITHOUT any signature."),
  }),
  followUp3: z.object({
    subject: z.string().describe("Subject line for the third follow-up email."),
    body: z.string().describe("Body content for the third follow-up email, WITHOUT any signature."),
  }),
});

export function GenerateFollowUpsDialog({
  isOpen,
  onOpenChange,
  jobDescription,
  onFollowUpsGenerated,
}: GenerateFollowUpsDialogProps) {
  const { apiKey, setApiKey } = useGeminiApiKey();
  const [isApiKeyDialogOpen, setIsApiKeyDialogOpen] = useState(false);
  const { toast } = useToast();

  const form = useForm<GenerateFormValues>({
    resolver: zodResolver(generateSchema),
    defaultValues: {
      jobDescription: jobDescription,
    },
  });

  useEffect(() => {
    form.setValue('jobDescription', jobDescription);
  }, [jobDescription, form]);

  const onSubmit = async (values: GenerateFormValues) => {
    if (!apiKey) {
      setIsApiKeyDialogOpen(true);
      return;
    }

    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ 
          model: "gemini-1.5-flash",
          generationConfig: { responseMimeType: "application/json" }
      });

      const prompt = `
        You are an expert career advisor and copywriter. 
        Analyze the job description below to extract the role title and company name. 
        Then, generate three distinct follow-up emails based on the guidelines.

        Job Description:
        ---
        ${values.jobDescription}
        ---

        **CRITICAL INSTRUCTIONS:**
        1.  **DO NOT ADD A SIGNATURE**: You MUST NOT add any signature or closing (like "Best regards," or the user's name) to the email bodies. Your response for each email body should end with the last sentence of the main content.
        2.  **DO NOT INVENT INFORMATION**: Do not invent facts about the user's experience or the company's achievements. Ground your response strictly in the provided job description.
        3.  **JSON Output**: Your entire output must be a single, valid JSON object that conforms to this Zod schema: ${JSON.stringify(followUpOutputSchema.shape)}.

        **GENERATION GUIDELINES:**
        - **First Follow-Up (1 week after):** A polite check-in. Reiterate strong interest. Briefly mention a key skill or requirement *from the job description* and state alignment with it. Keep it concise but professional, around 3-4 sentences.
        - **Second Follow-Up (2 weeks after):** Add value. Briefly mention a recent company achievement or news *only if it is widely known and public*. Otherwise, share a relevant insight about the industry or express enthusiasm for a specific aspect of the role from the description. Aim for 4-5 sentences.
        - **Third Follow-Up (3 weeks after):** A brief check-in to show continued interest. Reaffirm enthusiasm and availability, and politely inquire about the timeline. This follow-up should not indicate it is the last one. Keep it short, around 2-3 sentences.
        
        Return the complete, finalized content for all three follow-ups in the specified JSON format.
      `;

      const result = await model.generateContent(prompt);
      const responseText = result.response.text();
      const parsedJson = JSON.parse(responseText);
      const validatedOutput = followUpOutputSchema.safeParse(parsedJson);

      if (!validatedOutput.success) {
        throw new Error(`AI response did not match the expected format. ${validatedOutput.error.message}`);
      }
      
      onFollowUpsGenerated(validatedOutput.data);
      onOpenChange(false);

    } catch (error: any) {
      let errorMessage = 'Failed to generate follow-ups.';
      if (error.message.includes('API key not valid')) {
        errorMessage = 'Your API key is invalid. Please check and save it again.';
        setApiKey(null); // Clear the invalid key
        setIsApiKeyDialogOpen(true);
      } else if (error.message.includes('429')) {
        errorMessage = 'You have exceeded your free API quota. Please check your Google AI Studio account.';
      } else {
        errorMessage = error.message;
      }
      toast({ title: 'AI Generation Error', description: errorMessage, variant: 'destructive' });
    }
  };

  const handleApiKeySubmitted = (newApiKey: string) => {
    setApiKey(newApiKey);
    setIsApiKeyDialogOpen(false);
    toast({ title: 'API Key Saved!', description: 'Your key is saved in your browser. You can now generate follow-ups.' });
    // Automatically trigger form submission again
    form.handleSubmit(onSubmit)();
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-headline flex items-center">
              <Sparkles className="mr-2 h-5 w-5 text-primary" />
              Generate Follow-Up Emails with AI
            </DialogTitle>
            <DialogDescription>
              Use the job description or your notes to automatically generate three follow-up email drafts. You can edit them before saving.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
              <FormField
                control={form.control}
                name="jobDescription"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Job Description or Notes</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Paste the job description or any relevant notes here..."
                        rows={10}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Generate
                </Button>
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
