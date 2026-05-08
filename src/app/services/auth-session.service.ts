import { Injectable, signal } from '@angular/core';
import { User as SupabaseUser, type SupabaseClient } from '@supabase/supabase-js';
import type { User } from './auth.service';

@Injectable({ providedIn: 'root' })
export class AuthSessionService {
  private readonly currentUser = signal<User | null>(null);

  readonly user = this.currentUser.asReadonly();

  initialize(client: SupabaseClient | null): void {
    if (!client) {
      this.currentUser.set(null);
      return;
    }

    client.auth.getSession().then(({ data: { session } }) => {
      this.updateUser(session?.user ?? null);
    });

    client.auth.onAuthStateChange((_event, session) => {
      this.updateUser(session?.user ?? null);
    });
  }

  updateUser(sbUser: SupabaseUser | null): void {
    if (sbUser) {
      this.currentUser.set({
        id: sbUser.id,
        name: sbUser.user_metadata?.['full_name'] || sbUser.email?.split('@')[0] || 'User',
        email: sbUser.email || ''
      });
      return;
    }

    this.currentUser.set(null);
  }

  clear(): void {
    this.currentUser.set(null);
  }
}
