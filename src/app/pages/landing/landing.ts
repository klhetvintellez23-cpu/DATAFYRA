import { ChangeDetectionStrategy, Component, DestroyRef, inject, OnDestroy, OnInit, signal, computed } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { NavbarComponent } from '../../components/navbar/navbar';
import { LustreTextComponent } from '../../components/ui/lustretext/lustretext';
import { WavyButtonComponent } from '../../components/ui/wavy-button/wavy-button';
import { TypingTextComponent } from '../../components/ui/typing-text/typing-text';
import { AuthService } from '../../services/auth.service';
import { AuthValidationService } from '../../services/auth-validation.service';
import { AuthModalService } from '../../services/auth-modal.service';

@Component({
  selector: 'app-landing',
  imports: [NavbarComponent, LustreTextComponent, WavyButtonComponent, TypingTextComponent],
  templateUrl: './landing.html',
  styleUrl: './landing.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LandingPage implements OnInit, OnDestroy {
  private observer?: IntersectionObserver;
  private idleCallbackId?: number;
  private readonly destroyRef = inject(DestroyRef);

  stats = [
    { value: '50K+', label: 'Encuestas creadas' },
    { value: '2M+', label: 'Respuestas recibidas' },
    { value: '99.9%', label: 'Uptime' },
    { value: '4.9★', label: 'Rating promedio' }
  ];

  magicAuthOpen = signal(false);
  isLoginMode = signal(true);
  showPassword = signal(false);

  name = signal('');
  email = signal('');
  password = signal('');
  error = signal('');
  loading = signal(false);
  googleLoading = signal(false);
  successMessage = signal('');
  isVerifying = signal(false);
  otpToken = signal('');

  passHasMinLength = computed(() => this.password().length >= 8);
  passHasUpper = computed(() => /[A-Z]/.test(this.password()));
  passHasNumber = computed(() => /\d/.test(this.password()));
  passHasSpecial = computed(() => /[@$!%*?&#]/.test(this.password()));
  passIsStrong = computed(() =>
    this.passHasMinLength() && this.passHasUpper() && this.passHasNumber() && this.passHasSpecial()
  );

  constructor(
    private readonly auth: AuthService,
    private readonly router: Router,
    private readonly route: ActivatedRoute,
    private readonly authValidation: AuthValidationService,
    public readonly authModal: AuthModalService
  ) {}

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

  togglePasswordVisibility(): void {
    this.showPassword.update((value) => !value);
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

  openMagicAuth(isLogin: boolean, event?: Event): void {
    event?.preventDefault();
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

  openAuth(mode: 'login' | 'register', event: Event): void {
    event.preventDefault();
    this.authModal.open(mode);
  }

  toggleMode(): void {
    this.isLoginMode.update((value) => !value);
    this.error.set('');
    this.successMessage.set('');
    this.isVerifying.set(false);
  }

  private isValidEmail(email: string): boolean {
    return this.authValidation.isValidEmail(email);
  }

  private isPasswordSecure(password: string): boolean {
    return this.authValidation.isPasswordSecure(password);
  }

  private redirectIfLoggedIn(): void {
    if (this.auth.isLoggedIn() && !this.isVerifying()) {
      this.router.navigate(['/dashboard']);
    }
  }

  async submit(): Promise<void> {
    this.error.set('');
    this.successMessage.set('');

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

    if (this.isLoginMode()) {
      const result = await this.auth.login(emailVal, passwordVal);
      if (result.success) {
        this.router.navigate(['/dashboard']);
      } else {
        this.error.set(result.error || 'Acceso denegado. Revisa tus credenciales.');
      }
    } else {
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
        this.successMessage.set('Código enviado. Revisa tu correo para verificar tu cuenta.');
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
    this.redirectIfLoggedIn();

    this.route.queryParams.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const authParam = params['auth'];
      if (authParam) {
        this.authModal.open(authParam === 'login' ? 'login' : 'register');
      }
    });

    requestAnimationFrame(() => {
      this.scheduleDeferredVisualSetup();
    });
  }

  private initializeIntersectionObserver(): void {
    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('vp-visible');
          }
        });
      },
      { threshold: 0.1 }
    );
  }

  private observeRevealElements(): void {
    document.querySelectorAll('.vp-scroll-reveal').forEach((element) => {
      this.observer?.observe(element);
    });
  }

  private scheduleDeferredVisualSetup(): void {
    const setup = () => {
      this.initializeIntersectionObserver();
      this.observeRevealElements();
    };

    const requestIdle = window.requestIdleCallback as ((callback: IdleRequestCallback) => number) | undefined;
    if (requestIdle) {
      this.idleCallbackId = requestIdle(() => setup());
      return;
    }

    this.idleCallbackId = window.setTimeout(setup, 150);
  }

  ngOnDestroy(): void {
    if (this.idleCallbackId !== undefined) {
      const cancelIdle = window.cancelIdleCallback as ((handle: number) => void) | undefined;
      if (cancelIdle) {
        cancelIdle(this.idleCallbackId);
      } else {
        clearTimeout(this.idleCallbackId);
      }
    }

    this.observer?.disconnect();
    document.body.style.overflow = '';
  }
}
