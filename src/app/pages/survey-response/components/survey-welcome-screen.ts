import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Survey, SurveyBrand } from '../../../services/survey.service';

@Component({
  selector: 'app-survey-welcome-screen',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="welcome-shell">
      <div class="welcome-card">
        <div class="welcome-content">
          @if (brand.logoUrl) {
            <img class="welcome-logo" [src]="brand.logoUrl" alt="Logo de la encuesta" />
          }

          <div class="welcome-kicker">Encuesta publica</div>
          <h1>{{ survey.title || 'Nueva encuesta' }}</h1>
          <p>{{ survey.description || 'Tu opinion nos ayuda a mejorar. Completar esta encuesta tomara solo unos minutos.' }}</p>

          <div class="welcome-meta">
            <span>{{ questionCount }} pregunta{{ questionCount === 1 ? '' : 's' }}</span>
            <span>Respuesta segura</span>
          </div>

          <button class="welcome-button" type="button" (click)="start.emit()">
            {{ survey.metadata?.ctaText || 'Comenzar encuesta' }}
          </button>
        </div>

        <aside class="welcome-preview" aria-hidden="true">
          <div class="preview-topline"></div>
          <div class="preview-title"></div>
          <div class="preview-line wide"></div>
          <div class="preview-line"></div>
          <div class="preview-options">
            <span></span>
            <span></span>
            <span></span>
          </div>
        </aside>
      </div>
    </section>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
    }

    .welcome-shell {
      min-height: 100svh;
      display: grid;
      place-items: center;
      padding: clamp(24px, 5vw, 72px);
      position: relative;
      z-index: 1;
    }

    .welcome-card {
      width: min(980px, 100%);
      padding: clamp(32px, 6vw, 72px);
      border-radius: var(--response-card-radius, 28px);
      background:
        linear-gradient(180deg, rgba(255, 255, 255, 0.92), rgba(255, 255, 255, 0.84)),
        var(--response-surface, #ffffff);
      border: 1px solid rgba(15, 23, 42, 0.08);
      box-shadow: 0 28px 90px rgba(15, 23, 42, 0.16);
      color: var(--response-text, #111827);
      display: grid;
      grid-template-columns: minmax(0, 1fr) 280px;
      gap: clamp(28px, 5vw, 56px);
      align-items: center;
      backdrop-filter: blur(18px);
      min-height: min(720px, calc(100svh - 48px));
    }

    .welcome-content {
      text-align: left;
    }

    .welcome-logo {
      max-width: 160px;
      max-height: 72px;
      object-fit: contain;
      margin: 0 0 28px;
      display: block;
    }

    .welcome-kicker {
      width: fit-content;
      margin: 0 0 16px;
      padding: 8px 14px;
      border-radius: 999px;
      background: color-mix(in srgb, var(--response-primary, #7c3aed) 12%, white);
      color: var(--response-primary, #7c3aed);
      font-size: 12px;
      font-weight: 850;
      letter-spacing: 0.12em;
      text-transform: uppercase;
    }

    h1 {
      margin: 0;
      font-family: var(--response-title-font, Inter, sans-serif);
      font-size: clamp(36px, 6vw, 68px);
      line-height: 1.02;
      letter-spacing: 0;
      color: var(--response-heading, #111827);
    }

    p {
      max-width: 620px;
      margin: 22px 0 0;
      color: var(--response-muted, #64748b);
      font-size: clamp(16px, 2vw, 20px);
      line-height: 1.65;
    }

    .welcome-meta {
      display: flex;
      justify-content: flex-start;
      flex-wrap: wrap;
      gap: 10px;
      margin-top: 28px;
      color: var(--response-muted, #64748b);
      font-size: 13px;
      font-weight: 700;
    }

    .welcome-meta span {
      padding: 8px 12px;
      border-radius: 999px;
      background: rgba(15, 23, 42, 0.05);
    }

    .welcome-button {
      margin-top: 36px;
      min-width: min(100%, 280px);
      border: 0;
      border-radius: var(--response-button-radius, 18px);
      padding: 18px 32px;
      color: var(--response-button-text, #ffffff);
      background: linear-gradient(135deg, var(--response-button, #7c3aed), var(--response-secondary, #06b6d4));
      box-shadow: 0 18px 42px color-mix(in srgb, var(--response-primary, #7c3aed) 30%, transparent);
      font: inherit;
      font-weight: 850;
      font-size: 17px;
      cursor: pointer;
      transition: transform 180ms ease, box-shadow 180ms ease, filter 180ms ease;
    }

    .welcome-preview {
      min-height: 360px;
      border-radius: 28px;
      padding: 28px;
      background:
        linear-gradient(180deg, rgba(255,255,255,0.28), rgba(255,255,255,0.12)),
        color-mix(in srgb, var(--response-primary, #7c3aed) 14%, transparent);
      border: 1px solid rgba(255,255,255,0.38);
      box-shadow: inset 0 1px 0 rgba(255,255,255,0.32), 0 24px 60px rgba(15,23,42,0.12);
    }

    .preview-topline,
    .preview-title,
    .preview-line,
    .preview-options span {
      display: block;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.72);
    }

    .preview-topline {
      width: 76px;
      height: 12px;
      margin-bottom: 42px;
      background: color-mix(in srgb, var(--response-primary, #7c3aed) 32%, white);
    }

    .preview-title {
      width: 88%;
      height: 22px;
      margin-bottom: 18px;
    }

    .preview-line {
      width: 64%;
      height: 12px;
      margin-bottom: 12px;
      opacity: 0.68;
    }

    .preview-line.wide {
      width: 100%;
    }

    .preview-options {
      display: grid;
      gap: 12px;
      margin-top: 46px;
    }

    .preview-options span {
      height: 46px;
      border-radius: 16px;
      background: rgba(255, 255, 255, 0.55);
    }

    .welcome-button:hover {
      transform: translateY(-2px);
      filter: brightness(1.04);
      box-shadow: 0 24px 54px color-mix(in srgb, var(--response-primary, #7c3aed) 36%, transparent);
    }

    .welcome-button:active {
      transform: translateY(0);
    }

    @media (max-width: 640px) {
      .welcome-shell {
        align-items: stretch;
        padding: 18px;
      }

      .welcome-card {
        display: flex;
        min-height: calc(100svh - 36px);
        flex-direction: column;
        justify-content: center;
        padding: 28px;
      }

      .welcome-content {
        text-align: center;
      }

      .welcome-kicker,
      .welcome-logo {
        margin-left: auto;
        margin-right: auto;
      }

      .welcome-meta {
        justify-content: center;
      }

      .welcome-preview {
        display: none;
      }

      .welcome-button {
        width: 100%;
      }
    }
  `]
})
export class SurveyWelcomeScreenComponent {
  @Input({ required: true }) survey!: Survey;
  @Input({ required: true }) brand!: SurveyBrand;
  @Input() questionCount = 0;
  @Output() start = new EventEmitter<void>();
}
