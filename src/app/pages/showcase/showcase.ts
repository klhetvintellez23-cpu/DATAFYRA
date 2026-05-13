import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { NavbarComponent } from '../../components/navbar/navbar';
import { FooterComponent } from '../../components/footer/footer';
import { AuthModalService } from '../../services/auth-modal.service';

@Component({
  selector: 'app-showcase',
  standalone: true,
  imports: [CommonModule, NavbarComponent, FooterComponent, RouterLink],
  templateUrl: './showcase.html',
  styles: [`
    .showcase-hero {
      background:
        linear-gradient(135deg, rgba(249, 245, 255, 0.98), rgba(255, 255, 255, 0.72)),
        radial-gradient(circle at 80% 10%, rgba(127, 0, 255, 0.16), transparent 34%);
      border-bottom: 1px solid #e7e0ec;
    }

    .showcase-hero h1 span {
      color: #7F00FF;
    }

    .showcase-panel {
      background: #fff;
      border: 1px solid #e7e0ec;
      border-radius: 32px;
      padding: 2rem;
      box-shadow: 0 30px 80px rgba(64, 36, 102, 0.14);
    }

    .showcase-cases-section {
      background: #fff;
    }

    .showcase-cases-inner {
      padding: 2rem;
      border-radius: 36px;
      background: #fbf8ff;
      border: 1px solid #eee6f7;
    }

    .showcase-card {
      display: block;
      min-height: 100%;
      background: #fff;
      border: 1px solid #e7e0ec;
      border-radius: 28px;
      padding: 2rem;
      transition: transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease;
    }

    .showcase-card:hover {
      transform: translateY(-4px);
      border-color: #e9d5ff;
      box-shadow: 0 18px 45px rgba(124, 58, 237, 0.08);
    }

    .showcase-learn-section {
      background: #1d1b20;
      border-block: 1px solid rgba(255, 255, 255, 0.08);
    }

    .learn-grid-card {
      background: #fff;
      border-radius: 32px;
      border: 1px solid rgba(255, 255, 255, 0.12);
      overflow: hidden;
      box-shadow: 0 28px 70px rgba(0, 0, 0, 0.2);
    }

    .showcase-cta {
      background: #f9f5ff;
      border-bottom: 1px solid #e7e0ec;
    }

    @media (max-width: 640px) {
      .showcase-cases-inner {
        padding: 1rem;
        border-radius: 28px;
      }
    }
  `]
})
export class ShowcasePage {
  private authModal = inject(AuthModalService);

  readonly cases = [
    {
      title: 'Satisfacción del cliente',
      category: 'Feedback',
      description: 'Mide experiencia, satisfacción y oportunidades de mejora después de una compra o servicio.',
      icon: 'sentiment_satisfied',
      link: '/templates/satisfaccion-cliente'
    },
    {
      title: 'Investigación de mercado',
      category: 'Producto',
      description: 'Valida ideas, compara preferencias y entiende mejor la intención de compra.',
      icon: 'query_stats',
      link: '/templates/business'
    },
    {
      title: 'Clima organizacional',
      category: 'Equipos',
      description: 'Recoge señales internas con preguntas simples para equipos y operaciones.',
      icon: 'groups',
      link: '/templates'
    }
  ];

  readonly checklist = [
    {
      title: 'Preguntas claras',
      text: 'Estructuras cortas que ayudan a responder sin confusión.',
      icon: 'checklist'
    },
    {
      title: 'Opciones ordenadas',
      text: 'Respuestas consistentes para analizar resultados con menos ruido.',
      icon: 'format_list_bulleted'
    },
    {
      title: 'Flujos reutilizables',
      text: 'Ideas que puedes convertir en plantillas o encuestas propias.',
      icon: 'dynamic_form'
    },
    {
      title: 'Resultados accionables',
      text: 'Diseñado para que cada respuesta sirva para tomar una decisión.',
      icon: 'monitoring'
    }
  ];

  openAuth(mode: 'login' | 'register', event: Event): void {
    event.preventDefault();
    this.authModal.open(mode);
  }
}
