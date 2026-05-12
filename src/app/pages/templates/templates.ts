import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { NavbarComponent } from '../../components/navbar/navbar';

interface TemplateCard {
  id: string;
  title: string;
  category: string;
  popularity: string;
  image: string;
}

@Component({
  selector: 'app-templates',
  standalone: true,
  imports: [CommonModule, NavbarComponent, RouterLink],
  templateUrl: './templates.html',
  styleUrl: './templates.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TemplatesPage {
  categories = [
    'Todas las plantillas',
    'Estudio de mercado',
    'Servicios',
    'Feedback del usuario',
    'Recursos humanos',
    'Eventos',
    'Educación',
    'Comunidad y sin fines de lucro',
    'Cuidado de salud'
  ];

  selectedCategory = signal('Todas las plantillas');

  templates: TemplateCard[] = [
    {
      id: 'satisfaccion-cliente',
      title: 'Evaluación del producto',
      category: 'Estudio de mercado',
      popularity: '38,273',
      image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=900'
    },
    {
      id: 'business',
      title: 'Las tendencias del consumo',
      category: 'Estudio de mercado',
      popularity: '21,305',
      image: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&q=80&w=900'
    },
    {
      id: 'satisfaccion-cliente',
      title: 'Evaluación de la calidad del servicio',
      category: 'Servicios',
      popularity: '19,831',
      image: 'https://images.unsplash.com/photo-1556745757-8d76bdb6984b?auto=format&fit=crop&q=80&w=900'
    },
    {
      id: 'portfolio',
      title: 'Valoración del producto',
      category: 'Estudio de mercado',
      popularity: '15,200',
      image: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&q=80&w=900'
    },
    {
      id: 'satisfaccion-cliente',
      title: 'La moda y sus consumidores',
      category: 'Estudio de mercado',
      popularity: '12,900',
      image: 'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&q=80&w=900'
    },
    {
      id: 'business',
      title: 'Experiencia de compra',
      category: 'Feedback del usuario',
      popularity: '42,100',
      image: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&q=80&w=900'
    },
    {
      id: 'clima-laboral',
      title: 'Clima laboral',
      category: 'Recursos humanos',
      popularity: '18,640',
      image: 'https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&q=80&w=900'
    },
    {
      id: 'evaluacion-evento',
      title: 'Evaluación de evento',
      category: 'Eventos',
      popularity: '11,284',
      image: 'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?auto=format&fit=crop&q=80&w=900'
    },
    {
      id: 'satisfaccion-estudiantes',
      title: 'Satisfacción de estudiantes',
      category: 'Educación',
      popularity: '16,902',
      image: 'https://images.unsplash.com/photo-1523580846011-d3a5bc25702b?auto=format&fit=crop&q=80&w=900'
    },
    {
      id: 'impacto-comunitario',
      title: 'Impacto comunitario',
      category: 'Comunidad y sin fines de lucro',
      popularity: '9,476',
      image: 'https://images.unsplash.com/photo-1559027615-cd4628902d4a?auto=format&fit=crop&q=80&w=900'
    },
    {
      id: 'experiencia-paciente',
      title: 'Experiencia del paciente',
      category: 'Cuidado de salud',
      popularity: '13,708',
      image: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&q=80&w=900'
    }
  ];

  filteredTemplates = signal(this.templates);

  selectCategory(cat: string) {
    this.selectedCategory.set(cat);
    if (cat === 'Todas las plantillas') {
      this.filteredTemplates.set(this.templates);
    } else {
      this.filteredTemplates.set(this.templates.filter(t => t.category === cat));
    }
  }
}
