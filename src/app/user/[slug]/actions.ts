
'use server';

import { createServerClient } from '@supabase/ssr';
import type { ResumeData } from '@/lib/types';
import type { UserSettings } from '@/lib/types';
import { cookies } from 'next/headers';

// This server action fetches the necessary data for a public profile page.
// It uses the service_role key to bypass RLS to find the user by slug,
// but then manually checks if the profile is public before returning any data.
export async function getPublicProfileBySlug(slug: string): Promise<{ fullName: string | null; resume: ResumeData | null; } | null> {
    
  const cookieStore = cookies()

  // Ensure environment variables are loaded.
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Supabase URL or Service Role Key is missing from environment variables.');
    return null;
  }

  // IMPORTANT: The service_role key is used here to bypass RLS for a public page lookup.
  // This is a privileged operation and this client should only be used on the server.
  const supabaseAdmin = createServerClient(
    supabaseUrl,
    supabaseServiceKey,
    {
      cookies: {
        async get(name: string) {
          return (await cookieStore).get(name)?.value
        },
        set(name: string, value: string, options) {
          // No-op for a service client
        },
        remove(name: string, options) {
          // No-op for a service client
        },
      },
      auth: {
        // This tells the client to act as a service role, bypassing RLS
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );

  const { data, error } = await supabaseAdmin
    .from('user_settings')
    .select('full_name, resume, is_profile_public, public_profile_slug')
    .eq('public_profile_slug', slug)
    .single();

  if (error) {
    return null;
  }
  
  // CRITICAL SECURITY CHECK: Only return data if the profile is explicitly public.
  if (data && data.is_profile_public) {
    const resumeData = data.resume as ResumeData | null;
    // const profileImageUrl = resumeData?.contactInfo?.profileImageUrl;

    const finalFullName = resumeData?.contactInfo?.name || data.full_name;
    
    const returnData = {
      fullName: finalFullName,
      // profileImageUrl: profileImageUrl,
      resume: resumeData,
    };
    
    return returnData;
  }
  
  // If no data or profile is not public, return null.
  return null;
}
