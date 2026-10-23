import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/** null when env vars are missing → the app runs in local-only mode. */
export const supabase: SupabaseClient | null = url && key ? createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true } }) : null;
export const hasBackend = !!supabase;
