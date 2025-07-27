
'use client';

import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { supabase } from '@/lib/supabaseClient';
import type { User, Session, AuthChangeEvent } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoadingAuth: boolean;
  initialAuthCheckCompleted: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [initialAuthCheckCompleted, setInitialAuthCheckCompleted] = useState(false);

  useEffect(() => {
    let anInitialSessionChecked = false;

    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      if (!anInitialSessionChecked) {
        setSession(initialSession);
        setUser(initialSession?.user ?? null);
        setIsLoadingAuth(false);
        setInitialAuthCheckCompleted(true);
        anInitialSessionChecked = true;
      }
    }).catch(error => {
      if (!anInitialSessionChecked) {
        setIsLoadingAuth(false);
        setInitialAuthCheckCompleted(true);
        anInitialSessionChecked = true;
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event: AuthChangeEvent, sessionState: Session | null) => {
        setSession(sessionState);
        setUser(sessionState?.user ?? null);

        if (!anInitialSessionChecked) {
          setIsLoadingAuth(false);
          setInitialAuthCheckCompleted(true);
          anInitialSessionChecked = true;
        } else if (_event === 'SIGNED_IN' || _event === 'SIGNED_OUT' || _event === 'TOKEN_REFRESHED' || _event === 'USER_UPDATED' || _event === 'PASSWORD_RECOVERY') {
           setIsLoadingAuth(false);
        }
      }
    );

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, session, isLoadingAuth, initialAuthCheckCompleted }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
