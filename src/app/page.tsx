
'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef, Suspense } from 'react';
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { PlusCircle, Rss, Mail as MailIcon, Handshake, Users, Building2, CalendarCheck, Briefcase as BriefcaseIcon, BarChart2, MailOpen, Loader2, Home } from "lucide-react";
import Link from "next/link";
import type { JobOpening, Contact, Company, FollowUp, UserSettings } from '@/lib/types';
import { isToday, isThisWeek, format, subDays, eachDayOfInterval, isEqual, startOfDay, isValid } from 'date-fns';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartConfig } from "@/components/ui/chart";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { useRouter, useSearchParams as useNextSearchParams } from 'next/navigation';
import { useUserSettings } from '@/contexts/UserSettingsContext';
import { useAuth } from '@/contexts/AuthContext';
import { useCounts } from '@/contexts/CountsContext';
import { useUserDataCache } from '@/contexts/UserDataCacheContext';
import { useOnboardingTutorial } from '@/contexts/OnboardingTutorialContext';
import { InteractiveTutorial } from '@/components/tutorial/InteractiveTutorial';

const initialEmailSentStatuses: JobOpening['status'][] = [
  'Emailed', 'Followed Up - Once', 'Followed Up - Twice', 'Followed Up - Thrice',
  'No Response', 'Replied - Positive',
  'Replied - Negative', 'Interviewing', 'Offer', 'Rejected', 'Closed'
];

interface ChartDataPoint {
  date: string;
  displayDate: string;
  count: number;
}

const emailsSentChartConfig = {
  emails: { label: "Emails Sent", color: "hsl(var(--chart-1))" },
} satisfies ChartConfig;

const openingsAddedChartConfig = {
  leads: { label: "Leads Added", color: "hsl(var(--chart-2))" },
} satisfies ChartConfig;

