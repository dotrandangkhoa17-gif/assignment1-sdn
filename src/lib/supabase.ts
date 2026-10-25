import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let clientInstance: SupabaseClient | null = null;

/**
 * Returns a singleton Supabase client if environment variables are provided.
 * Returns null if Supabase URL or Anon Key is missing.
 */
export function getSupabaseClient(): SupabaseClient | null {
  if (typeof window === 'undefined') {
    if (!supabaseUrl || !supabaseAnonKey) {
      return null;
    }
    return createClient(supabaseUrl, supabaseAnonKey);
  }

  if (clientInstance) {
    return clientInstance;
  }

  if (supabaseUrl && supabaseAnonKey && supabaseAnonKey.trim() !== '') {
    try {
      clientInstance = createClient(supabaseUrl, supabaseAnonKey, {
        realtime: {
          params: {
            eventsPerSecond: 10,
          },
        },
      });
      return clientInstance;
    } catch (err) {
      console.warn('Failed to initialize Supabase client:', err);
      return null;
    }
  }

  return null;
}
