
'use client';

import { useEffect, useState, useRef }
from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Eye, EyeOff, ArrowLeft } from 'lucide-react';

const trustedEmailProviders = [
  'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'aol.com', 'icloud.com',
  'protonmail.com', 'zoho.com', 'yandex.com', 'gmx.com', 'mail.com'
];
const trustedTLDs = [
  '.com', '.org', '.net', '.edu', '.gov', '.mil', '.co', '.io', '.ai', '.app',
  '.dev', '.tech', '.info', '.biz', '.us', '.ca', '.uk', '.in', '.au', '.de',
  '.fr', '.jp', '.br', '.cn', '.ru', '.nl', '.it', '.ch', '.se', '.no', '.es',
  '.xyz', '.online', '.site', '.website', '.space', '.store', '.agency',
  '.solutions', '.services', '.consulting', '.expert', '.training',
  '.co.in', '.co.uk', '.co.jp', '.co.za', '.com.au', '.com.br'
];

const emailValidation = z.string().email({ message: 'Invalid email address.' }).refine(email => {
  const domain = email.substring(email.lastIndexOf('@') + 1).toLowerCase();
  const tld = '.' + domain.split('.').pop();
  return trustedEmailProviders.includes(domain) || trustedTLDs.some(t => domain.endsWith(t));
}, {
  message: "Please use a trusted email provider. Disposable emails are not allowed."
});


const signInSchema = z.object({
  email: z.string().email({ message: 'Invalid email address.' }),
  password: z.string().min(1, { message: 'Password is required.' }),
});

const signUpSchema = z.object({
  email: emailValidation,
  password: z.string().min(6, { message: 'Password must be at least 6 characters.' }),
  confirmPassword: z.string().min(1, { message: 'Please confirm your password.' }),
  terms: z.boolean().refine(val => val === true, {
    message: "You must accept the terms and policies to create an account."
  }),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match.",
  path: ["confirmPassword"],
});

const forgotPasswordSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email address.' }),
});

type SignInFormValues = z.infer<typeof signInSchema>;
type SignUpFormValues = z.infer<typeof signUpSchema>;
type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

type AuthView = 'signin' | 'signup' | 'forgotpassword';

const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_SECONDS = 30;

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" className="mr-2">
    <path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      fill="#4285F4"
    />
    <path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      fill="#FBBC05"
    />
    <path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      fill="#EA4335"
    />
    <path d="M1 1h22v22H1z" fill="none" />
  </svg>
);

function getAuthRedirectUrl(): string {
    let url =
      process.env.NEXT_PUBLIC_SITE_URL || // Manual env var for live site
      process.env.NEXT_PUBLIC_VERCEL_URL || // Vercel system env var
      'http://localhost:9002'; // Default for local dev
    
    // Ensure it starts with https for Vercel/live URLs
    url = url.startsWith('http') ? url : `https://${url}`;
    // Ensure it doesn't have a trailing slash
    url = url.replace(/\/+$/, '');
    
    return `${url}/auth`;
}


