
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { Logo } from '@/components/icons/Logo';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  HoverCard,
  HoverCardTrigger,
  HoverCardContent,
} from '@/components/ui/hover-card';
import { Settings, LogOut, LayoutDashboard, Home, Crown, Menu, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Around } from "@theme-toggles/react";
import "@theme-toggles/react/css/Around.css";
import { cn } from '@/lib/utils';
import { useCurrentSubscription } from '@/hooks/use-current-subscription';
import { useAuth } from '@/contexts/AuthContext';

interface PublicNavbarProps {
  activeLink?: 'landing' | 'pricing' | 'blog' | 'about';
}

function getInitials(name?: string | null, email?: string | null): string {
  if (name) {
    const names = name.split(' ').filter(Boolean);
    if (names.length >= 2) {
      return `${names[0][0]}${names[1][0]}`.toUpperCase();
    } else if (names.length === 1 && names[0].length > 0) {
      return names[0].substring(0, 2).toUpperCase();
    }
  }
  if (email) {
    const emailPrefix = email.split('@')[0];
    if (emailPrefix.length >= 2) {
      return emailPrefix.substring(0, 2).toUpperCase();
    } else if (emailPrefix.length === 1) {
      return emailPrefix.toUpperCase();
    }
  }
  return 'U';
}


