import { ChangeDetectionStrategy, Component, DestroyRef, inject, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { NavbarComponent } from '../../components/navbar/navbar';
import { LustreTextComponent } from '../../components/ui/lustretext/lustretext';
import { WavyButtonComponent } from '../../components/ui/wavy-button/wavy-button';
import { TypingTextComponent } from '../../components/ui/typing-text/typing-text';
import { AuthModalService } from '../../services/auth-modal.service';

@Component({
  selector: 'app-landing',
  imports: [NavbarComponent, LustreTextComponent, WavyButtonComponent, TypingTextComponent, RouterLink],
  templateUrl: './landing.html',
  styleUrl: './landing.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LandingPage implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  private readonly authModal = inject(AuthModalService);

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
      title: 'Acceso con cuenta segura',
      description: 'Tus encuestas quedan asociadas a tu usuario y puedes volver a editarlas cuando lo necesites.'
    },
    {
      icon: 'devices',
      title: 'Experiencia responsive',
      description: 'Las encuestas se pueden crear, compartir y responder desde móvil o escritorio.'
    }
  ];

  readonly templateCategories = ['NPS', 'Educación', 'Recursos humanos', 'Mercado'];

  readonly popularTemplates = [
    {
      id: 'satisfaccion-cliente',
      badge: 'NPS y feedback',
      title: 'Satisfacción del cliente',
      prompt: '¿Qué tan satisfecho estás con la experiencia?',
      description: 'Mide lealtad, calidad de servicio y oportunidades de mejora con preguntas listas para adaptar.'
    },
    {
      id: 'business',
      badge: 'Operaciones',
      title: 'Crecimiento del negocio',
      prompt: '¿Qué área tiene mayor potencial este trimestre?',
      description: 'Recopila señales de mercado, cultura interna y prioridades para tomar mejores decisiones.'
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
    this.authModal.open(mode);
  }
}
