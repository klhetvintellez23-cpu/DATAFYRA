import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { NavbarComponent } from '../../components/navbar/navbar';
import { AuthModalService } from '../../services/auth-modal.service';

@Component({
  selector: 'app-showcase',
  standalone: true,
  imports: [CommonModule, NavbarComponent, RouterLink],
  templateUrl: './showcase.html',
  styles: [`
    .showcase-panel {
      background: #fff;
      border: 1px solid #f3f4f6;
      border-radius: 32px;
      padding: 2rem;
    }

    .showcase-card {
      display: block;
      min-height: 100%;
      background: #fff;
      border: 1px solid #f3f4f6;
      border-radius: 28px;
      padding: 2rem;
      transition: transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease;
    }

    .showcase-card:hover {
      transform: translateY(-4px);
      border-color: #e9d5ff;
      box-shadow: 0 18px 45px rgba(124, 58, 237, 0.08);
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
