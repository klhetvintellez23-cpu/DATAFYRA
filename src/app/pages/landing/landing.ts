import { ChangeDetectionStrategy, Component, DestroyRef, inject, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NavbarComponent } from '../../components/navbar/navbar';
import { LustreTextComponent } from '../../components/ui/lustretext/lustretext';
import { WavyButtonComponent } from '../../components/ui/wavy-button/wavy-button';
import { TypingTextComponent } from '../../components/ui/typing-text/typing-text';
import { FooterComponent } from '../../components/footer/footer';
import { AuthModalService } from '../../services/auth-modal.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-landing',
  imports: [NavbarComponent, LustreTextComponent, WavyButtonComponent, TypingTextComponent, FooterComponent, RouterLink],
  templateUrl: './landing.html',
  styleUrl: './landing.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LandingPage implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly authModal = inject(AuthModalService);
  private readonly authService = inject(AuthService);

  readonly featureList = [
    {
      icon: 'dashboard_customize',
      title: 'Plantillas editables',
      description: 'Parte de formatos listos para satisfacción, producto, mercado y equipos internos.'
    },
    {
      icon: 'query_stats',
      title: 'Análisis inmediato',
      description: 'Consulta respuestas y métricas desde el panel sin preparar reportes manuales.'
    },
    {
      icon: 'lock',
      title: 'Cuenta segura',
      description: 'Tus encuestas quedan asociadas a tu usuario y puedes volver a editarlas cuando lo necesites.'
    },
    {
      icon: 'devices',
      title: 'Experiencia responsive',
      description: 'Crea, comparte y responde encuestas desde móvil, tablet o escritorio.'
    }
  ];

  readonly templateCategories = ['NPS', 'Educación', 'Recursos humanos', 'Mercado'];

  readonly popularTemplates = [
    {
      id: 'satisfaccion-cliente',
      image: 'https://images.unsplash.com/photo-1556745757-8d76bdb6984b?auto=format&fit=crop&q=80&w=1000',
      alt: 'Persona evaluando una experiencia de cliente en una pantalla',
      badge: 'NPS y feedback',
      title: 'Satisfacción del cliente',
      prompt: '¿Qué tan satisfecho estás con la experiencia?',
      description: 'Mide lealtad, calidad de servicio y oportunidades de mejora con preguntas listas para adaptar.'
    },
    {
      id: 'business',
      image: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&q=80&w=1000',
      alt: 'Equipo revisando datos y prioridades de negocio',
      badge: 'Operaciones',
      title: 'Crecimiento del negocio',
      prompt: '¿Qué área tiene mayor potencial este trimestre?',
      description: 'Recopila señales de mercado, cultura interna y prioridades para tomar mejores decisiones.'
    }
  ];

  readonly updatesList = [
    {
      type: 'new',
      tag: 'Nueva Función',
      title: 'Nuevo editor de encuestas v2',
      description: 'Hemos rediseñado por completo el editor de encuestas. Ahora incluye una barra lateral premium inspirada en herramientas modernas de diseño, soporte para personalización avanzada de temas y vistas en tiempo real con micro-animaciones.',
      date: '30 de Mayo, 2026'
    },
    {
      type: 'improvement',
      tag: 'Mejora',
      title: 'Optimización de rendimiento y velocidad',
      description: 'Redujimos el tamaño de los recursos CSS principales del editor, logrando cargar y compilar estilos de manera instantánea por debajo de los límites presupuestarios establecidos.',
      date: '24 de Mayo, 2026'
    },
    {
      type: 'new',
      tag: 'Nueva Función',
      title: 'Nuevas opciones de exportación',
      description: 'Exporta las respuestas recopiladas en formatos adicionales como PDF optimizado para reportes ejecutivos, Excel con tipado automático y JSON estructurado para integración.',
      date: '18 de Mayo, 2026'
    },
    {
      type: 'fix',
      tag: 'Corrección',
      title: 'Corrección de errores reportados',
      description: 'Corregimos la visualización de imágenes decorativas en ciertos navegadores móviles e implementamos mejoras de estabilidad y persistencia local en el almacenamiento.',
      date: '10 de Mayo, 2026'
    }
  ];

  ngOnInit(): void {
    this.route.queryParams.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const authParam = params['auth'];
      if (authParam) {
        this.authModal.open(authParam === 'login' ? 'login' : 'register');
      }
    });
  }

  openAuth(mode: 'login' | 'register', event: Event): void {
    event.preventDefault();
    if (this.authService.isLoggedIn()) {
      this.router.navigate(['/dashboard']);
    } else {
      this.authModal.open(mode);
    }
  }
}