function DashboardPageContent() {
  const { user: currentUser, isLoadingAuth: isLoadingUserAuth, initialAuthCheckCompleted } = useAuth();
  const { counts: globalCounts, isLoadingCounts: isLoadingGlobalCounts } = useCounts();
  const { cachedData, isLoadingCache, initialCacheLoadAttempted, updateCachedUserSettings } = useUserDataCache();

  const [stats, setStats] = useState({ followUpsToday: 0, followUpsThisWeek: 0 });
  const [emailsSentData, setEmailsSentData] = useState<ChartDataPoint[]>([]);
  const [openingsAddedData, setOpeningsAddedData] = useState<ChartDataPoint[]>([]);
  
  const [isProcessingDashboardData, setIsProcessingDashboardData] = useState(true);

  const { toast } = useToast();
  const router = useRouter();
  const searchParamsInstance = useNextSearchParams();
  
  const handleTutorialComplete = useCallback(async () => {
    console.log('[page.tsx] handleTutorialComplete called.');
    if (currentUser) {
      console.log('[page.tsx] Current user found:', currentUser.id);
      
      const updatePayload = { onboarding_complete: true };
      console.log('[page.tsx] Preparing to update user_settings with payload:', updatePayload);

      const { data, error } = await supabase
        .from('user_settings')
        .update(updatePayload)
        .eq('user_id', currentUser.id)
        .select()
        .single();
        
      console.log('[page.tsx] Supabase update call finished.');

      if (error) {
        console.error('[page.tsx] Error updating tutorial status:', error);
        toast({ title: 'Error saving tutorial status', description: error.message, variant: 'destructive' });
      }
      if (data) {
        console.log('[page.tsx] Successfully updated user_settings. Response data:', data);
        updateCachedUserSettings(data as UserSettings);
        console.log('[page.tsx] Local cache updated with new settings.');
      } else {
        console.log('[page.tsx] No data returned from update, but no error either.');
      }
    } else {
        console.warn('[page.tsx] handleTutorialComplete called, but no currentUser was found.');
    }
  }, [currentUser, toast, updateCachedUserSettings]);


  const processDashboardDataFromCache = useCallback(() => {
    if (!cachedData || !cachedData.jobOpenings) {
      setStats({ followUpsToday: 0, followUpsThisWeek: 0 });
      setEmailsSentData([]);
      setOpeningsAddedData([]);
      setIsProcessingDashboardData(false);
      return;
    }
    setIsProcessingDashboardData(true);
    const openingsWithFollowUps: Pick<JobOpening, 'id' | 'initial_email_date' | 'status' | 'followUps'>[] = cachedData.jobOpenings.map(jo => ({
      id: jo.id,
      initial_email_date: jo.initial_email_date, 
      status: jo.status,
      followUps: (jo.followUps || []).map(fuDb => ({ 
        ...fuDb,
        follow_up_date: fuDb.follow_up_date instanceof Date ? fuDb.follow_up_date : new Date(fuDb.follow_up_date),
      })),
    }));

    let todayCount = 0;
    let thisWeekCount = 0;
    const todayStart = startOfDay(new Date());

    openingsWithFollowUps.forEach(opening => {
      (opening.followUps || []).forEach(fu => {
        if (fu.status === 'Pending') {
          const followUpDate = startOfDay(fu.follow_up_date);
          if (isValid(followUpDate)) {
            if (followUpDate <= todayStart) {
              todayCount++;
            } else if (isThisWeek(followUpDate, { weekStartsOn: 1 })) {
              thisWeekCount++;
            }
          }
        }
      });
    });
    setStats({ followUpsToday: todayCount, followUpsThisWeek: thisWeekCount });

    const today = startOfDay(new Date());
    const last30DaysInterval = { start: subDays(today, 29), end: today };
    const dateRange = eachDayOfInterval(last30DaysInterval);
    const emailsMap = new Map<string, number>();
    const openingsMap = new Map<string, number>();
    dateRange.forEach(date => {
      const dateKey = format(date, 'yyyy-MM-dd');
      emailsMap.set(dateKey, 0);
      openingsMap.set(dateKey, 0);
    });

    openingsWithFollowUps.forEach(opening => {
      if (isValid(opening.initial_email_date)) {
        const initialEmailDay = startOfDay(opening.initial_email_date);
        const initialEmailDayKey = format(initialEmailDay, 'yyyy-MM-dd');
        if (openingsMap.has(initialEmailDayKey)) {
          openingsMap.set(initialEmailDayKey, (openingsMap.get(initialEmailDayKey) || 0) + 1);
        }
        if (initialEmailSentStatuses.includes(opening.status as any) && emailsMap.has(initialEmailDayKey)) {
          emailsMap.set(initialEmailDayKey, (emailsMap.get(initialEmailDayKey) || 0) + 1);
        }
      }
      (opening.followUps || []).forEach(fu => {
        if (fu.status === 'Sent' && isValid(fu.follow_up_date)) {
          const followUpDay = startOfDay(fu.follow_up_date);
          const followUpDayKey = format(followUpDay, 'yyyy-MM-dd');
          if (emailsMap.has(followUpDayKey)) {
            emailsMap.set(followUpDayKey, (emailsMap.get(followUpDayKey) || 0) + 1);
          }
        }
      });
    });
    const processedEmailsData: ChartDataPoint[] = [];
    emailsMap.forEach((count, dateKey) => {
      processedEmailsData.push({ date: dateKey, displayDate: format(new Date(dateKey + 'T00:00:00'), 'MMM dd'), count });
    });
    setEmailsSentData(processedEmailsData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));

    const processedOpeningsData: ChartDataPoint[] = [];
    openingsMap.forEach((count, dateKey) => {
      processedOpeningsData.push({ date: dateKey, displayDate: format(new Date(dateKey + 'T00:00:00'), 'MMM dd'), count });
    });
    setOpeningsAddedData(processedOpeningsData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
    setIsProcessingDashboardData(false);
  }, [cachedData]);

  useEffect(() => {
    if (initialAuthCheckCompleted && currentUser) {
      if (!isLoadingCache && initialCacheLoadAttempted) {
        processDashboardDataFromCache();
      } else if (isLoadingCache) {
        setIsProcessingDashboardData(true); 
      } else if (!initialCacheLoadAttempted) {
         setIsProcessingDashboardData(true);
      }
    } else if (initialAuthCheckCompleted && !currentUser) {
      setStats({ followUpsToday: 0, followUpsThisWeek: 0 });
      setEmailsSentData([]);
      setOpeningsAddedData([]);
      setIsProcessingDashboardData(false);
    }
  }, [currentUser, initialAuthCheckCompleted, isLoadingCache, initialCacheLoadAttempted, processDashboardDataFromCache]);

  const newQueryParam = searchParamsInstance?.get('new');
  useEffect(() => {
    if (newQueryParam === 'true' && currentUser) {
      if (typeof window !== "undefined") router.replace('/', { scroll: false }); 
    }
  }, [newQueryParam, currentUser, router]);

  const isStillLoadingContent = isLoadingUserAuth || !initialAuthCheckCompleted || isLoadingCache || isLoadingGlobalCounts || isProcessingDashboardData;

  if (isLoadingUserAuth || !initialAuthCheckCompleted) {
    return (<div className="flex justify-center items-center h-64"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>);
  }
  
  if (!currentUser) {
    return (<Card><CardHeader><CardTitle>Access Denied</CardTitle></CardHeader><CardContent><p>Please log in to view your dashboard.</p><Button onClick={() => router.push('/auth')} className="mt-4">Sign In</Button></CardContent></Card>);
  }
  
  return (
    <>
      <div className="space-y-6" id="dashboard-main-content-area">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div> <h2 className="text-3xl font-bold tracking-tight font-headline">Dashboard</h2> <p className="text-muted-foreground">Welcome back! Here's an overview of your prospects.</p> </div>
          <div className="flex gap-2"> <Link href="/leads?new=true" passHref> <Button id="dashboard-add-new-lead-button" disabled={!currentUser || isLoadingUserAuth}> <PlusCircle className="mr-2 h-4 w-4" /> Add New Lead </Button> </Link> </div>
        </div>

        {(isStillLoadingContent) ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"> {[...Array(5)].map((_, i) => ( <Card key={i} className="shadow-lg"> <CardHeader> <Skeleton className="h-6 w-3/4 mb-2" /> <Skeleton className="h-4 w-1/2" /> </CardHeader> <CardContent> <Skeleton className="h-8 w-1/2 mb-1" /> <Skeleton className="h-4 w-3/4" /> </CardContent> </Card> ))} <Card className="shadow-lg lg:col-span-3"> <CardHeader><Skeleton className="h-6 w-1/2" /></CardHeader> <CardContent><Skeleton className="h-[300px] w-full" /></CardContent> </Card> <Card className="shadow-lg lg:col-span-3"> <CardHeader><Skeleton className="h-6 w-1/2" /></CardHeader> <CardContent><Skeleton className="h-[300px] w-full" /></CardContent> </Card> </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Card className="shadow-lg"> <CardHeader> <CardTitle className="font-headline flex items-center"> <CalendarCheck className="mr-2 h-5 w-5 text-primary" /> Upcoming Follow-ups </CardTitle> <CardDescription>Tasks needing your attention.</CardDescription> </CardHeader> <CardContent> <div className="flex items-center justify-between"> <span className="text-sm">Due Today / Overdue:</span> <span className="text-lg font-semibold">{stats.followUpsToday}</span> </div> <div className="flex items-center justify-between mt-1"> <span className="text-sm">Due This Week (upcoming):</span> <span className="text-lg font-semibold">{stats.followUpsThisWeek}</span> </div> {(stats.followUpsToday === 0 && stats.followUpsThisWeek === 0) && ( <p className="text-sm text-muted-foreground mt-2"> No pending follow-ups scheduled. </p> )} </CardContent> </Card>
            <Card className="shadow-lg"> <CardHeader> <CardTitle className="font-headline flex items-center"> <BriefcaseIcon className="mr-2 h-5 w-5 text-primary" /> Active Leads </CardTitle> <CardDescription>Leads you are currently pursuing.</CardDescription> </CardHeader> <CardContent> <div className="flex items-center"> <span className="text-3xl font-bold">{globalCounts.jobOpenings}</span> <span className="ml-2 text-sm text-muted-foreground">active leads</span> </div> {(globalCounts.jobOpenings === 0) && ( <p className="text-sm text-muted-foreground mt-2"> No active leads tracked yet. </p> )} </CardContent> </Card>
            <Card className="shadow-lg"> <CardHeader> <CardTitle className="font-headline flex items-center"> <Users className="mr-2 h-5 w-5 text-primary" /> Total Contacts </CardTitle> <CardDescription>Your professional network.</CardDescription> </CardHeader> <CardContent> <div className="flex items-center"> <span className="text-3xl font-bold">{globalCounts.contacts}</span> <span className="ml-2 text-sm text-muted-foreground">contacts</span> </div> {(globalCounts.contacts === 0) && ( <p className="text-sm text-muted-foreground mt-2"> No contacts added yet. </p> )} </CardContent> </Card>
            <Card className="shadow-lg"> <CardHeader> <CardTitle className="font-headline flex items-center"> <Building2 className="mr-2 h-5 w-5 text-primary" /> Total Companies </CardTitle> <CardDescription>Companies in your directory.</CardDescription> </CardHeader> <CardContent> <div className="flex items-center"> <span className="text-3xl font-bold">{globalCounts.companies}</span> <span className="ml-2 text-sm text-muted-foreground">companies</span> </div> {(globalCounts.companies === 0) && ( <p className="text-sm text-muted-foreground mt-2"> No companies added yet. </p> )} </CardContent> </Card>
            <Card className="shadow-lg lg:col-span-1"> <CardHeader> <CardTitle className="font-headline">Quick Links</CardTitle> <CardDescription>Navigate to key sections quickly.</CardDescription> </CardHeader> <CardContent className="grid grid-cols-1 gap-3"> <Link href="/blog" passHref> <Button variant="outline" className="w-full justify-start"> <Rss className="mr-2 h-4 w-4" /> Visit Our Blog </Button> </Link> <Link href="/contact" passHref> <Button variant="outline" className="w-full justify-start"> <MailIcon className="mr-2 h-4 w-4" /> Contact Us </Button> </Link> <Link href="/partner-with-us" passHref> <Button variant="outline" className="w-full justify-start"> <Handshake className="mr-2 h-4 w-4" /> Partner With Us </Button> </Link> </CardContent> </Card>
            <Card className="shadow-lg lg:col-span-3">
              <CardHeader> <CardTitle className="font-headline flex items-center"> <MailOpen className="mr-2 h-5 w-5 text-primary" /> Emails Sent Per Day (Last 30 Days) </CardTitle> </CardHeader>
              <CardContent>
                {(!Array.isArray(emailsSentData) || emailsSentData.filter(d => d.count > 0).length === 0) ? (
                  <p className="text-sm text-muted-foreground h-[300px] flex items-center justify-center">No email data to display for the last 30 days.</p>
                ) : (
                  <ChartContainer config={emailsSentChartConfig} className="h-[300px] w-full">
                    <AreaChart accessibilityLayer data={emailsSentData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                      <CartesianGrid vertical={false} strokeDasharray="3 3" />
                      <XAxis dataKey="displayDate" tickLine={false} axisLine={false} tickMargin={8} tickFormatter={(value, index) => { if (emailsSentData.length > 10 && index % 3 !== 0 && index !== 0 && index !== emailsSentData.length -1) return ''; return value; }} />
                      <YAxis tickLine={false} axisLine={false} tickMargin={8} allowDecimals={false} />
                      <ChartTooltip cursor={true} content={<ChartTooltipContent indicator="dot" />} />
                      <defs>
                        <linearGradient id="fillEmails" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--color-emails)" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="var(--color-emails)" stopOpacity={0.1}/>
                        </linearGradient>
                      </defs>
                      <Area type="monotone" dataKey="count" stroke="var(--color-emails)" strokeWidth={2} fillOpacity={1} fill="url(#fillEmails)" />
                    </AreaChart>
                  </ChartContainer>
                )}
              </CardContent>
            </Card>
             <Card className="shadow-lg lg:col-span-3">
              <CardHeader> <CardTitle className="font-headline flex items-center"> <BarChart2 className="mr-2 h-5 w-5 text-primary" /> Leads Added Per Day (Last 30 Days) </CardTitle> </CardHeader>
              <CardContent>
                {(!Array.isArray(openingsAddedData) || openingsAddedData.filter(d => d.count > 0).length === 0) ? (
                  <p className="text-sm text-muted-foreground h-[300px] flex items-center justify-center">No new leads data to display for the last 30 days.</p>
                ) : (
                  <ChartContainer config={openingsAddedChartConfig} className="h-[300px] w-full">
                     <AreaChart accessibilityLayer data={openingsAddedData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                      <CartesianGrid vertical={false} strokeDasharray="3 3" />
                      <XAxis dataKey="displayDate" tickLine={false} axisLine={false} tickMargin={8} tickFormatter={(value, index) => { if (openingsAddedData.length > 10 && index % 3 !== 0 && index !== 0 && index !== openingsAddedData.length -1) return ''; return value; }} />
                      <YAxis tickLine={false} axisLine={false} tickMargin={8} allowDecimals={false} />
                      <ChartTooltip cursor={true} content={<ChartTooltipContent indicator="dot" />} />
                       <defs>
                        <linearGradient id="fillLeads" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--color-leads)" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="var(--color-leads)" stopOpacity={0.1}/>
                        </linearGradient>
                      </defs>
                      <Area type="monotone" dataKey="count" stroke="var(--color-leads)" strokeWidth={2} fillOpacity={1} fill="url(#fillLeads)" />
                    </AreaChart>
                  </ChartContainer>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
      <InteractiveTutorial onTutorialComplete={handleTutorialComplete}/>
    </>
  );
}

export default function DashboardPage() {
  return (
    <AppLayout>
      <Suspense fallback={<div className="flex w-full h-full items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>}>
          <DashboardPageContent />
      </Suspense>
    </AppLayout>
  );
}
