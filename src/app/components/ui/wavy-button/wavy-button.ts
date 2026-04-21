import { Component, Input, OnInit, OnChanges, SimpleChanges, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-wavy-button',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <a [routerLink]="routerLink || null" 
       class="wavy-btn"
       [class.wavy-btn-outline]="variant === 'outline'"
       [class.wavy-btn-lg]="size === 'lg'"
       [ngClass]="className"
       [style.background-color]="isHovered ? colors.toBg : colors.fromBg"
       (mouseenter)="isHovered = true"
       (mouseleave)="isHovered = false">
      
      <!-- SVG wave overlay (z-index 10, BELOW text) -->
      <svg class="wavy-svg"
           viewBox="0 0 260 64"
           fill="none"
           xmlns="http://www.w3.org/2000/svg"
           preserveAspectRatio="none">
        <defs>
          <clipPath id="clip-wave">
            <rect width="260" height="64" fill="white" />
          </clipPath>
        </defs>
        <g clip-path="url(#clip-wave)">
          <path
            d="M-11.7907 25.5948C-1.99079 7.39406 53.3086 -7.30655 91.8081 -10.8067C130.308 -14.3068 164.607 -12.2068 129.608 1.79383C94.6081 15.7944 37.9088 5.29517 -4.79076 43.0967C-47.4903 80.8983 1.50917 68.9978 11.3091 61.2975C21.1089 53.5972 55.4086 37.4965 79.2083 36.0965C103.008 34.6964 153.407 32.5939 174.407 1.79383C195.407 -29.0063 219.207 -29.0063 196.807 13.6955C174.407 56.3973 105.808 57.7985 84.8083 61.2975C63.8085 64.7965 44.9087 67.5966 32.3089 78.0971C19.709 88.5975 127.508 83.6962 157.607 72.4968C187.707 61.2975 218.507 24.8948 227.607 -1.00624C236.707 -26.9073 261.906 -7.3065 252.806 7.39411C243.706 22.0947 217.807 55.6961 207.307 66.8966C196.807 78.0971 219.207 96.9978 236.007 72.4968C252.806 47.9958 280.106 15.7945 285.706 7.39411"
            [attr.stroke]="colors.stroke"
            stroke-width="30"
            fill="none"
            class="wavy-path"
            [class.wavy-path-active]="isHovered"
          />
        </g>
      </svg>

      <!-- Text content (z-index 20, ABOVE wave) -->
      <span class="wavy-text" [class.wavy-text-hovered]="isHovered">
        <span *ngFor="let char of characters; let i = index" 
              class="wavy-char"
              [class.wavy-char-active]="isHovered"
              [style.animation-delay]="isHovered ? (i * 0.04) + 's' : '0s'">{{ char === ' ' ? '\u00A0' : char }}</span>
      </span>
    </a>
  `,
  styleUrl: './wavy-button.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class WavyButtonComponent implements OnInit, OnChanges {
  @Input() text: string = '';
  @Input() routerLink: string | null = null;
  @Input() className: string = '';
  @Input() variant: 'default' | 'outline' = 'default';
  @Input() size: 'default' | 'lg' = 'default';
  
  characters: string[] = [];
  isHovered = false;

  // Colors matching the original ScrollX UI source code exactly
  colors = { fromBg: '#7C3AED', toBg: '#A78BFA', stroke: '#A78BFA' };

  ngOnInit() {
    this.splitText();
    this.updateColors();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['text']) {
      this.splitText();
    }
    if (changes['variant']) {
      this.updateColors();
    }
  }

  private splitText() {
    this.characters = this.text.split('');
  }

  private updateColors() {
    if (this.variant === 'outline') {
      this.colors = {
        fromBg: 'transparent',
        toBg: 'transparent',
        stroke: 'currentColor',
      };
    } else {
      // Soft Purple Trial: Soft tint idle, deep purple full on hover
      this.colors = {
        fromBg: 'rgba(167, 139, 250, 0.15)', // Soft purple tint
        toBg: '#7C3AED',                     // Deep Purple target
        stroke: '#7C3AED',                   // Deep Purple wave
      };
    }
  }
}
