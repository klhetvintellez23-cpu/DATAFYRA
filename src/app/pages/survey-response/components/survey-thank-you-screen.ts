import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { Survey, SurveyBrand } from '../../../services/survey.service';

@Component({
  selector: 'app-survey-thank-you-screen',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="thanks-shell">
      <div class="thanks-card">
        <div class="thanks-rule"></div>
        @if (brand.logoUrl) {
          <img class="thanks-logo" [src]="brand.logoUrl" alt="Logo de la encuesta" />
        }
        <div class="thanks-icon">✓</div>
        <h1>{{ survey.metadata?.endTitle || survey.metadata?.thankYouTitle || 'Gracias por participar' }}</h1>
        <p>{{ survey.metadata?.endDescription || survey.metadata?.thankYouDescription || 'Tu respuesta ha sido registrada exitosamente.' }}</p>
        <div class="thanks-summary">
          <span>Respuesta recibida</span>
          <span>Envio seguro</span>
        </div>
        <div class="thanks-brand">Powered by Datafyra</div>
      </div>
    </section>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
    }

    .thanks-shell {
      min-height: 100svh;
      display: grid;
      place-items: center;
      padding: clamp(24px, 5vw, 72px);
      position: relative;
      z-index: 1;
    }

    .thanks-card {
      width: min(680px, 100%);
      padding: clamp(32px, 6vw, 64px);
      border-radius: var(--response-card-radius, 28px);
      background:
        linear-gradient(180deg, rgba(255,255,255,0.95), rgba(255,255,255,0.88)),
        var(--response-surface, #ffffff);
      border: 1px solid rgba(15, 23, 42, 0.08);
      box-shadow: 0 28px 90px rgba(15, 23, 42, 0.16);
      text-align: center;
      color: var(--response-heading, #111827);
      backdrop-filter: blur(18px);
      overflow: hidden;
    }

    .thanks-rule {
      width: min(420px, 100%);
      height: 8px;
      margin: 0 auto 34px;
      border-radius: 999px;
      background: linear-gradient(90deg, var(--response-primary, #7c3aed), var(--response-secondary, #06b6d4));
    }

    .thanks-logo {
      max-width: 150px;
      max-height: 64px;
      object-fit: contain;
      margin: 0 auto 26px;
      display: block;
    }

    .thanks-icon {
      width: 82px;
      height: 52px;
      display: grid;
      place-items: center;
      margin: 0 auto 24px;
      border-radius: 999px;
      color: var(--response-primary, #7c3aed);
      background: color-mix(in srgb, var(--response-primary, #7c3aed) 12%, white);
      font-weight: 950;
      font-size: 28px;
    }

    h1 {
      margin: 0;
      font-family: var(--response-title-font, Inter, sans-serif);
      font-size: clamp(32px, 5vw, 52px);
      line-height: 1.08;
    }

    p {
      margin: 18px auto 0;
      max-width: 440px;
      color: var(--response-muted, #64748b);
      line-height: 1.65;
      font-size: 17px;
    }

    .thanks-summary {
      display: flex;
      justify-content: center;
      flex-wrap: wrap;
      gap: 10px;
      margin-top: 28px;
    }

    .thanks-summary span {
      padding: 9px 13px;
      border-radius: 999px;
      background: rgba(15, 23, 42, 0.05);
      color: var(--response-muted, #64748b);
      font-size: 13px;
      font-weight: 800;
    }

    .thanks-brand {
      margin-top: 32px;
      padding-top: 20px;
      border-top: 1px solid var(--response-border, #e2e8f0);
      color: var(--response-primary, #7c3aed);
      font-size: 14px;
      font-weight: 850;
    }
  `]
})
export class SurveyThankYouScreenComponent {
  @Input({ required: true }) survey!: Survey;
  @Input({ required: true }) brand!: SurveyBrand;
}