export function PublicNavbar({ activeLink }: PublicNavbarProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { user, isLoadingAuth: isLoadingAuthContext } = useAuth();
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const { actualUserTier, subscriptionLoading } = useCurrentSubscription();

  useEffect(() => {
    const storedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initialTheme = storedTheme || (systemPrefersDark ? 'dark' : 'light');
    setTheme(initialTheme);
    document.documentElement.classList.toggle('dark', initialTheme === 'dark');
  }, []);

  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMenuOpen]);


  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({ title: 'Sign Out Failed', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Signed Out Successfully' });
      router.push('/landing');
    }
  };

  const toggleThemeHandler = () => {
    setTheme(prevTheme => {
        const newTheme = prevTheme === 'light' ? 'dark' : 'light';
        document.documentElement.classList.toggle('dark', newTheme === 'dark');
        localStorage.setItem('theme', newTheme);
        return newTheme;
    });
  };

  const userInitials = user ? getInitials(user.user_metadata?.full_name, user.email) : 'U';
  const userDisplayName = user?.user_metadata?.full_name || user?.email || 'User';

  const desktopNavLinkClass = (linkType?: 'landing' | 'pricing' | 'blog' | 'about') => {
    const isActive = activeLink === linkType && typeof linkType !== 'undefined';
    return cn(
      "text-sm font-medium transition-colors hover:text-primary",
      isActive ? "text-primary font-semibold" : "text-muted-foreground"
    );
  };
  
  const mobileNavLinkClass = (linkType?: 'landing' | 'pricing' | 'blog' | 'about') => {
    const isActive = activeLink === linkType && typeof linkType !== 'undefined';
    return cn(
      "rounded-full px-3 py-1.5 sm:px-4 h-auto text-sm font-medium",
      "transition-colors duration-150 ease-in-out",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background",
       "md:justify-center justify-start",
      isActive
        ? "text-primary font-semibold cursor-default"
        : "text-foreground/70 hover:underline hover:underline-offset-4 active:text-primary/90"
    );
  };

  const menuItemClass = "relative flex cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50";
  
  const mobileNavLinks = (
    <>
      <Button variant="nav-text" asChild className={mobileNavLinkClass('about')}>
        <Link href="/about" onClick={() => setIsMenuOpen(false)}>About</Link>
      </Button>
      <Button variant="nav-text" asChild className={mobileNavLinkClass('blog')}>
        <Link href="/blog" onClick={() => setIsMenuOpen(false)}>Blog</Link>
      </Button>
      <Button variant="nav-text" asChild className={mobileNavLinkClass('pricing')}>
        <Link href={user ? "/settings/billing" : "/pricing"} onClick={() => setIsMenuOpen(false)}>Pricing</Link>
      </Button>
    </>
  );

  const authSection = (
    <div className="flex items-center gap-2">
      {/* @ts-ignore */}
      <Around
        toggled={theme === 'dark'}
        toggle={toggleThemeHandler}
        title="Toggle theme"
        aria-label="Toggle theme"
        className="theme-toggle text-foreground/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background hover:text-foreground/70 block h-6 w-6 p-0"
        style={{ '--theme-toggle__around--duration': '500ms' } as React.CSSProperties}
      />
      {isLoadingAuthContext ? (
        <div className="flex items-center space-x-2">
             <div className="h-8 w-20 rounded-full bg-muted animate-pulse"></div>
             <div className="h-9 px-4 py-2 rounded-full bg-muted animate-pulse w-32"></div>
        </div>
      ) : user ? (
        <HoverCard openDelay={0} closeDelay={200}>
          <HoverCardTrigger asChild>
            <Button
              variant="ghost"
              className={cn(
                "relative h-9 w-9 rounded-full p-0 focus-visible:outline-none",
                "ring-2 ring-primary ring-offset-2 ring-offset-background hover:ring-ring"
              )}
            >
              <Avatar className="h-9 w-9">
                <AvatarFallback className="bg-primary text-primary-foreground font-medium text-xs">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
              {(actualUserTier === 'pro' || actualUserTier === 'business') && !subscriptionLoading && (
                <Crown className="absolute -bottom-1 -right-1 h-4 w-4 text-yellow-500" fill="currentColor"/>
              )}
            </Button>
          </HoverCardTrigger>
          <HoverCardContent align="end" className="w-56 p-1" sideOffset={8}>
             <div className="px-2 py-1.5">
                <p className="text-sm font-medium leading-none truncate">{userDisplayName}</p>
                {user.email && <p className="text-xs leading-none text-muted-foreground truncate">{user.email}</p>}
             </div>
             <div className="my-1 h-px bg-muted" />
            <Link href="/landing" passHref legacyBehavior>
              <a className={cn(menuItemClass)}>
                <Home className="mr-2 h-4 w-4" />
                <span>Homepage</span>
              </a>
            </Link>
            <Link href="/" passHref legacyBehavior>
              <a className={cn(menuItemClass)}>
                <LayoutDashboard className="mr-2 h-4 w-4" />
                <span>Dashboard</span>
              </a>
            </Link>
            <Link href="/settings/account" passHref legacyBehavior>
               <a className={cn(menuItemClass)}>
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </a>
            </Link>
             <div className="my-1 h-px bg-muted" />
            <button
              onClick={handleSignOut}
              className={cn(menuItemClass, "w-full text-destructive hover:bg-destructive/20 focus:bg-destructive/20 hover:text-destructive focus:text-destructive")}
            >
              <LogOut className="mr-2 h-4 w-4" />
              <span>Sign Out</span>
            </button>
          </HoverCardContent>
        </HoverCard>
      ) : (
        <div className="flex items-center gap-1 sm:gap-2">
            <Button variant="link" asChild className="text-muted-foreground hidden sm:inline-flex">
              <Link href="/auth">Sign In</Link>
            </Button>
            <Button asChild className="shadow-md rounded-full h-9 px-4 text-sm">
            <Link href="/auth?action=signup">Get Started free</Link>
            </Button>
        </div>
      )}
    </div>
  );


  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 max-w-screen-2xl items-center justify-between mx-auto px-[5vw] md:px-[10vw]">
        <Link href="/landing" className="flex items-center space-x-2" onClick={() => setIsMenuOpen(false)}>
          <Logo />
        </Link>
        
        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-6">
            <nav className="flex items-center gap-6">
                <Link href="/about" className={desktopNavLinkClass('about')}>About</Link>
                <Link href="/blog" className={desktopNavLinkClass('blog')}>Blog</Link>
                <Link href={user ? "/settings/billing" : "/pricing"} className={desktopNavLinkClass('pricing')}>Pricing</Link>
            </nav>
            {authSection}
        </div>

        {/* Mobile Hamburger Button */}
        <div className="md:hidden">
          <Button variant="ghost" size="icon" onClick={() => setIsMenuOpen(!isMenuOpen)}>
            {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            <span className="sr-only">Toggle menu</span>
          </Button>
        </div>
      </div>
      
      {/* Mobile Menu */}
      <div className={cn(
          'md:hidden bg-background/95 border-t border-border/40 transition-all duration-300 ease-in-out overflow-hidden',
          isMenuOpen ? 'max-h-screen opacity-100' : 'max-h-0 opacity-0'
        )}>
        <div className="container mx-auto px-[5vw] py-4 flex flex-col space-y-4">
            <nav className="flex flex-col space-y-2 items-center">
              {mobileNavLinks}
            </nav>
            <div className="border-t border-border/40 pt-4 flex flex-col items-center space-y-3">
              {isLoadingAuthContext ? (
                  <div className="space-y-3 pt-2 w-full flex flex-col items-center">
                      <div className="h-8 w-24 rounded-md bg-muted animate-pulse"></div>
                      <div className="h-9 w-48 rounded-full bg-muted animate-pulse"></div>
                  </div>
              ) : user ? (
                  <div className="w-full flex justify-center">
                    {authSection} 
                  </div>
              ) : (
                  <>
                      <Button variant="nav-text" asChild className={cn(mobileNavLinkClass(), 'p-0 h-auto')}>
                          <Link href="/auth" onClick={() => setIsMenuOpen(false)}>Sign In</Link>
                      </Button>
                      <Button asChild className="shadow-md rounded-full h-9 px-4 text-sm w-full max-w-xs">
                          <Link href="/auth?action=signup" onClick={() => setIsMenuOpen(false)}>Get Started free</Link>
                      </Button>
                      <div className="flex items-center pt-2">
                          {/* @ts-ignore */}
                          <Around
                              toggled={theme === 'dark'}
                              toggle={toggleThemeHandler}
                              title="Toggle theme"
                              aria-label="Toggle theme"
                              className="theme-toggle text-foreground/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background hover:text-foreground/70 block h-6 w-6 p-0"
                              style={{ '--theme-toggle__around--duration': '500ms' } as React.CSSProperties}
                          />
                           <span className='ml-2 text-sm text-foreground/70'>Toggle Theme</span>
                      </div>
                  </>
              )}
            </div>
        </div>
      </div>
    </header>
  );
}
