import { Injectable, signal, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';

export type AuthMode = 'login' | 'register';

@Injectable({
  providedIn: 'root'
})
export class AuthModalService {
  private auth = inject(AuthService);
  private router = inject(Router);

  isOpen = signal<boolean>(false);
  mode = signal<AuthMode>('login');

  // Form state
  name = signal('');
  email = signal('');
  password = signal('');
  error = signal('');
  loading = signal(false);
  isVerifying = signal(false);
  otpToken = signal('');

  // Password strength computed
  passHasMinLength = computed(() => this.password().length >= 8);
  passHasUpper = computed(() => /[A-Z]/.test(this.password()));
  passHasNumber = computed(() => /\d/.test(this.password()));
  passHasSpecial = computed(() => /[@$!%*?&#]/.test(this.password()));
  passIsStrong = computed(() =>
    this.passHasMinLength() && this.passHasUpper() && this.passHasNumber() && this.passHasSpecial()
  );

  open(mode: AuthMode = 'login') {
    this.mode.set(mode);
    this.isOpen.set(true);
    this.error.set('');
    this.isVerifying.set(false);
    document.body.style.overflow = 'hidden';
  }

  close() {
    this.isOpen.set(false);
    document.body.style.overflow = 'auto';
    this.error.set('');
    this.isVerifying.set(false);
  }

  toggleMode() {
    this.mode.set(this.mode() === 'login' ? 'register' : 'login');
    this.error.set('');
    this.isVerifying.set(false);
  }

  async loginWithGoogle(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    const result = await this.auth.loginWithGoogle();
    if (!result.success) {
      this.error.set(result.error || 'Error al conectar con Google.');
    }
    this.loading.set(false);
  }

  async submit(): Promise<void> {
    this.error.set('');
    const emailVal = this.email().trim();
    const passwordVal = this.password();

    if (!emailVal || !passwordVal) {
      this.error.set('Por favor, completa todos los campos.');
      return;
    }

    if (!this.isValidEmail(emailVal)) {
      this.error.set('El formato del correo electrónico no es válido.');
      return;
    }

    this.loading.set(true);

    if (this.mode() === 'login') {
      const result = await this.auth.login(emailVal, passwordVal);
      if (result.success) {
        this.close();
        this.router.navigate(['/dashboard']);
      } else {
        this.error.set(result.error || 'Credenciales inválidas.');
      }
    } else {
      if (!this.name().trim()) {
        this.error.set('Por favor, ingresa tu nombre.');
        this.loading.set(false);
        return;
      }
      if (!this.passIsStrong()) {
        this.error.set('La contraseña debe tener mínimo 8 caracteres, una mayúscula, un número y un símbolo.');
        this.loading.set(false);
        return;
      }

      const result = await this.auth.register(this.name().trim(), emailVal, passwordVal);
      if (result.success) {
        this.isVerifying.set(true);
      } else {
        this.error.set(result.error || 'Error al registrarse.');
      }
    }

    this.loading.set(false);
  }

  async verifyOtp(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    const result = await this.auth.verifyCode(this.email(), this.otpToken());
    if (result.success) {
      this.close();
      this.router.navigate(['/dashboard']);
    } else {
      this.error.set(result.error || 'Código incorrecto o expirado.');
    }
    this.loading.set(false);
  }

  private isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }
}
