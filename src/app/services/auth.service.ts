import { Injectable, signal, computed, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';

export interface User {
  id: string;
  name: string;
  email: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private supabase = inject(SupabaseService).client;
  private currentUser = signal<User | null>(null);

  readonly user = this.currentUser.asReadonly();
  readonly isLoggedIn = computed(() => this.currentUser() !== null);

  constructor() {
    // Initial session check
    this.supabase.auth.getSession().then(({ data: { session } }) => {
      this.updateUser(session?.user ?? null);
    });

    // Listen for auth changes
    this.supabase.auth.onAuthStateChange((_event, session) => {
      this.updateUser(session?.user ?? null);
    });
  }

  private updateUser(sbUser: any | null) {
    if (sbUser) {
      this.currentUser.set({
        id: sbUser.id,
        name: sbUser.user_metadata?.['full_name'] || sbUser.email?.split('@')[0] || 'User',
        email: sbUser.email || ''
      });
    } else {
      this.currentUser.set(null);
    }
  }

  async loginWithGoogle(): Promise<{ success: boolean; error?: string }> {
    const { error } = await this.supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin + '/dashboard'
      }
    });

    if (error) return { success: false, error: this.mapError(error) };
    return { success: true };
  }

  async login(email: string, password: string): Promise<{ success: boolean; error?: string }> {
    const { error } = await this.supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) return { success: false, error: this.mapError(error) };
    return { success: true };
  }

  async register(name: string, email: string, password: string): Promise<{ success: boolean; error?: string }> {
    // MODO TEST: Bypass activo para evitar límites de Supabase
    console.warn('MODO TEST ACTIVO: Registro simulado');
    return { success: true };
  }

  async verifyCode(email: string, token: string): Promise<{ success: boolean; error?: string }> {
    // MODO TEST: El código secreto es 123456
    if (token === '123456') {
      console.warn('MODO TEST ACTIVO: Código correcto simulado');
      this.currentUser.set({
        id: 'test-user-id',
        name: 'Usuario de Prueba',
        email: email
      });
      return { success: true };
    }
    return { success: false, error: 'Código incorrecto (Usa 123456 para el test)' };
  }

  private mapError(error: any): string {
    const message = (error.message || '').toLowerCase();
    
    if (message.includes('invalid login credentials')) return 'Credenciales inválidas. Revisa tu correo y contraseña.';
    if (message.includes('email not confirmed')) return 'Debes confirmar tu correo electrónico antes de entrar.';
    if (message.includes('email already registered') || message.includes('user already registered')) return 'Este correo ya está registrado. Intenta iniciar sesión.';
    if (message.includes('rate limit exceeded') || message.includes('too many requests')) return 'Se ha superado el límite de solicitudes. Por favor, intenta de nuevo en unos minutos.';
    if (message.includes('password should be at least')) return 'La contraseña debe tener al menos 6 caracteres.';
    if (message.includes('signup is disabled')) return 'El registro está deshabilitado temporalmente.';
    
    return 'Ocurrió un error: ' + error.message;
  }

  async logout(): Promise<void> {
    await this.supabase.auth.signOut();
    this.currentUser.set(null);
  }
}
