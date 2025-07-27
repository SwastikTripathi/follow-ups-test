
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import type { UserSubscription, AvailablePlan, SubscriptionTier } from '@/lib/types';
import { ALL_AVAILABLE_PLANS, getLimitsForTier, type PlanLimits } from '@/lib/config';
import { useToast } from './use-toast';
import { addDays, differenceInDays, isFuture, startOfDay } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { useUserDataCache } from '@/contexts/UserDataCacheContext';

interface UseCurrentSubscriptionReturn {
  currentSubscription: UserSubscription | null;
  subscriptionLoading: boolean;
  availablePlans: AvailablePlan[];
  actualUserTier: SubscriptionTier; // Added to reflect DB state for UI (e.g. crown)
  effectiveTierForLimits: SubscriptionTier; // Added to reflect the tier used for limits
  effectiveLimits: PlanLimits; // Actual limits applied, considering privileged status
  isPrivilegedUser: boolean;
  isInGracePeriod: boolean;
  daysLeftInGracePeriod: number | null;
  refetchSubscription: () => Promise<void>;
}

const GRACE_PERIOD_DAYS = 7;

export function useCurrentSubscription(): UseCurrentSubscriptionReturn {
  const { user: currentUser, isLoadingAuth: isLoadingUserAuth, initialAuthCheckCompleted } = useAuth();
  const { cachedData, isLoadingCache, updateCachedUserSubscription, initialCacheLoadAttempted: initialCacheLoadAttemptedForContext } = useUserDataCache();

  const [currentSubscription, setCurrentSubscription] = useState<UserSubscription | null>(null);
  const [subscriptionLoadingState, setSubscriptionLoadingState] = useState(true);
  const [isPrivilegedUser, setIsPrivilegedUser] = useState(false);
  const [actualUserTier, setActualUserTier] = useState<SubscriptionTier>('free'); // For UI like crown
  const [effectiveTierForLimits, setEffectiveTierForLimits] = useState<SubscriptionTier>('free'); // For logic
  const [effectiveLimits, setEffectiveLimits] = useState<PlanLimits>(getLimitsForTier('free'));
  const [isInGracePeriod, setIsInGracePeriod] = useState(false);
  const [daysLeftInGracePeriod, setDaysLeftInGracePeriod] = useState<number | null>(null);
  const { toast } = useToast();
  const internalPreviousUserIdRef = useRef<string | undefined | null>();

  const processSubscriptionData = useCallback((subData: UserSubscription | null) => {
    let resolvedDbTier: SubscriptionTier = 'free'; // Tier based purely on DB record
    let resolvedEffectiveTierForLimits: SubscriptionTier = 'free'; // Tier used for calculating limits
    let gracePeriodActive = false;
    let daysLeftGrace: number | null = null;

    if (subData) {
      setCurrentSubscription(subData);
      if ((subData.tier === 'pro' || subData.tier === 'business') && subData.status === 'active') {
        resolvedDbTier = subData.tier; // Actual DB tier is pro or business
        if (subData.plan_expiry_date && isFuture(startOfDay(new Date(subData.plan_expiry_date)))) {
          resolvedEffectiveTierForLimits = subData.tier;
        } else if (subData.plan_expiry_date) {
          // Paid plan has expired, effective tier for limits is free
          resolvedEffectiveTierForLimits = 'free';
          const gracePeriodEndDate = addDays(startOfDay(new Date(subData.plan_expiry_date)), GRACE_PERIOD_DAYS);
          const today = startOfDay(new Date());
          if (isFuture(gracePeriodEndDate) || differenceInDays(gracePeriodEndDate, today) === 0) {
            gracePeriodActive = true;
            daysLeftGrace = differenceInDays(gracePeriodEndDate, today);
            daysLeftGrace = Math.max(0, daysLeftGrace);
          }
        }
      }
    } else {
      setCurrentSubscription(null);
    }
    
    const privileged = currentUser?.email && cachedData?.privilegedEmails?.includes(currentUser.email) || false;
    setIsPrivilegedUser(privileged);
    setActualUserTier(resolvedDbTier);
    setEffectiveTierForLimits(resolvedEffectiveTierForLimits); // Set state for effective tier
    setEffectiveLimits(getLimitsForTier(resolvedEffectiveTierForLimits, privileged));

    setIsInGracePeriod(gracePeriodActive);
    setDaysLeftInGracePeriod(daysLeftGrace);
    setSubscriptionLoadingState(false);
  }, [currentUser, cachedData?.privilegedEmails]);

  const fetchSubscriptionDirectly = useCallback(async () => {
    if (!currentUser) {
      processSubscriptionData(null);
      return;
    }
    setSubscriptionLoadingState(true);
    try {
      const { data, error } = await supabase
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', currentUser.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      const sub = data ? {
        ...data,
        tier: data.tier as SubscriptionTier,
        status: data.status as UserSubscription['status'],
        plan_start_date: data.plan_start_date ? new Date(data.plan_start_date) : null,
        plan_expiry_date: data.plan_expiry_date ? new Date(data.plan_expiry_date) : null,
      } as UserSubscription : null;

      processSubscriptionData(sub);
      updateCachedUserSubscription(sub); 
    } catch (error: any) {
      toast({ title: 'Error Fetching Subscription Status', description: error.message, variant: 'destructive' });
      processSubscriptionData(null);
      updateCachedUserSubscription(null);
    }
  }, [currentUser, toast, processSubscriptionData, updateCachedUserSubscription]);

  useEffect(() => {
    const currentAuthUserId = currentUser?.id;

    if (!initialAuthCheckCompleted) {
        setSubscriptionLoadingState(true);
        return;
    }

    if (currentAuthUserId !== internalPreviousUserIdRef.current) {
        internalPreviousUserIdRef.current = currentAuthUserId;
        if (!currentAuthUserId) {
            processSubscriptionData(null);
            return;
        }
        setSubscriptionLoadingState(true);
        if (!isLoadingCache && initialCacheLoadAttemptedForContext) {
            processSubscriptionData(cachedData?.userSubscription || null);
        }
    } else {
        if (!currentAuthUserId) {
            processSubscriptionData(null);
            return;
        }
        if (!isLoadingCache && initialCacheLoadAttemptedForContext) {
            if (JSON.stringify(currentSubscription) !== JSON.stringify(cachedData?.userSubscription || null) ||
                (currentUser?.email && (cachedData?.privilegedEmails?.includes(currentUser.email) !== isPrivilegedUser))
            ) {
                processSubscriptionData(cachedData?.userSubscription || null);
            } else {
                 setSubscriptionLoadingState(false);
            }
        } else if (isLoadingCache) {
            setSubscriptionLoadingState(true);
        } else {
             setSubscriptionLoadingState(false);
        }
    }
  }, [
      currentUser, 
      initialAuthCheckCompleted, 
      cachedData, 
      isLoadingCache, 
      initialCacheLoadAttemptedForContext,
      processSubscriptionData,
      currentSubscription,
      isPrivilegedUser
    ]);

  const refetchSubscription = useCallback(async () => {
    await fetchSubscriptionDirectly();
  }, [fetchSubscriptionDirectly]);

  return {
    currentSubscription,
    subscriptionLoading: subscriptionLoadingState || isLoadingUserAuth,
    availablePlans: ALL_AVAILABLE_PLANS,
    actualUserTier,
    effectiveTierForLimits, // Return the effective tier
    effectiveLimits,
    isPrivilegedUser,
    isInGracePeriod,
    daysLeftInGracePeriod,
    refetchSubscription,
  };
}
