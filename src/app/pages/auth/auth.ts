import { Component, signal, computed } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';

import { OtpInputComponent } from '../../components/ui/otp-input/otp-input';

@Component({
  selector: 'app-auth',
  imports: [FormsModule, RouterLink, OtpInputComponent],
  templateUrl: './auth.html',
  styleUrl: './auth.css'
})
export class AuthPage {
  isLogin = signal(true);
  name = signal('');
  email = signal('');
  password = signal('');
  error = signal('');
  loading = signal(false);
  isVerifying = signal(false);
  otpToken = signal('');
  showPassword = signal(false);

  // Password Requirements (Computed)
  passHasMinLength = computed(() => this.password().length >= 8);
  passHasUpper = computed(() => /[A-Z]/.test(this.password()));
  passHasNumber = computed(() => /\d/.test(this.password()));
  passHasSpecial = computed(() => /[@$!%*?&]/.test(this.password()));
  passIsStrong = computed(() => 
    this.passHasMinLength() && this.passHasUpper() && this.passHasNumber() && this.passHasSpecial()
  );

  constructor(private auth: AuthService, private router: Router) {
    if (auth.isLoggedIn() && !this.isVerifying()) {
      router.navigate(['/dashboard']);
    }
  }

  togglePasswordVisibility(): void {
    this.showPassword.update(v => !v);
  }

  toggleMode(): void {
    this.isLogin.update(v => !v);
    this.error.set('');
    this.isVerifying.set(false);
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email);
  }

  private isPasswordSecure(password: string): boolean {
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    return passwordRegex.test(password);
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

    if (this.isLogin()) {
      const result = await this.auth.login(emailVal, passwordVal);
      if (result.success) {
        this.router.navigate(['/dashboard']);
      } else {
        this.error.set(result.error || 'Credenciales inválidas. Revisa tu email y contraseña.');
      }
    } else {
      if (!this.name().trim()) {
        this.error.set('Por favor, dinos tu nombre.');
        this.loading.set(false);
        return;
      }

      if (!this.isPasswordSecure(passwordVal)) {
        this.error.set('La contraseña debe tener al menos 8 caracteres, una mayúscula, un número y un símbolo.');
        this.loading.set(false);
        return;
      }

      const result = await this.auth.register(this.name(), emailVal, passwordVal);
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
      this.router.navigate(['/dashboard']);
    } else {
      this.error.set(result.error || 'Código incorrecto o expirado.');
    }
    this.loading.set(false);
  }
}
