
'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { CheckCircle, TrendingUp, Users, Target, Briefcase, Zap, ArrowRight, Eye, MailCheck, Building, Workflow, Focus, ShieldCheck, HeartHandshake, Star, HelpCircle, Facebook, Twitter, Youtube, Linkedin, Globe, CreditCard, Search, Lightbulb, Mail, CalendarDays, User as UserIcon, Info } from 'lucide-react';
import { Logo } from '@/components/icons/Logo';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { PublicNavbar } from '@/components/layout/PublicNavbar';
import { PublicFooter } from '@/components/layout/PublicFooter'; // Added import
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AnimatedSectionText } from '@/components/utils/AnimatedSectionImage';


const newTestimonialsData = [
  {
    quote: "“I was keeping track of all my job applications and follow-ups in a spreadsheet, but I kept forgetting who I emailed or when I was supposed to reach out again. Now I don’t have to think about it every day — I just open the app and know exactly who to contact and when.”",
    name: 'Alex P.',
    role: 'Software Engineer',
    avatar: 'https://placehold.co/100x100.png',
    dataAiHint: 'person portrait'
  },
  {
    quote: "“I’ve used Airtable, Notion, even Pipedrive — but they all felt like too much or not quite right. Clean UI, no learning curve, and it keeps me sane while juggling investors, partners, and job candidates.”",
    name: 'Sarah K.',
    role: 'Sales Manager',
    avatar: 'https://placehold.co/100x100.png',
    dataAiHint: 'professional woman'
  },
  {
    quote: "“Honestly I didn’t think I needed another tool. I use it to keep track of freelance leads, people I pitch to, and even old clients I want to check in with. The reminders are a life-saver — I’ve actually started following up consistently.”",
    name: 'Jordan Lee',
    role: 'Marketing Specialist',
    avatar: 'https://placehold.co/100x100.png',
    dataAiHint: 'person professional'
  }
];

const faqData = [
  {
    question: "What exactly is FollowUps?",
    answer: "Think of FollowUps as your outreach wingman—minus the awkward small talk. It helps you track job applications, manage contacts, and schedule follow-ups like a pro. No more copy-pasting into spreadsheets or losing track of who you emailed last week. Just smooth, organized progress."
  },
  {
    question: "Who can use FollowUps?",
    answer: "Anyone out there making moves. Whether you’re job hunting, pitching your next big idea, or building a powerhouse network—FollowUps is built for you. Job seekers, freelancers, founders, and anyone who’s tired of dropped balls and inbox chaos—you’re our people."
  },
  {
    question: "What makes FollowUps stand out from others?",
    answer: "Simplicity meets superpowers. FollowUps ditches the bloated CRM nonsense and gives you a tool that’s fast, intuitive, and built for real life. Track jobs, manage contacts, schedule follow-ups—all in a dashboard that doesn’t require a tutorial (or a nap)."
  },
  {
    question: "How does follow-up tracking actually work?",
    answer: "Set it and forget it—literally. FollowUps lets you automate follow-up reminders based on your last interaction, save and reuse email templates, and get timely nudges so you’re always on top of your game. It's like having a personal assistant that actually does follow up."
  },
  {
    question: "Is it really free to use forever?",
    answer: "Yes, and not the “free trial, then surprise bill” kind. Our Free Tier gives you full access to the essentials—perfect for casual users or early-stage pros. Sending a ton of outreach? We’ve got premium plans ready when you are."
  },
  {
    question: "Is my personal data truly safe here?",
    answer: "Absolutely. Your data’s locked down tighter than grandma’s cookie recipe. We follow industry-standard security practices, encrypt what matters, and never sell your info. You stay in control—always."
  },
  {
    question: "How do I get started?",
    answer: "It’s ridiculously easy. Sign up in under 5 minutes, no credit card needed, and boom—you’re ready to roll. Add your contacts, set up your outreach, and start following up like a machine. Future you will be proud."
  }
];

interface CardDetail {
  icon: React.ElementType;
  text: string;
  highlight?: 'red-alert';
  className?: string;
}

interface MockCard {
  title: string;
  contextLine: string;
  status: string;
  statusColor: string;
  avatar: string;
  dataAiHint: string;
  cardTypeIcon: React.ElementType;
  details: CardDetail[];
  tooltipText: string;
}


