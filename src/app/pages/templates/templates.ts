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
      image: '/assets/templates/box.png' // I'll use placeholders for now
    },
    {
      id: 'business',
      title: 'Las tendencias del consumo',
      category: 'Estudio de mercado',
      popularity: '21,305',
      image: '/assets/templates/laptop.png'
    },
    {
      id: 'satisfaccion-cliente',
      title: 'Evaluación de la calidad del servicio',
      category: 'Servicios',
      popularity: '19,831',
      image: '/assets/templates/tablet.png'
    },
    {
      id: 'portfolio',
      title: 'Valoración del producto',
      category: 'Estudio de mercado',
      popularity: '15,200',
      image: '/assets/templates/box-2.png'
    },
    {
      id: 'satisfaccion-cliente',
      title: 'La moda y sus consumidores',
      category: 'Estudio de mercado',
      popularity: '12,900',
      image: '/assets/templates/fashion.png'
    },
    {
      id: 'business',
      title: 'Experiencia de compra',
      category: 'Feedback del usuario',
      popularity: '42,100',
      image: '/assets/templates/shopping.png'
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