export default function AuthComponent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [signUpAuthError, setSignUpAuthError] = useState<string | null>(null);
  const [showConfirmationMessage, setShowConfirmationMessage] = useState(false);
  const [currentView, setCurrentView] = useState<AuthView>('signin');
  const [showSignInPassword, setShowSignInPassword] = useState(false);
  const [showSignUpPassword, setShowSignUpPassword] = useState(false);
  const [showSignUpConfirmPassword, setShowSignUpConfirmPassword] = useState(false);
  const [isSendingResetLink, setIsSendingResetLink] = useState(false);

  // State for rate limiting
  const [failedLoginAttempts, setFailedLoginAttempts] = useState(0);
  const [isLoginLocked, setIsLoginLocked] = useState(false);
  const [lockoutTimeLeft, setLockoutTimeLeft] = useState(0);
  const lockoutTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (failedLoginAttempts >= MAX_LOGIN_ATTEMPTS) {
      setIsLoginLocked(true);
      setLockoutTimeLeft(LOCKOUT_DURATION_SECONDS);
      lockoutTimerRef.current = setInterval(() => {
        setLockoutTimeLeft(prev => prev - 1);
      }, 1000);
      setTimeout(() => {
        setIsLoginLocked(false);
        setFailedLoginAttempts(0);
        if (lockoutTimerRef.current) clearInterval(lockoutTimerRef.current);
      }, LOCKOUT_DURATION_SECONDS * 1000);
    }
  }, [failedLoginAttempts]);
  
  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (lockoutTimerRef.current) clearInterval(lockoutTimerRef.current);
    }
  }, []);

  const signInForm = useForm<SignInFormValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: '', password: '' },
  });

  const signUpForm = useForm<SignUpFormValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { email: '', password: '', confirmPassword: '', terms: false },
  });

  const forgotPasswordForm = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });


  useEffect(() => {
    setIsCheckingAuth(true);

    const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        if (event === 'PASSWORD_RECOVERY') {
          toast({ title: "Password Updated", description: "You can now manage your account settings." });
          router.replace('/settings/account#security');
        } else {
          router.replace('/');
        }
      } else {
        setIsCheckingAuth(false);
      }
    });

    const action = searchParams?.get('action');
    if (action === 'signup') {
      setCurrentView('signup');
    } else {
      setCurrentView('signin');
    }

    return () => {
      authSubscription?.unsubscribe();
    };
  }, [router, searchParams, toast]);


  const handleSignIn = async (values: SignInFormValues) => {
    setIsLoading(true);
    setAuthError(null);
    try {
      const { error, data } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      });
      if (error) {
        setAuthError(error.message);
        setFailedLoginAttempts(prev => prev + 1);
      } else {
        setFailedLoginAttempts(0); // Reset on success
        toast({ title: 'Signed In Successfully!'});
        router.replace('/');
      }
    } catch (error: any) {
      setAuthError(error.message || 'An unexpected error occurred.');
    }
    setIsLoading(false);
  };

  const handleSignUp = async (values: SignUpFormValues) => {
    setIsLoading(true);
    setSignUpAuthError(null);
    setShowConfirmationMessage(false);

    const signUpRedirectURL = getAuthRedirectUrl();

    if (!signUpRedirectURL && process.env.NEXT_PUBLIC_SITE_URL) {
        toast({ title: 'Configuration Error', description: 'Site URL is improperly configured. Cannot proceed with sign up.', variant: 'destructive' });
        setIsLoading(false);
        return;
    }
    
    try {
      const { data, error } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
        options: {
          emailRedirectTo: signUpRedirectURL,
        },
      });

      if (error) {
        setSignUpAuthError(error.message);
      } else if (data.session) {
        toast({ title: 'Account Created & Signed In!' });
        router.replace('/');
      } else if (data.user && data.user.identities && data.user.identities.length === 0) {
        setSignUpAuthError("An account with this email already exists. Please sign in instead.");
      } else if (data.user) {
        setShowConfirmationMessage(true);
        signUpForm.reset();
        signInForm.setValue('email', values.email); 
        setCurrentView('signin'); 
      } else {
         setSignUpAuthError('An unexpected outcome occurred during sign up.');
      }
    } catch (error: any) {
      setSignUpAuthError(error.message || 'An unexpected error occurred.');
    }
    setIsLoading(false);
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    setAuthError(null);
    setSignUpAuthError(null);
    
    const googleRedirectURL = getAuthRedirectUrl(); 
    
    if (!googleRedirectURL && process.env.NEXT_PUBLIC_SITE_URL) {
        toast({ title: 'Configuration Error', description: 'Site URL for Google Sign-In is improperly configured.', variant: 'destructive' });
        setIsGoogleLoading(false);
        return;
    }

    const { error, data } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: googleRedirectURL,
      },
    });
    if (error) {
      setAuthError(error.message);
      setSignUpAuthError(error.message);
      toast({ title: 'Google Sign-In Failed', description: error.message, variant: 'destructive' });
      setIsGoogleLoading(false);
    }
  };

  const handleForgotPasswordRequest = async (values: ForgotPasswordFormValues) => {
    setIsSendingResetLink(true);
    setAuthError(null);
    
    const resetLinkRedirectTo = getAuthRedirectUrl();

    if (!resetLinkRedirectTo && process.env.NEXT_PUBLIC_SITE_URL) {
        toast({ title: 'Configuration Error', description: 'Site URL for password reset is improperly configured.', variant: 'destructive' });
        setIsSendingResetLink(false);
        return;
    }

    try {
      const { error, data } = await supabase.auth.resetPasswordForEmail(values.email, {
        redirectTo: resetLinkRedirectTo 
      });
      if (error) {
        setAuthError(error.message);
        toast({ title: 'Password Reset Failed', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Password Reset Email Sent', description: 'If an account exists for this email, a password reset link has been sent.' });
        forgotPasswordForm.reset();
        setCurrentView('signin'); 
      }
    } catch (error: any) {
      setAuthError(error.message || 'An unexpected error occurred.');
      toast({ title: 'Password Reset Error', description: error.message || 'An unexpected error occurred.', variant: 'destructive' });
    }
    setIsSendingResetLink(false);
  };


  if (isCheckingAuth) {
    return <Loader2 className="h-12 w-12 animate-spin text-primary" />;
  }

  return (
    <>
      {currentView === 'forgotpassword' ? (
        <Card className="w-full max-w-md shadow-xl">
          <CardHeader>
            <CardTitle className="font-headline">Reset Your Password</CardTitle>
            <CardDescription>
              Enter your email address below and we'll send you a link to reset your password.
            </CardDescription>
          </CardHeader>
          <Form {...forgotPasswordForm}>
            <form onSubmit={forgotPasswordForm.handleSubmit(handleForgotPasswordRequest)}>
              <CardContent className="space-y-4">
                <FormField
                  control={forgotPasswordForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Address</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="you@example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {authError && <p className="text-sm text-destructive">{authError}</p>}
              </CardContent>
              <CardFooter className="flex-col items-stretch space-y-3">
                <Button type="submit" disabled={isSendingResetLink} className="w-full">
                  {isSendingResetLink && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Send Reset Link
                </Button>
                <Button
                  type="button"
                  variant="link"
                  className="text-primary hover:underline text-sm"
                  onClick={() => setCurrentView('signin')}
                >
                  <ArrowLeft className="mr-1 h-4 w-4" /> Back to Sign In
                </Button>
              </CardFooter>
            </form>
          </Form>
        </Card>
      ) : (
          <Tabs value={currentView} onValueChange={(value) => setCurrentView(value as AuthView)} className="w-full max-w-md">
              <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Create Account</TabsTrigger>
              </TabsList>
              <TabsContent value="signin">
              <Card className="shadow-xl">
                  <CardHeader>
                  <CardTitle className="font-headline">Welcome Back!</CardTitle>
                  <CardDescription>Sign in to access your FollowUps dashboard.</CardDescription>
                  </CardHeader>
                  <Form {...signInForm}>
                  <form onSubmit={signInForm.handleSubmit(handleSignIn)}>
                      <CardContent className="space-y-4">
                      <FormField
                          control={signInForm.control}
                          name="email"
                          render={({ field }) => (
                          <FormItem>
                              <FormLabel>Email</FormLabel>
                              <FormControl>
                              <Input type="email" placeholder="you@example.com" {...field} />
                              </FormControl>
                              <FormMessage />
                          </FormItem>
                          )}
                      />
                      <FormField
                          control={signInForm.control}
                          name="password"
                          render={({ field }) => (
                          <FormItem>
                              <FormLabel>Password</FormLabel>
                              <div className="relative">
                                  <FormControl>
                                  <Input
                                      type={showSignInPassword ? 'text' : 'password'}
                                      placeholder="••••••••"
                                      {...field}
                                      className="pr-10"
                                  />
                                  </FormControl>
                                  <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground hover:text-primary"
                                  onClick={() => setShowSignInPassword(!showSignInPassword)}
                                  tabIndex={-1}
                                  >
                                  {showSignInPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                  <span className="sr-only">{showSignInPassword ? 'Hide password' : 'Show password'}</span>
                                  </Button>
                              </div>
                              <div className="flex justify-end mt-1">
                                <Button
                                    type="button"
                                    variant="link"
                                    className="p-0 h-auto text-xs text-primary hover:underline"
                                    onClick={() => setCurrentView('forgotpassword')}
                                >
                                    Forgot password?
                                </Button>
                              </div>
                              <FormMessage />
                          </FormItem>
                          )}
                      />
                      {showConfirmationMessage && (
                          <p className="text-sm text-green-600 bg-green-50 p-3 rounded-md border border-green-200">
                          Account created! Please check your email to confirm your account before signing in.
                          </p>
                      )}
                      {authError && <p className="text-sm text-destructive">{authError}</p>}
                       {isLoginLocked && (
                        <p className="text-sm text-destructive text-center">
                          Too many failed attempts. Please try again in {lockoutTimeLeft} seconds.
                        </p>
                      )}
                      </CardContent>
                      <CardFooter className="flex-col items-stretch space-y-3">
                      <Button type="submit" className="w-full" disabled={isLoading || isGoogleLoading || isLoginLocked}>
                          {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                          {isLoginLocked ? "Locked" : "Sign In"}
                      </Button>
                      <div className="relative my-2">
                          <div className="absolute inset-0 flex items-center">
                          <span className="w-full border-t" />
                          </div>
                          <div className="relative flex justify-center text-xs uppercase">
                          <span className="bg-card px-2 text-muted-foreground">
                              Or continue with
                          </span>
                          </div>
                      </div>
                      <Button variant="outline" type="button" className="w-full" onClick={handleGoogleSignIn} disabled={isLoading || isGoogleLoading}>
                          {isGoogleLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <GoogleIcon />}
                          Sign in with Google
                      </Button>
                      </CardFooter>
                  </form>
                  </Form>
              </Card>
              </TabsContent>
              <TabsContent value="signup">
              <Card className="shadow-xl">
                  <CardHeader>
                  <CardTitle className="font-headline">Create an Account</CardTitle>
                  <CardDescription>Join FollowUps to streamline your outreach.</CardDescription>
                  </CardHeader>
                  <Form {...signUpForm}>
                  <form onSubmit={signUpForm.handleSubmit(handleSignUp)}>
                      <CardContent className="space-y-4">
                      <FormField
                          control={signUpForm.control}
                          name="email"
                          render={({ field }) => (
                          <FormItem>
                              <FormLabel>Email</FormLabel>
                              <FormControl>
                              <Input type="email" placeholder="you@example.com" {...field} />
                              </FormControl>
                              <FormMessage />
                          </FormItem>
                          )}
                      />
                      <FormField
                          control={signUpForm.control}
                          name="password"
                          render={({ field }) => (
                          <FormItem>
                              <FormLabel>Password</FormLabel>
                              <div className="relative">
                                  <FormControl>
                                  <Input
                                      type={showSignUpPassword ? 'text' : 'password'}
                                      placeholder="Must be at least 6 characters"
                                      {...field}
                                      className="pr-10"
                                  />
                                  </FormControl>
                                  <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground hover:text-primary"
                                  onClick={() => setShowSignUpPassword(!showSignUpPassword)}
                                  tabIndex={-1}
                                  >
                                  {showSignUpPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                  <span className="sr-only">{showSignUpPassword ? 'Hide password' : 'Show password'}</span>
                                  </Button>
                              </div>
                              <FormMessage />
                          </FormItem>
                          )}
                      />
                      <FormField
                          control={signUpForm.control}
                          name="confirmPassword"
                          render={({ field }) => (
                          <FormItem>
                              <FormLabel>Confirm Password</FormLabel>
                              <div className="relative">
                                  <FormControl>
                                  <Input
                                      type={showSignUpConfirmPassword ? 'text' : 'password'}
                                      placeholder="Confirm your password"
                                      {...field}
                                      className="pr-10"
                                  />
                                  </FormControl>
                                  <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground hover:text-primary"
                                  onClick={() => setShowSignUpConfirmPassword(!showSignUpConfirmPassword)}
                                  tabIndex={-1}
                                  >
                                  {showSignUpConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                  </Button>
                              </div>
                              <FormMessage />
                          </FormItem>
                          )}
                      />
                      <FormField
                        control={signUpForm.control}
                        name="terms"
                        render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0 pt-2">
                            <FormControl>
                                <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                                <FormLabel className="text-sm font-normal text-muted-foreground">
                                I agree to the{' '}
                                <Link href="/terms-and-conditions" target="_blank" className="underline hover:text-primary">
                                    Terms & Conditions
                                </Link>
                                ,{' '}
                                <Link href="/privacy-policy" target="_blank" className="underline hover:text-primary">
                                    Privacy Policy
                                </Link>
                                ,{' '}
                                <Link href="/cookie-policy" target="_blank" className="underline hover:text-primary">
                                    Cookie Policy
                                </Link>
                                , and{' '}
                                <Link href="/refund-policy" target="_blank" className="underline hover:text-primary">
                                    Refund Policy
                                </Link>
                                .
                                </FormLabel>
                                <FormMessage />
                            </div>
                            </FormItem>
                        )}
                        />
                      {signUpAuthError && <p className="text-sm text-destructive mt-4">{signUpAuthError}</p>}
                      </CardContent>
                      <CardFooter className="flex-col items-stretch space-y-3">
                      <Button type="submit" className="w-full" disabled={isLoading || isGoogleLoading}>
                          {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                          Create Account
                      </Button>
                      <div className="relative my-2">
                          <div className="absolute inset-0 flex items-center">
                          <span className="w-full border-t" />
                          </div>
                          <div className="relative flex justify-center text-xs uppercase">
                          <span className="bg-card px-2 text-muted-foreground">
                              Or sign up with
                          </span>
                          </div>
                      </div>
                      <Button variant="outline" type="button" className="w-full" onClick={handleGoogleSignIn} disabled={isLoading || isGoogleLoading}>
                          {isGoogleLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <GoogleIcon />}
                          Sign up with Google
                      </Button>
                      </CardFooter>
                  </form>
                  </Form>
              </Card>
              </TabsContent>
          </Tabs>
      )}
    </>
  );
}
