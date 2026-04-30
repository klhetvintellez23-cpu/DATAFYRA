import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

interface CardData {
  name: string;
}

@Component({
  selector: 'app-flip-flow',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flip-flow-container" [class]="className">
      <div *ngFor="let row of rows; let i = index" 
           class="flow-row" 
           [class.reverse]="row.reverse"
           [style.--duration]="'45s'">
        
        <div class="flow-items">
          <ng-container *ngTemplateOutlet="cardList"></ng-container>
          <ng-container *ngTemplateOutlet="cardList"></ng-container>
        </div>
      </div>
      
      <div class="mask-overlay"></div>
    </div>

    <ng-template #cardList>
      <div *ngFor="let card of data; let j = index" 
           class="flip-card" [class]="cardClassName">
        <div class="card-inner">
          <!-- Frente -->
          <div class="card-face front" [style.background]="getGradient(j, false)">
            <span class="card-text">{{ card.name }}</span>
          </div>
          <!-- Dorso -->
          <div class="card-face back" [style.background]="getGradient(j, true)">
            <span class="card-text">{{ card.name }}</span>
          </div>
        </div>
      </div>
    </ng-template>
  `,
  styleUrl: './flipflow.css'
})
export class FlipFlowComponent {
  @Input() data: CardData[] = [];
  @Input() className: string = '';
  @Input() cardClassName: string = '';

  rows = [
    { reverse: false },
    { reverse: true }
  ];

  // Colores basados en la paleta Violet Prism de Datafyra
  colors = [
    'linear-gradient(135deg, #A78BFA, #7C3AED)', // Primary Brand
    'linear-gradient(135deg, #7C3AED, #5B21B6)', // Deep Purple
    'linear-gradient(135deg, #C4B5FD, #A78BFA)', // Light Purple
    'linear-gradient(135deg, #8B5CF6, #6D28D9)', // Vibrant Purple
    'linear-gradient(135deg, #DDD6FE, #C4B5FD)', // Soft Lavender
  ];

  backColors = [
    'linear-gradient(135deg, #F3F4F6, #E5E7EB)', // Neutral Light
    'linear-gradient(135deg, #E9D5FF, #D8B4FE)', // Very Light Purple
    'linear-gradient(135deg, #7C3AED, #A78BFA)', // Reverse primary
    'linear-gradient(135deg, #5B21B6, #7C3AED)', // Reverse deep
    'linear-gradient(135deg, #A78BFA, #DDD6FE)', // Reverse light
  ];

  getGradient(index: number, isBack: boolean): string {
    const palette = isBack ? this.backColors : this.colors;
    return palette[index % palette.length];
  }
}
