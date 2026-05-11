import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-survey-navigation-buttons',
  standalone: true,
  imports: [CommonModule],
  template: `
    <nav class="survey-nav" aria-label="Navegacion de encuesta">
      <button class="nav-button secondary" type="button" (click)="previous.emit()" [disabled]="isFirst">
        Anterior
      </button>
      <button class="nav-button primary" type="button" (click)="next.emit()" [disabled]="busy">
        {{ busy ? 'Enviando...' : (isLast ? 'Enviar encuesta' : 'Siguiente') }}
      </button>
    </nav>
  `,
  styles: [`
    .survey-nav {
      display: flex;
      justify-content: space-between;
      gap: 14px;
      width: min(820px, 100%);
      margin: 0 auto;
      padding: 0 clamp(18px, 4vw, 32px) clamp(22px, 5vw, 40px);
      position: relative;
      z-index: 2;
    }

    .nav-button {
      border: 0;
      border-radius: var(--response-button-radius, 16px);
      padding: 15px 24px;
      font: inherit;
      font-weight: 850;
      cursor: pointer;
      transition: transform 160ms ease, box-shadow 160ms ease, opacity 160ms ease;
    }

    .nav-button.primary {
      margin-left: auto;
      min-width: 170px;
      color: var(--response-button-text, #ffffff);
      background: linear-gradient(135deg, var(--response-button, #7c3aed), var(--response-secondary, #06b6d4));
      box-shadow: 0 14px 34px color-mix(in srgb, var(--response-primary, #7c3aed) 28%, transparent);
    }

    .nav-button.secondary {
      color: var(--response-heading, #111827);
      background: rgba(255, 255, 255, 0.72);
      border: 1px solid var(--response-border, #e2e8f0);
    }

    .nav-button:hover:not(:disabled) {
      transform: translateY(-2px);
    }

    .nav-button:disabled {
      opacity: 0.45;
      cursor: not-allowed;
      box-shadow: none;
    }

    @media (max-width: 560px) {
      .survey-nav {
        display: grid;
        grid-template-columns: 1fr;
      }

      .nav-button.primary,
      .nav-button.secondary {
        width: 100%;
      }

      .nav-button.primary {
        order: 1;
      }

      .nav-button.secondary {
        order: 2;
      }
    }
  `]
})
export class SurveyNavigationButtonsComponent {
  @Input() isFirst = false;
  @Input() isLast = false;
  @Input() busy = false;
  @Output() previous = new EventEmitter<void>();
  @Output() next = new EventEmitter<void>();
}
