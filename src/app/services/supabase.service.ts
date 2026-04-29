import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseConfig } from '../supabase.config';

@Injectable({
  providedIn: 'root'
})
export class SupabaseService {
  public client: SupabaseClient | null = null;
  public readonly isConfigured: boolean;

  constructor() {
    this.isConfigured = this.initializeClient();
  }

  private initializeClient(): boolean {
    try {
      const config = getSupabaseConfig();
      this.client = createClient(config.url, config.anonKey);
      return true;
    } catch (error) {
      console.warn(
        'Supabase runtime configuration is missing. Define window.__env.supabaseUrl and window.__env.supabaseAnonKey in public/env.js.',
        error
      );
      return false;
    }
  }
}
