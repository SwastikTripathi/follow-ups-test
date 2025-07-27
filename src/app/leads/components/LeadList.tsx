
'use client';

import type { JobOpening } from '@/lib/types';
import { LeadCard } from './LeadCard';

interface LeadListProps {
  leads: JobOpening[];
  onEditLead: (lead: JobOpening) => void;
  onLogFollowUp: (followUpId: string, leadId: string) => Promise<void>;
  onUnlogFollowUp: (followUpId: string, leadId: string) => Promise<void>;
  onToggleFavorite: (leadId: string, currentIsFavorite: boolean) => Promise<void>;
}

export function LeadList({ 
  leads, 
  onEditLead, 
  onLogFollowUp, 
  onUnlogFollowUp,
  onToggleFavorite 
}: LeadListProps) {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {leads.map((lead) => (
        <LeadCard
          key={lead.id}
          lead={lead}
          onEdit={onEditLead}
          onLogFollowUp={onLogFollowUp}
          onUnlogFollowUp={onUnlogFollowUp}
          onToggleFavorite={onToggleFavorite}
        />
      ))}
    </div>
  );
}
