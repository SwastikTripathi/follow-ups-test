
'use client';

import React, { useState } from 'react';
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
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, KeyRound, ExternalLink } from 'lucide-react';
import Link from 'next/link';

interface ApiKeyDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onApiKeySubmit: (apiKey: string) => void;
}

export function ApiKeyDialog({ isOpen, onOpenChange, onApiKeySubmit }: ApiKeyDialogProps) {
  const [apiKey, setApiKey] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const handleSubmit = () => {
    if (!apiKey.trim()) {
      toast({
        title: 'API Key Required',
        description: 'Please enter a valid Gemini API key.',
        variant: 'destructive',
      });
      return;
    }
    setIsSaving(true);
    onApiKeySubmit(apiKey);
    // The parent will handle closing the dialog and showing success toast
    setIsSaving(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md shadow-xl">
        <DialogHeader>
          <DialogTitle className="font-headline flex items-center">
            <KeyRound className="mr-2 h-5 w-5 text-primary" />
            Enter Your Gemini API Key
          </DialogTitle>
          <DialogDescription>
            To use AI features, you need a free Google AI Studio API key. Your key is stored securely in your browser and is never sent to our servers.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <h4 className="font-semibold text-sm">How to get your key:</h4>
            <ol className="list-decimal list-inside text-sm text-muted-foreground space-y-1">
              <li>Go to <Link href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-semibold">Google AI Studio <ExternalLink className="inline-block h-3 w-3 ml-0.5" /></Link>.</li>
              <li>Click "Create API key in new project".</li>
              <li>Copy the generated key and paste it below.</li>
            </ol>
          </div>
          <div className="space-y-2">
            <Label htmlFor="api-key-input">Your Gemini API Key</Label>
            <Input
              id="api-key-input"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Paste your API key here"
              disabled={isSaving}
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save & Continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
