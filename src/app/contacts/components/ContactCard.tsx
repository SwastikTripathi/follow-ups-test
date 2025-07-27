
'use client';

import type { Contact } from '@/lib/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { UserCircle2, Mail, Linkedin, Briefcase, Phone, Info, Copy, Star, Loader2, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import React, { useState, useMemo } from 'react';

interface ContactCardProps {
  contact: Contact;
  onEdit: (contact: Contact) => void;
  onToggleFavorite: (contactId: string, currentIsFavorite: boolean) => Promise<void>;
}

export function ContactCard({ contact, onEdit, onToggleFavorite }: ContactCardProps) {
  const { toast } = useToast();
  const [isTogglingFavorite, setIsTogglingFavorite] = useState(false);

  const primaryContactDetail = useMemo(() => {
    if (contact.email && contact.email.trim() !== '') {
        return { type: 'email' as const, value: contact.email, icon: Mail, label: "Email" };
    }
    if (contact.linkedin_url && contact.linkedin_url.trim() !== '') {
        return { type: 'linkedin' as const, value: contact.linkedin_url, icon: Linkedin, label: "LinkedIn" };
    }
    if (contact.phone && contact.phone.trim() !== '') {
        return { type: 'phone' as const, value: contact.phone, icon: Phone, label: "Phone" };
    }
    return null;
  }, [contact]);


  const copyToClipboard = (text: string, fieldName: string = "Text", event?: React.MouseEvent) => {
    event?.stopPropagation();
    if (!navigator.clipboard) {
      toast({ title: "Copy Failed", description: "Clipboard API not available.", variant: "destructive" });
      return;
    }
    navigator.clipboard.writeText(text).then(() => {
      toast({ title: `${fieldName} Copied!`, description: `${fieldName === 'All Emails' ? 'All associated emails copied.' : text + ' copied.'}` });
    }).catch(err => {
      toast({ title: "Copy Failed", description: `Could not copy.`, variant: "destructive" });
    });
  };

  const handleToggleFavoriteClick = async (event: React.MouseEvent) => {
    event.stopPropagation();
    setIsTogglingFavorite(true);
    try {
      await onToggleFavorite(contact.id, !!contact.is_favorite);
    } catch (error) {
      toast({ title: "Favorite Error", description: "Could not update favorite status.", variant: "destructive" });
    } finally {
      setIsTogglingFavorite(false);
    }
  };

  return (
    <Card 
      className="shadow-lg hover:shadow-xl transition-shadow duration-300 flex flex-col cursor-pointer"
      onClick={() => onEdit(contact)}
    >
      <CardHeader>
        <div className="flex justify-between items-start">
          <CardTitle className="font-headline text-xl mb-1 flex items-center">
            <UserCircle2 className="mr-2 h-5 w-5 text-primary" />
            {contact.name}
          </CardTitle>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 p-1 text-muted-foreground hover:text-yellow-500 hover:bg-transparent"
            onClick={handleToggleFavoriteClick}
            disabled={isTogglingFavorite}
            title={contact.is_favorite ? "Unfavorite" : "Favorite"}
          >
            {isTogglingFavorite ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Star className={cn("h-5 w-5", contact.is_favorite ? "fill-yellow-400 text-yellow-500" : "text-muted-foreground")} />
            )}
          </Button>
        </div>
        {contact.role && (
            <CardDescription className="text-accent">{contact.role}</CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-3 text-sm flex-grow">
        {primaryContactDetail ? (
          <div className="flex items-center">
            <primaryContactDetail.icon className="mr-2 h-4 w-4 text-muted-foreground flex-shrink-0" />
            {primaryContactDetail.type === 'linkedin' ? (
              <a href={primaryContactDetail.value} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline truncate" onClick={(e) => e.stopPropagation()}>
                LinkedIn Profile
              </a>
            ) : primaryContactDetail.type === 'email' ? (
              <a href={`mailto:${primaryContactDetail.value}`} className="text-accent hover:underline truncate" onClick={(e) => e.stopPropagation()}>
                {primaryContactDetail.value}
              </a>
            ) : (
              <span className="text-accent truncate">{primaryContactDetail.value}</span>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 p-1 ml-1.5 text-muted-foreground hover:text-accent hover:bg-transparent"
              onClick={(e) => copyToClipboard(primaryContactDetail.value, primaryContactDetail.label, e)}
              title={`Copy ${primaryContactDetail.label}`}
            >
              <Copy className="h-3.5 w-3.5" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center text-xs text-muted-foreground">
            <AlertCircle className="mr-2 h-4 w-4" /> No primary contact method found.
          </div>
        )}

        {contact.company_name_cache && ( 
          <div className="flex items-center">
            <Briefcase className="mr-2 h-4 w-4 text-muted-foreground" />
            <span>{contact.company_name_cache}</span>
          </div>
        )}

        {contact.phone && primaryContactDetail?.type !== 'phone' && (
          <div className="flex items-center">
            <Phone className="mr-2 h-4 w-4 text-muted-foreground" />
            <span>{contact.phone}</span>
          </div>
        )}
        
        {contact.linkedin_url && primaryContactDetail?.type !== 'linkedin' && (
          <div className="flex items-center">
            <Linkedin className="mr-2 h-4 w-4 text-muted-foreground" />
            <a 
              href={contact.linkedin_url} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-accent hover:underline truncate"
              onClick={(e) => e.stopPropagation()}
            >
              LinkedIn Profile
            </a>
          </div>
        )}

        {contact.notes && (
          <div className="flex items-start pt-1">
            <Info className="mr-2 h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground italic break-words">{contact.notes}</p>
          </div>
        )}
        
        {!contact.role && !contact.company_name_cache && !primaryContactDetail && !contact.notes && (
             <p className="text-xs text-muted-foreground">No additional details provided.</p>
        )}
      </CardContent>
    </Card>
  );
}
