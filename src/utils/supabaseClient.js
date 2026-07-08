import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

const isPlaceholder = !supabaseUrl || 
                      supabaseUrl.includes('your-supabase-project') || 
                      !supabaseAnonKey || 
                      supabaseAnonKey.includes('placeholder');

if (isPlaceholder) {
  console.warn(
    'AetherTrack Warning: Supabase credentials are unset or placeholders in your .env file. ' +
    'Sign-in and cloud sync will not work until you connect your Supabase project URL and anon key.'
  );
}

// Fallback to local client if credentials are empty to avoid initialization errors
export const supabase = createClient(
  isPlaceholder ? 'https://placeholder-url.supabase.co' : supabaseUrl,
  isPlaceholder ? 'placeholder-key' : supabaseAnonKey
);

export const isSupabaseConfigured = !isPlaceholder;
