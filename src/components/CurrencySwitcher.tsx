
'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { IndianRupee, DollarSign } from 'lucide-react';
import { useCurrency } from '@/contexts/CurrencyContext';
import type { Currency } from '@/lib/types';
import { cn } from '@/lib/utils';

export function CurrencySwitcher() {
  const { currency, setCurrency } = useCurrency();

  const handleCurrencyChange = (newCurrency: string) => {
    setCurrency(newCurrency as Currency);
  };

  const CurrencyIcon = currency === 'INR' ? IndianRupee : DollarSign;

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <div
            className={cn(
                "rounded-full w-12 h-12 shadow-lg border-2 border-border/80 flex items-center justify-center",
                "opacity-60 hover:opacity-100 transition-opacity duration-200"
            )}
          >
            <Button
                variant="secondary"
                size="icon"
                className="rounded-full w-full h-full"
                aria-label="Select currency"
            >
                <CurrencyIcon className="h-5 w-5" />
            </Button>
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40" sideOffset={10}>
          <DropdownMenuRadioGroup value={currency} onValueChange={handleCurrencyChange}>
            <DropdownMenuRadioItem value="USD">
              <DollarSign className="mr-2 h-4 w-4" />
              <span>USD</span>
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="INR">
              <IndianRupee className="mr-2 h-4 w-4" />
              <span>INR</span>
            </DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