function HeroVisual() {
  const mockCardsData: MockCard[] = [
    {
      title: 'Software Engineer',
      contextLine: 'Novaedge Tech',
      status: 'Emailed',
      statusColor: 'bg-green-500 hover:bg-green-600 text-green-50 border-transparent',
      avatar: 'https://res.cloudinary.com/dzxh5okyq/image/upload/v1750579690/novaedge-tech_tgi71f.jpg',
      dataAiHint: 'company logo',
      cardTypeIcon: Briefcase,
      details: [
        { icon: UserIcon, text: 'Contact: Sofia Chen' },
        { icon: CalendarDays, text: 'Next Follow-up: Nov 5', highlight: 'red-alert' }
      ],
      tooltipText: "Track job applications. Never miss a follow-up and manage status all in one place."
    },
    {
      title: 'Sofia Chen',
      contextLine: 'Hiring Manager @ Novaedge Tech',
      status: 'Connected',
      statusColor: 'bg-sky-500 hover:bg-sky-600 text-sky-50 border-transparent',
      avatar: 'https://res.cloudinary.com/dzxh5okyq/image/upload/v1750579908/profile-woman_qg0yi7.jpg',
      dataAiHint: 'woman portrait',
      cardTypeIcon: Users,
      details: [
        { icon: Mail, text: 'sofia.c@novaedge.com' },
        { icon: Info, text: 'Loves coffee', className: 'italic break-words min-w-0' }
      ],
      tooltipText: "Manage professional contacts. Store details and notes to build stronger connections."
    },
     {
      title: 'Data Analyst',
      contextLine: 'Globex Corp',
      status: 'Interviewing',
      statusColor: 'bg-amber-500 hover:bg-amber-600 text-white border-transparent',
      avatar: 'https://res.cloudinary.com/dzxh5okyq/image/upload/v1750579690/globex-corp_qk2s0j.jpg',
      dataAiHint: 'company logo',
      cardTypeIcon: Briefcase,
       details: [
        { icon: UserIcon, text: 'Contact: Sarah Lee' },
        { icon: CalendarDays, text: 'Next Follow-up: Nov 5', highlight: 'red-alert' }
      ],
      tooltipText: "Keep your job search organized. See key contact info and crucial follow-up dates at a glance."
    },
    {
      title: 'Novaedge Tech',
      contextLine: 'Enterprise Software',
      status: 'Watching',
      statusColor: 'bg-cyan-500 hover:bg-cyan-600 text-white border-transparent',
      avatar: 'https://res.cloudinary.com/dzxh5okyq/image/upload/v1750579690/novaedge-tech_tgi71f.jpg',
      dataAiHint: 'company logo',
      cardTypeIcon: Building,
      details: [
        { icon: Globe, text: 'novaedge.tech' },
        { icon: Users, text: '3 Contacts Tracked'}
      ],
      tooltipText: "Organize target companies. Track websites, associated contacts, and important notes."
    },
  ];

  return (
    <div className="mt-12 lg:mt-20">
      <div className="relative max-w-5xl mx-auto p-1 bg-card rounded-xl shadow-2xl border border-border/20 overflow-hidden">
        <div className="p-4 sm:p-5 lg:p-6 bg-background rounded-[0.6rem]">
          <TooltipProvider delayDuration={0}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {mockCardsData.map((card, index) => {
                const CardTypeIconComponent = card.cardTypeIcon;
                return (
                  <Tooltip key={index}>
                    <TooltipTrigger asChild>
                      <div
                        className="bg-card p-3 rounded-lg shadow-md border border-border/50 hover:shadow-xl hover:scale-105 transition-all duration-200 flex flex-col cursor-default"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <Badge variant="secondary" className={`text-xs ${card.statusColor}`}>{card.status}</Badge>
                          <CardTypeIconComponent className="h-4 w-4 text-muted-foreground" />
                        </div>

                        <div className="flex flex-col flex-grow space-y-1.5">
                          <div className="flex items-start">
                            <Image
                              src={card.avatar}
                              alt={card.title}
                              width={28}
                              height={28}
                              className="rounded-full mr-2 border border-border/20 flex-shrink-0 mt-0.5"
                              data-ai-hint={card.dataAiHint}
                            />
                            <div className="flex-grow min-w-0 text-left">
                              <h4 className="text-sm font-semibold text-card-foreground leading-snug">{card.title}</h4>
                              {card.contextLine && (
                                <p className="text-xs text-muted-foreground truncate -mt-1">{card.contextLine}</p>
                              )}
                            </div>
                          </div>
                          {card.details && card.details.length > 0 && (
                            <div className="space-y-1 pt-1">
                              {card.details.map((detail, detailIndex) => {
                                const DetailIcon = detail.icon;
                                const isRedAlert = detail.highlight === 'red-alert';
                                return (
                                  <div
                                    key={detailIndex}
                                    className={cn(
                                      "flex text-xs items-center",
                                      isRedAlert
                                        ? "border border-destructive px-2 py-1 rounded-md"
                                        : "",
                                      detail.className
                                    )}
                                  >
                                    <DetailIcon className={cn(
                                      "mr-1.5 h-3.5 w-3.5 flex-shrink-0",
                                      isRedAlert ? "text-destructive" : "text-muted-foreground"
                                      )}
                                    />
                                    <span className={cn(
                                      "min-w-0",
                                      isRedAlert ? "text-muted-foreground" : "text-muted-foreground truncate",
                                      detail.className
                                    )}>
                                      {detail.text}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-xs text-center">
                      <p>{card.tooltipText}</p>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          </TooltipProvider>
        </div>
      </div>
    </div>
  );
}


const AnimatedWordsSection = () => {
  const topWords = [
    { name: "Data Analyst", color: "bg-sky-600/30" },
    { name: "HR Manager", color: "bg-green-600/30" },
    { name: "Fresher", color: "bg-purple-600/30" },
    { name: "Student", color: "bg-pink-600/30" },
    { name: "Designer", color: "bg-teal-600/30" },
    { name: "Sales Development Rep", color: "bg-slate-700/80" },
    { name: "Founder", icon: <Lightbulb className="inline-block h-4 w-4 ml-1" />, color: "bg-yellow-500/30" },
    { name: "Freelancer", color: "bg-indigo-600/30" },
  ];

  const bottomWords = [
    { name: "Product Manager", color: "bg-purple-600/30" },
    { name: "Marketing Specialist", color: "bg-indigo-600/30" },
    { name: "Recruiter", icon: <Search className="inline-block h-4 w-4 ml-1" />, color: "bg-slate-700/80" },
    { name: "Networker", color: "bg-orange-600/30" },
    { name: "Business Development", color: "bg-teal-600/30" },
    { name: "Consultant", color: "bg-green-600/30" },
    { name: "Job Seeker", color: "bg-pink-600/30" },
  ];

  const duplicatedTopWords = [...topWords, ...topWords];
  const duplicatedBottomWords = [...bottomWords, ...bottomWords];

  return (
    <section className="py-16 md:py-24 bg-slate-900 text-slate-100 overflow-hidden min-h-[calc(100vh-4rem)] flex flex-col justify-center">
      <div className="container mx-auto px-[10vw] text-center">
        <h3 className="text-2xl sm:text-3xl font-bold mb-1 font-headline text-slate-300">
          Email Looks Fine
        </h3>
        <h2 className="text-4xl sm:text-5xl font-bold mb-6 font-headline">
          <span className="text-slate-100">Until You Start</span> <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">Reaching Out</span>
        </h2>
        <div className="max-w-2xl mx-auto space-y-2 leading-snug text-slate-300 mb-12">
         <p className="leading-relaxed">We spend hours writing cold emails, Then forget to follow-up.<br />Messages get buried. Promising leads fade away.</p>
          <p className="leading-relaxed">Not from laziness—but because email was never built for this.</p>
          <p className="leading-relaxed">FollowUps fixes that. One place to track, follow up, and stay on top—without the chaos.</p>
        </div>

        <div className="relative space-y-3">
          {/* Top Row - Moving Left */}
          <div className="overflow-hidden whitespace-nowrap py-2 mask-gradient-horizontal">
            <div className="inline-block animate-marquee-left">
              {duplicatedTopWords.map((item, index) => (
                <span key={`top-${index}`} className={`inline-flex items-center text-sm sm:text-base mx-2 px-4 py-2 rounded-lg shadow-md ${item.color} text-slate-50`}>
                  {item.name} {item.icon}
                </span>
              ))}
            </div>
          </div>
          {/* Bottom Row - Moving Right */}
          <div className="overflow-hidden whitespace-nowrap py-2 mask-gradient-horizontal">
            <div className="inline-block animate-marquee-right">
              {duplicatedBottomWords.map((item, index) => (
                <span key={`bottom-${index}`} className={`inline-flex items-center text-sm sm:text-base mx-2 px-4 py-2 rounded-lg shadow-md ${item.color} text-slate-50`}>
                  {item.name} {item.icon}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
      <style jsx>{`
        .mask-gradient-horizontal {
          mask-image: linear-gradient(to right, transparent 0%, black 10%, black 90%, transparent 100%);
          -webkit-mask-image: linear-gradient(to right, transparent 0%, black 10%, black 90%, transparent 100%);
        }
      `}</style>
    </section>
  );
};

export default function LandingPage() {

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-background to-secondary/10">
      <PublicNavbar activeLink="landing" />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="py-20 md:py-28 text-center bg-background">
          <div className="container mx-auto px-[10vw]">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tighter mb-6 font-headline text-foreground">
              Stop losing leads and<br className="hidden sm:inline" /> missing <span className="text-primary">follow-ups</span>.
            </h1>
            <p className="max-w-2xl mx-auto text-md sm:text-lg md:text-xl text-muted-foreground mb-8">
              FollowUps is the easy-to-use tool built to streamline your outreach: manage job applications, sales leads, and professional networking like a pro.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 mb-6">
                <Button size="lg" className="text-lg px-8 py-6 shadow-xl w-full sm:w-auto rounded-full" asChild>
                <Link href="/auth?action=signup">Get Started Free <ArrowRight className="ml-2 h-5 w-5" /></Link>
                </Button>
                <Button
                  size="lg"
                  variant="link"
                  className="text-lg px-8 py-6 w-full sm:w-auto rounded-full text-muted-foreground hover:underline hover:underline-offset-4 hover:text-primary/90 hover:decoration-primary/90"
                  asChild
                >
                  <Link href="#streamline-section">Why Everyone’s Hooked</Link>
                </Button>
            </div>
            <div className="flex flex-wrap justify-center items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
                <span className="flex items-center"><CheckCircle className="h-4 w-4 mr-1.5 text-green-500"/>Free Forever (Yes really!)</span>
                <span className="flex items-center"><CheckCircle className="h-4 w-4 mr-1.5 text-green-500"/>Super Affordable plans</span>
                <span className="flex items-center"><CheckCircle className="h-4 w-4 mr-1.5 text-green-500"/>Automated follow-up scheduling</span>
            </div>
            <HeroVisual />
            <div className="max-w-5xl mx-auto">
              <p className="text-muted-foreground mt-2 text-right" style={{ fontSize: '0.625rem', lineHeight: '1' }}>
                *Fictoral data for demonstration only.
              </p>
            </div>
            {/* Video Player Section */}
            <div className="mt-12 lg:mt-16 max-w-5xl mx-auto">
              <div className="rounded-xl shadow-2xl overflow-hidden border border-border/20" style={{ aspectRatio: '1280 / 642' }}>
                <video
                  className="w-full h-full object-contain"
                  poster="https://placehold.co/1280x642.png"
                  data-ai-hint="app tutorial product demo"
                  autoPlay
                  loop
                  muted
                  playsInline
                >
                  <source src="https://res.cloudinary.com/dzxh5okyq/video/upload/v1751309464/landing-page-hero-video-demo_vp5hmg.mp4" type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
              </div>
            </div>
          </div>
        </section>

        {/* AnimatedWordsSection */}
        <AnimatedWordsSection />

        {/* Section: Why Professionals Streamline with FollowUps */}
        <section id="streamline-section" className="py-16 md:py-24 bg-background">
          <div className="container mx-auto px-[10vw]">
            <div className="text-left max-w-3xl mx-auto md:mx-0 mb-12 md:mb-16">
              <div className="mb-4">
                <a
                  href="https://peerpush.net/p/followups"
                  target="_blank"
                  rel="noopener"
                  style={{ height: '60px', borderRadius: '3em' }}
                  className="inline-block transition-all duration-300 ease-in-out hover:shadow-[0_0_15px_hsl(var(--primary)/0.5)]"
                >
                  <img src="https://peerpush.net/p/followups/badge" alt="FollowUps badge" style={{ height: '60px' }} />
                </a>
              </div>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight font-headline text-foreground">
                Why Professionals choose FollowUps
              </h2>
              <p className="text-xl md:text-2xl text-muted-foreground">
                Focus on connections, not on <span className="text-primary font-semibold">clutter</span>.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-12 lg:gap-16 items-center">
              <AnimatedSectionText>
                <div className="space-y-6">
                    <h3 className="text-2xl font-semibold font-headline text-foreground">Instant Clarity, Zero Guesswork</h3>
                    <p className="text-muted-foreground leading-relaxed">
                    Know who to follow up with—instantly and every single day.
                    With FollowUps, your follow-ups are automatically scheduled the moment you reach out. The system organizes your pipeline so what matters today is always right up front—no calendars to check, no spreadsheets to scan. It’s built for motion: you open your dashboard, and your next steps are already waiting.
                    </p>
                    <div className="border-l-4 border-primary pl-6 py-4">
                    <blockquote className="text-muted-foreground italic mb-4">
                        {newTestimonialsData[0].quote}
                    </blockquote>
                    {/* <div className="flex items-center">
                        <Image
                        data-ai-hint={newTestimonialsData[0].dataAiHint}
                        src={newTestimonialsData[0].avatar}
                        alt={newTestimonialsData[0].name}
                        width={40}
                        height={40}
                        className="rounded-full mr-3"
                        />
                        <div>
                        <p className="font-semibold text-sm text-foreground">{newTestimonialsData[0].name}</p>
                        <p className="text-xs text-muted-foreground">{newTestimonialsData[0].role}</p>
                        </div>
                    </div> */}
                    </div>
                </div>
              </AnimatedSectionText>
              <div>
                <div className="relative aspect-[4/3] rounded-xl overflow-hidden">
                  <Image
                      src="https://res.cloudinary.com/dzxh5okyq/image/upload/v1750529966/job-card-light_rrdnwm.png"
                      alt="FollowUps App Dashboard Mockup"
                      width={600}
                      height={450}
                      className="w-full h-full object-contain block dark:hidden"
                      data-ai-hint="app dashboard"
                  />
                  <Image
                      src="https://res.cloudinary.com/dzxh5okyq/image/upload/v1750529193/job-card-dark_xdxtbm.png"
                      alt="FollowUps App Dashboard Mockup"
                      width={600}
                      height={450}
                      className="w-full h-full object-contain hidden dark:block"
                      data-ai-hint="app dashboard dark"
                  />
                </div>
                <p className="text-muted-foreground mt-2 text-right" style={{ fontSize: '0.625rem', lineHeight: '1' }}>
                    *Fictoral data for demonstration only.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* New Section 1: Everything you need */}
        <section className="py-16 md:py-24 bg-background">
          <div className="container mx-auto px-[10vw]">
            <div className="grid md:grid-cols-2 gap-12 lg:gap-16 items-center">
              <div className="order-last md:order-first relative aspect-[4/3] rounded-xl overflow-hidden">
                <Image
                    src="https://res.cloudinary.com/dzxh5okyq/image/upload/v1750525850/free-forever-sticker_xymuva.png"
                    alt="FollowUps unified platform illustration"
                    width={1200}
                    height={900}
                    className="w-full h-full object-contain"
                    data-ai-hint="email marketing tool"
                  />
              </div>
              <AnimatedSectionText>
                <div className="space-y-6">
                    <h3 className="text-2xl md:text-3xl font-semibold font-headline text-foreground">Super Affordable. Seriously.</h3>
                    <p className="text-muted-foreground leading-relaxed">
                    Not the “free trial, then surprise bill” kind. Our Free Tier gives you full access to the essentials, no strings attached. And upgrades cost less than your next lunch. Whether you’re job hunting or growing your network, you shouldn’t have to pay CRM prices just to stay organized. FollowUps gives you the core tools without locking features behind expensive paywalls. It’s priced for professionals who are just getting started or moving fast.
                    </p>
                    <div className="border-l-4 border-primary pl-6 py-4">
                    <blockquote className="text-muted-foreground italic mb-4">
                        {newTestimonialsData[1].quote}
                    </blockquote>
                    {/* <div className="flex items-center">
                        <Image
                        data-ai-hint={newTestimonialsData[1].dataAiHint}
                        src={newTestimonialsData[1].avatar}
                        alt={newTestimonialsData[1].name}
                        width={40}
                        height={40}
                        className="rounded-full mr-3"
                        />
                        <div>
                        <p className="font-semibold text-sm text-foreground">{newTestimonialsData[1].name}</p>
                        <p className="text-xs text-muted-foreground">{newTestimonialsData[1].role}</p>
                        </div>
                    </div> */}
                    </div>
                </div>
              </AnimatedSectionText>
            </div>
          </div>
        </section>

        {/* New Section 2: Automations */}
        <section className="py-16 md:py-24 bg-background">
          <div className="container mx-auto px-[10vw]">
            <div className="grid md:grid-cols-2 gap-12 lg:gap-16 items-center">
              <AnimatedSectionText>
                <div className="space-y-6">
                    <h3 className="text-2xl md:text-3xl font-semibold font-headline text-foreground">Keep follow-ups ready for when you are</h3>
                    <p className="text-muted-foreground leading-relaxed">
                    Write smarter, not harder. When you save a job or a lead, FollowUps lets you attach follow-up content right then and there. Every opportunity can have its own pre-written follow-ups—so when the time comes, you already know what to say. No digging through sent mail, no guesswork, just send with clarity and confidence.
                    </p>
                    <div className="border-l-4 border-accent pl-6 py-4">
                    <blockquote className="text-muted-foreground italic mb-4">
                        {newTestimonialsData[2].quote}
                    </blockquote>
                    {/* <div className="flex items-center">
                        <Image
                        data-ai-hint={newTestimonialsData[2].dataAiHint}
                        src={newTestimonialsData[2].avatar}
                        alt={newTestimonialsData[2].name}
                        width={40}
                        height={40}
                        className="rounded-full mr-3"
                        />
                        <div>
                        <p className="font-semibold text-sm text-foreground">{newTestimonialsData[2].name}</p>
                        <p className="text-xs text-muted-foreground">{newTestimonialsData[2].role}</p>
                        </div>
                    </div> */}
                    </div>
                </div>
              </AnimatedSectionText>
              <div className="relative aspect-[4/3] rounded-xl overflow-hidden">
                <Image
                    src="https://res.cloudinary.com/dzxh5okyq/image/upload/v1750525850/landing-page-schedule-emails_bg0uq7.png"
                    alt="FollowUps automations illustration"
                    width={1200}
                    height={900}
                    className="w-full h-full object-contain"
                    data-ai-hint="workflow automation app"
                  />
              </div>
            </div>
          </div>
        </section>

        {/* <section className="py-16 md:py-24 bg-background">
          <div className="container mx-auto px-[10vw] mb-12 md:mb-16">
            <div className="grid md:grid-cols-2 gap-10 items-center">
              <div>
                <h2 id="testimonial-section-headline" className="text-3xl md:text-4xl font-bold font-headline text-foreground">
                  The FollowUps Advantage,<br/>
                  in <span className="text-primary">Their Words</span>
                </h2>
              </div>
              <div className="flex justify-center md:justify-end items-center">
                <Image
                  src="https://placehold.co/600x150.png"
                  alt="CRM Benefits Graphic"
                  width={600}
                  height={150}
                  className="rounded-lg shadow-md"
                  data-ai-hint="chart graph"
                />
              </div>
            </div>
          </div>

          <div className="container mx-auto px-[10vw]">
             <div className="grid md:grid-cols-3 gap-0 text-left max-w-6xl mx-auto">
              {newTestimonialsData.map((testimonial, index) => (
                <div
                  key={testimonial.name + index}
                  className={`p-6 flex flex-col ${index < newTestimonialsData.length - 1 ? 'border-b md:border-b-0 md:border-r border-border' : ''}`}
                >
                  <p className="text-muted-foreground mb-6 flex-grow text-base leading-relaxed">{testimonial.quote}</p>
                  <div className="flex items-center mt-auto">
                    <Image data-ai-hint={testimonial.dataAiHint} src={testimonial.avatar} alt={testimonial.name} width={40} height={40} className="rounded-full mr-3 border" />
                    <div>
                      <p className="font-semibold text-sm text-card-foreground">{testimonial.name}</p>
                      <p className="text-xs text-muted-foreground">{testimonial.role}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="text-center">
            </div>
          </div>
        </section> */}

        {/* New Hero-style CTA Section */}
        <section className="py-20 md:py-28 text-center bg-gradient-to-br from-slate-900 to-slate-800 text-slate-50">
          <div className="container mx-auto px-[10vw]">
            <div className="flex justify-center mb-8">
              <Logo />
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-10 font-headline">
              Join the thousands of <span className="text-primary">professionals</span> that trust FollowUps to <span className="text-primary">land opportunities</span>.
            </h2>
            <Button
              size="lg"
              className="text-lg px-10 py-7 shadow-xl rounded-full bg-slate-50 text-slate-900 hover:bg-slate-200 font-semibold"
              asChild
            >
              <Link href="/auth?action=signup">Let's get you sorted</Link>
            </Button>
            <div className="flex flex-wrap justify-center items-center gap-x-6 gap-y-3 mt-10 text-sm text-slate-300">
              <span className="flex items-center">
                <CheckCircle className="inline-block h-4 w-4 mr-1.5 text-green-400"/>Free Forever (Yes really!)
              </span>
              <span className="flex items-center">
                <CheckCircle className="inline-block h-4 w-4 mr-1.5 text-green-400"/>Super Affordable plans
              </span>
              <span className="flex items-center">
                <CheckCircle className="inline-block h-4 w-4 mr-1.5 text-green-400"/>Automated follow-up scheduling
              </span>
            </div>
            <div className="mt-16 lg:mt-20 max-w-5xl mx-auto">
              <div className="bg-slate-700/60 rounded-t-xl p-2 sm:p-3 shadow-2xl border-x border-t border-slate-600/50">
                <div className="flex space-x-1.5">
                  <span className="block w-3 h-3 rounded-full bg-red-500"></span>
                  <span className="block w-3 h-3 rounded-full bg-yellow-400"></span>
                  <span className="block w-3 h-3 rounded-full bg-green-500"></span>
                </div>
              </div>
              <Image
                  src="https://res.cloudinary.com/dzxh5okyq/image/upload/v1750525293/dashboard-light_ls14xr.png"
                  alt="FollowUps Application Screenshot"
                  width={1200}
                  height={750}
                  className="block dark:hidden w-full h-auto border-x border-b border-slate-600/50 rounded-b-xl shadow-2xl"
                  data-ai-hint="app interface dashboard"
                  priority
              />
              <Image
                  src="https://res.cloudinary.com/dzxh5okyq/image/upload/v1750525293/dashboard-dark_sfpzf6.png"
                  alt="FollowUps Application Screenshot"
                  width={1200}
                  height={750}
                  className="hidden dark:block w-full h-auto border-x border-b border-slate-600/50 rounded-b-xl shadow-2xl"
                  data-ai-hint="app interface dashboard dark"
                  priority
              />
              <div className="max-w-5xl mx-auto">
                <p className="text-slate-400 mt-2 text-right" style={{ fontSize: '0.625rem', lineHeight: '1' }}>
                  *Fictoral data for demonstration only.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-16 md:py-24 bg-background">
          <div className="container mx-auto px-[10vw]">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 font-headline text-foreground">
              Frequently Asked Questions
            </h2>
            <div className="max-w-3xl mx-auto">
              <Accordion type="single" collapsible className="w-full">
                {faqData.map((faq, index) => (
                  <AccordionItem value={`item-${index + 1}`} key={index} className="border-b bg-transparent shadow-none rounded-none">
                    <AccordionTrigger className="px-0 py-4 text-left font-semibold text-foreground hover:no-underline">
                      {faq.question}
                    </AccordionTrigger>
                    <AccordionContent className="px-0 pb-4 text-muted-foreground">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </div>
        </section>

        {/* Final CTA Section */}
        <section className="py-20 md:py-28 bg-secondary/30 text-center">
          <div className="container mx-auto px-[10vw]">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-8 font-headline text-foreground">
              Ready to level up your emails?
            </h2>
            <p className="max-w-xl mx-auto text-md sm:text-lg text-muted-foreground mb-10">
              No more missed follow-ups. No more lost connections.<br/>
              FollowUps keeps things simple, smart, and stress-free.
            </p>
            <Button
              size="lg"
              className="text-lg px-8 py-6 shadow-xl rounded-full bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"
              asChild
            >
              <Link href="/auth?action=signup">Unlock Your Free Account</Link>
            </Button>
          </div>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
