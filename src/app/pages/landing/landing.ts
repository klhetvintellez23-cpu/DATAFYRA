import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, signal } from '@angular/core';
import { Router } from '@angular/router';
import { NavbarComponent } from '../../components/navbar/navbar';
import { LustreTextComponent } from '../../components/ui/lustretext/lustretext';
import { WavyButtonComponent } from '../../components/ui/wavy-button/wavy-button';
import { TypingTextComponent } from '../../components/ui/typing-text/typing-text';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { OtpInputComponent } from '../../components/ui/otp-input/otp-input';

@Component({
  selector: 'app-landing',
  imports: [NavbarComponent, LustreTextComponent, WavyButtonComponent, TypingTextComponent, FormsModule, OtpInputComponent],
  templateUrl: './landing.html',
  styleUrl: './landing.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LandingPage implements OnInit, OnDestroy {
  private observer?: IntersectionObserver;

  stats = [
    { value: '50K+', label: 'Encuestas creadas' },
    { value: '2M+', label: 'Respuestas recibidas' },
    { value: '99.9%', label: 'Uptime' },
    { value: '4.9★', label: 'Rating promedio' }
  ];

  // --- Magic Auth State ---
  magicAuthOpen = signal(false);
  isLoginMode = signal(true);
  showPassword = signal(false);
  
  name = signal('');
  email = signal('');
  password = signal('');
  error = signal('');
  loading = signal(false);       // For email form
  googleLoading = signal(false); // For google button
  successMessage = signal('');
  isVerifying = signal(false);   
  otpToken = signal('');

  // Password Requirements (Computed)
  passHasMinLength = computed(() => this.password().length >= 8);
  passHasUpper = computed(() => /[A-Z]/.test(this.password()));
  passHasNumber = computed(() => /\d/.test(this.password()));
  passHasSpecial = computed(() => /[@$!%*?&]/.test(this.password()));
  passIsStrong = computed(() => 
    this.passHasMinLength() && this.passHasUpper() && this.passHasNumber() && this.passHasSpecial()
  );

  constructor(private auth: AuthService, private router: Router) {
    // Solo redirigir si ya hay sesión Y NO estamos esperando un código
    if (this.auth.isLoggedIn() && !this.isVerifying()) {
      this.router.navigate(['/dashboard']);
    }
  }

  togglePasswordVisibility(): void {
    this.showPassword.update(v => !v);
  }

  async googleLogin(): Promise<void> {
    this.googleLoading.set(true);
    this.error.set('');
    this.successMessage.set('');
    
    const result = await this.auth.loginWithGoogle();
    if (!result.success) {
      this.error.set(result.error || 'Error al conectar con Google.');
    }
    this.googleLoading.set(false);
  }

  features = [
    {
      icon: '✦',
      title: 'Editor Libre de Fricción',
      description: 'Escribir preguntas debe sentirse natural. Con nuestro editor dinámico y amigable, diseñar encuestas es tan fluido como escribir en un cuaderno mágico.'
    },
    {
      icon: '◆',
      title: 'Analíticas 100% Gratuitas',
      description: 'A diferencia de otras plataformas, nosotros no ocultamos tus métricas detrás de un muro de pago. Obtén gráficos, barras y tu NPS Score de manera instantánea y gratuita.'
    },
    {
      icon: '▲',
      title: 'Experiencia "Stitch" Premium',
      description: 'Encuestas que no dan pereza responder. Cautiva a tus usuarios con interfaces ultraligeras, márgenes amplios, lectura agradable y sombras espectaculares.'
    }
  ];

  openMagicAuth(isLogin: boolean, event?: Event): void {
    if (event) event.preventDefault();
    this.isLoginMode.set(isLogin);
    this.magicAuthOpen.set(true);
    this.error.set('');
    this.successMessage.set('');
    this.isVerifying.set(false);
    document.body.style.overflow = 'hidden'; 
  }

  closeMagicAuth(): void {
    this.magicAuthOpen.set(false);
    this.error.set('');
    this.successMessage.set('');
    this.isVerifying.set(false);
    document.body.style.overflow = '';
  }

  toggleMode(): void {
    this.isLoginMode.update(v => !v);
    this.error.set('');
    this.successMessage.set('');
    this.isVerifying.set(false);
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email);
  }

  private isPasswordSecure(password: string): boolean {
    // Mínimo 8 caracteres, al menos una mayúscula, un número y un carácter especial
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    return passwordRegex.test(password);
  }

  async submit(): Promise<void> {
    this.error.set('');
    this.successMessage.set('');

    const emailVal = this.email().trim();
    const passwordVal = this.password();

    // 1. Validaciones comunes
    if (!emailVal || !passwordVal) {
      this.error.set('Por favor, completa todos los campos.');
      return;
    }

    if (!this.isValidEmail(emailVal)) {
      this.error.set('El formato del correo electrónico no es válido.');
      return;
    }

    this.loading.set(true);

    if (this.isLoginMode()) {
      // MODO INICIAR SESIÓN
      const result = await this.auth.login(emailVal, passwordVal);
      if (result.success) {
        this.router.navigate(['/dashboard']);
      } else {
        this.error.set(result.error || 'Acceso denegado. Revisa tus credenciales.');
      }
    } else {
      // MODO REGISTRO
      if (!this.name().trim()) {
        this.error.set('Por favor, dinos tu nombre.');
        this.loading.set(false);
        return;
      }

      if (!this.isPasswordSecure(passwordVal)) {
        this.error.set('La contraseña debe tener al menos 8 caracteres, una mayúscula, un número y un símbolo (@$!%*?&).');
        this.loading.set(false);
        return;
      }

      const result = await this.auth.register(this.name(), emailVal, passwordVal);
      if (result.success) {
        this.isVerifying.set(true);
        this.successMessage.set('¡Código enviado! Revisa tu correo para verificar tu cuenta.');
      } else {
        this.error.set(result.error || 'Error al crear la cuenta.');
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

  ngOnInit(): void {
    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('vp-visible');
          }
        });
      },
      { threshold: 0.1 }
    );

    setTimeout(() => {
      document.querySelectorAll('.vp-scroll-reveal').forEach(el => {
        this.observer?.observe(el);
      });
    }, 100);
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }
}
