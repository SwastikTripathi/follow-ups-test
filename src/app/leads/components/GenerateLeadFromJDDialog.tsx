
'use client';

import React, { useState } from 'react';
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
import { Loader2, Sparkles, Wand2 } from 'lucide-react';
import { useGeminiApiKey } from '@/hooks/useGeminiApiKey';
import { ApiKeyDialog } from './ApiKeyDialog';
import type { AddLeadFormValues } from './shared/leadSchemas';
import { generateLeadFromJD } from '@/lib/ai/client';
import type { User } from '@supabase/supabase-js';
import type { UserSettings } from '@/lib/types';
import { useCurrentSubscription } from '@/hooks/use-current-subscription';
import { useUserDataCache } from '@/contexts/UserDataCacheContext';
import { Input } from '@/components/ui/input';


const generateSchema = z.object({
  jobDescription: z.string().min(20, "Please provide a more detailed job description (at least 20 characters).").max(5000, "Job description cannot exceed 5000 characters."),
  userContext: z.string().max(2000, "Context notes cannot exceed 2000 characters.").optional(),
});
type GenerateFormValues = z.infer<typeof generateSchema>;

interface GenerateLeadFromJDDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onLeadGenerated: (prefillData: Partial<AddLeadFormValues>) => void;
  user: User | null;
  userSettings: UserSettings | null;
}

export function GenerateLeadFromJDDialog({
  isOpen,
  onOpenChange,
  onLeadGenerated,
  user,
  userSettings,
}: GenerateLeadFromJDDialogProps) {
  const { apiKey, setApiKey } = useGeminiApiKey();
  const [isApiKeyDialogOpen, setIsApiKeyDialogOpen] = useState(false);
  const { toast } = useToast();
  const { effectiveLimits, isPrivilegedUser } = useCurrentSubscription();
  const { incrementCachedAiUsage } = useUserDataCache();

  const form = useForm<GenerateFormValues>({
    resolver: zodResolver(generateSchema),
    defaultValues: {
      jobDescription: "",
      userContext: "",
    },
  });

  const onSubmit = async (values: GenerateFormValues) => {
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

    try {
        const generatedData = await generateLeadFromJD(apiKey, values.jobDescription, values.userContext || '', user, userSettings);
        
        if (generatedData) {
            incrementCachedAiUsage();
            onLeadGenerated({
                roleTitle: generatedData.roleTitle,
                companyName: generatedData.companyName,
                notes: '', // Keep notes blank as requested
                initialEmail: generatedData.initialEmail,
                followUp1: generatedData.followUp1,
                followUp2: generatedData.followUp2,
                followUp3: generatedData.followUp3,
            });
            toast({ title: 'Lead Drafted!', description: 'Review the details and add contact information.' });
            onOpenChange(false);
        }

    } catch (error: any) {
      let errorMessage = 'Failed to generate lead draft.';
      if (error.message.includes('API key not valid')) {
        errorMessage = 'Your API key is invalid. Please check and save it again.';
        setApiKey(null); 
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
    toast({ title: 'API Key Saved!', description: 'Your key is saved in your browser. You can now generate the lead draft.' });
    // Automatically trigger form submission again
    form.handleSubmit(onSubmit)();
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-headline flex items-center">
              <Wand2 className="mr-2 h-5 w-5 text-primary" />
              Add Lead with AI
            </DialogTitle>
            <DialogDescription>
              Paste any relevant text below. The AI will extract key details and generate a full lead draft for you.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2 max-h-[70vh] overflow-y-auto px-1 pr-2">
              <FormField
                control={form.control}
                name="jobDescription"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Your Prompt</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Paste a job description, sales lead info, or networking context here. The AI will write emails for you."
                        rows={10}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="userContext"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Additional Context (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., Mention my X project; Keep the tone very formal."
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
                  Generate Lead Draft
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
