export interface SupabaseRuntimeConfig {
  url: string;
  anonKey: string;
}

export function getSupabaseConfig(): SupabaseRuntimeConfig {
  const config = window.__env;
  const url = config?.supabaseUrl?.trim() ?? '';
  const anonKey = config?.supabaseAnonKey?.trim() ?? '';

  if (!url || !anonKey) {
    throw new Error(
      'Missing Supabase runtime configuration. Define window.__env.supabaseUrl and window.__env.supabaseAnonKey in public/env.js.'
    );
  }

  return { url, anonKey };
}
