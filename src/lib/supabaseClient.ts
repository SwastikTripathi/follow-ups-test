
import type { Database } from '@/lib/database.types';
import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Supabase URL or Anon Key is missing from environment variables. NEXT_PUBLIC_SUPABASE_URL and/or NEXT_PUBLIC_SUPABASE_ANON_KEY are undefined. See SERVER CONSOLE logs for details. If using Firebase Studio, check its specific documentation for setting local development environment variables, as .env.local might be insufficient.'
  );
}

export const supabase = createBrowserClient<Database>(
  supabaseUrl!,
  supabaseAnonKey!
);
