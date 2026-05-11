import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NavbarComponent } from '../../components/navbar/navbar';
import { AuthModalService } from '../../services/auth-modal.service';
import { AuthService } from '../../services/auth.service';
import { SurveyService } from '../../services/survey.service';
import { QuestionType } from '../../services/survey-repository.service';

interface TemplateQuestion {
  text: string;
  type: 'choice' | 'rating' | 'text' | 'dropdown';
  options?: string[];
  placeholder?: string;
}

interface TemplateData {
  id: string;
  title: string;
  category: string;
  popularity: string;
  description: string;
  idealFor: string[];
  fullDescription: string;
  questions: TemplateQuestion[];
}

@Component({
  selector: 'app-template-details',
  standalone: true,
  imports: [CommonModule, NavbarComponent, RouterLink],
  templateUrl: './template-details.html',
  styleUrl: './template-details.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TemplateDetailsPage implements OnInit {
  private route = inject(ActivatedRoute);
  private authModalService = inject(AuthModalService);
  private auth = inject(AuthService);
  private surveyService = inject(SurveyService);
  private router = inject(Router);

  templateId: string | null = null;
  template: TemplateData | undefined;
  isCreating = signal(false);

  templates: Record<string, TemplateData> = {
    'satisfaccion-cliente': {
      id: 'satisfaccion-cliente',
      title: 'Satisfacción del cliente',
      category: 'Feedback del usuario',
      popularity: '14742',
      description: 'Midiendo la satisfacción de los clientes conocerá su opinión sobre la empresa y el nivel de los servicios ofertados.',
      idealFor: ['empresas productoras', 'sociedades mercantiles', 'autónomos', 'agencias de marketing'],
      fullDescription: 'Verifique qué artículos son más solicitados, cómo reaccionan los clientes a sus precios en comparación con la competencia o cuál es la opinión sobre la calidad de atención.',
      questions: [
        {
          text: '¿Es útil el uso de nuestros servicios/productos para usted?',
          type: 'choice',
          options: ['Sí, mucho', 'Más bien sí', 'No sé', 'Más bien no', 'No, en absoluto']
        },
        {
          text: '¿Qué tan satisfecho estás con la experiencia general?',
          type: 'rating'
        },
        {
          text: '¿Qué mejorarías de nuestro proceso de atención?',
          type: 'text',
          placeholder: 'Escribe tus comentarios aquí...'
        },
        {
          text: '¿Cómo calificaría la rapidez de nuestra respuesta a sus consultas?',
          type: 'choice',
          options: ['Excelente', 'Buena', 'Promedio', 'Lenta', 'Muy lenta']
        },
        {
          text: '¿Qué probabilidad hay de que recomiende nuestra empresa a un amigo?',
          type: 'choice',
          options: ['0 - Nada probable', '1-3', '4-6', '7-8', '9-10 - Muy probable']
        }
      ]
    },
    'portfolio': {
      id: 'portfolio',
      title: 'Portfolio Showcase',
      category: 'Diseño y Creatividad',
      popularity: '8532',
      description: 'Evalúa la percepción de tu portafolio personal. Ideal para creativos.',
      idealFor: ['diseñadores', 'desarrolladores', 'freelancers'],
      fullDescription: 'Analiza la navegación, la calidad visual y la claridad de tus proyectos presentados.',
      questions: [
        {
          text: '¿Qué tan fácil fue navegar por el portafolio?',
          type: 'rating'
        },
        {
          text: '¿Cuál de los proyectos presentados te pareció más impresionante?',
          type: 'choice',
          options: ['Proyecto A', 'Proyecto B', 'Proyecto C', 'Todos por igual']
        },
        {
          text: '¿Qué opinas del estilo visual general?',
          type: 'text',
          placeholder: 'Danos tu feedback artístico...'
        },
        {
          text: '¿La tipografía es legible en todos los dispositivos?',
          type: 'choice',
          options: ['Muy legible', 'Legible', 'Difícil de leer en móviles', 'Nada legible']
        }
      ]
    },
    'business': {
      id: 'business',
      title: 'Business Growth Survey',
      category: 'Corporativo',
      popularity: '12400',
      description: 'Mide la salud de tu negocio con esta plantilla integral. Analiza el mercado y la satisfacción interna.',
      idealFor: ['startups', 'pymes', 'corporaciones'],
      fullDescription: 'Perfecta para planes trimestrales. Recopila datos sobre la cultura organizacional, eficiencia de procesos y visión de mercado.',
      questions: [
        {
          text: '¿Cómo calificaría el clima laboral actualmente?',
          type: 'rating'
        },
        {
          text: '¿Qué herramienta tecnológica consideras indispensable?',
          type: 'choice',
          options: ['Slack/Discord', 'Jira/Asana', 'Zoom/Meet', 'GitHub/GitLab']
        },
        {
          text: '¿Siente que las metas del trimestre son claras?',
          type: 'choice',
          options: ['Totalmente claro', 'Algo claro', 'Poco claro', 'Nada claro']
        },
        {
          text: '¿Qué área del negocio crees que tiene más potencial de crecimiento?',
          type: 'text',
          placeholder: 'Ej: Ventas, I+D, Marketing...'
        },
        {
          text: '¿Cómo calificaría el liderazgo del equipo directivo?',
          type: 'choice',
          options: ['Inspirador', 'Efectivo', 'Neutral', 'Ineficaz']
        }
      ]
    }
  };

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      this.templateId = params.get('id');
      if (this.templateId) {
        this.template = this.templates[this.templateId];
      }
    });
  }

  async useTemplate(event: Event) {
    event.preventDefault();
    if (!this.template) return;

    // If not logged in, open auth modal
    if (!this.auth.isLoggedIn()) {
      this.authModalService.open('register');
      return;
    }

    const userId = this.auth.user()?.id;
    if (!userId) return;

    this.isCreating.set(true);

    try {
      // 1. Create a blank survey with the template's title + description
      const survey = await this.surveyService.createSurvey(
        userId,
        this.template.title,
        this.template.description
      );

      if (!survey) {
        this.isCreating.set(false);
        return;
      }

      // 2. Map template questions to the SurveyService Question format
      const questions = this.template.questions.map((q, index) => ({
        id: `q-tmpl-${Date.now()}-${index}`,
        type: this.toQuestionType(q.type),
        text: q.text,
        required: false,
        options: (q.options ?? []).map((opt, i) => ({ id: `opt-${index}-${i}`, texto: opt })),
        min: q.type === 'rating' ? 1 : undefined,
        max: q.type === 'rating' ? 5 : undefined,
      }));

      // 3. Save the survey with populated questions
      const populated = await this.surveyService.saveSurvey({
        ...survey,
        questions,
      });

      if (populated) {
        this.router.navigate(['/editor', populated.id]);
      }
    } catch (e) {
      console.error('Error creating survey from template:', e);
    } finally {
      this.isCreating.set(false);
    }
  }

  /** Maps template question types to the DB-compatible QuestionType */
  private toQuestionType(type: TemplateQuestion['type']): QuestionType {
    switch (type) {
      case 'rating':   return 'rating';
      case 'text':     return 'text';
      case 'dropdown': return 'multiple-choice'; // closest DB equivalent
      case 'choice':   return 'multiple-choice';
      default:         return 'text';
    }
  }

  openAuth(mode: 'login' | 'register', event: Event) {
    event.preventDefault();
    this.authModalService.open(mode);
  }
}
