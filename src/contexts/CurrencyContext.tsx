
'use client';

import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { Currency } from '@/lib/types';

interface CurrencyContextType {
  currency: Currency;
  setCurrency: (currency: Currency) => void;
  getCurrencySymbol: (currency: Currency) => string;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

const CURRENCY_STORAGE_KEY = 'followups-selected-currency';

export const CurrencyProvider = ({ children }: { children: ReactNode }) => {
  const [currency, setCurrencyState] = useState<Currency>('USD');
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const storedCurrency = localStorage.getItem(CURRENCY_STORAGE_KEY) as Currency | null;
    if (storedCurrency && ['INR', 'USD'].includes(storedCurrency)) {
      setCurrencyState(storedCurrency);
    }
  }, []);

  const setCurrency = (newCurrency: Currency) => {
    if (isMounted) {
      localStorage.setItem(CURRENCY_STORAGE_KEY, newCurrency);
      setCurrencyState(newCurrency);
    }
  };

  const getCurrencySymbol = (c: Currency): string => {
    return c === 'INR' ? '₹' : '$';
  };

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, getCurrencySymbol }}>
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = (): CurrencyContextType => {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
};
