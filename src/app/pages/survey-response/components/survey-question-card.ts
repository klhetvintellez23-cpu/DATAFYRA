import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AnswerValue, Question } from '../../../services/survey.service';
import { SurveyOptionInputComponent } from './survey-option-input';
import { SurveyScaleInputComponent } from './survey-scale-input';

type PublicQuestionType =
  | 'text'
  | 'long-text'
  | 'multiple-choice'
  | 'multi-select'
  | 'scale'
  | 'rating'
  | 'nps'
  | 'date'
  | 'time'
  | 'email'
  | 'phone';

@Component({
  selector: 'app-survey-question-card',
  standalone: true,
  imports: [CommonModule, FormsModule, SurveyScaleInputComponent, SurveyOptionInputComponent],
  template: `
    <section class="question-shell">
      <article class="question-card">
        <div class="question-meta">
          <span class="question-pill">Pregunta {{ index + 1 }} de {{ total }}</span>
          @if (question.required) {
            <span class="required-pill">Requerida</span>
          }
        </div>

        <h2>{{ question.text || 'Pregunta sin titulo' }}</h2>
        <p class="question-help">{{ helperText }}</p>

        @if (question.imageUrl) {
          <img class="question-image" [src]="question.imageUrl" alt="Imagen de la pregunta" />
        }

        <div class="answer-area">
          @switch (questionType) {
            @case ('multiple-choice') {
              <app-survey-option-input
                [options]="safeOptions"
                [selected]="stringAnswer"
                (valueChange)="answerChange.emit($event)">
              </app-survey-option-input>
            }
            @case ('multi-select') {
              <app-survey-option-input
                [options]="safeOptions"
                [selected]="arrayAnswer"
                [multiple]="true"
                (valueChange)="answerChange.emit($event)">
              </app-survey-option-input>
            }
            @case ('rating') {
              <app-survey-scale-input
                [values]="range(1, 5)"
                [selected]="numberAnswer"
                variant="stars"
                minLabel="Baja"
                maxLabel="Excelente"
                (valueChange)="answerChange.emit($event)">
              </app-survey-scale-input>
            }
            @case ('scale') {
              <app-survey-scale-input
                [values]="range(question.min || 1, question.max || 10)"
                [selected]="numberAnswer"
                minLabel="Nada probable"
                maxLabel="Muy probable"
                (valueChange)="answerChange.emit($event)">
              </app-survey-scale-input>
            }
            @case ('nps') {
              <app-survey-scale-input
                [values]="range(0, 10)"
                [selected]="numberAnswer"
                minLabel="No recomendaria"
                maxLabel="Lo recomendaria"
                (valueChange)="answerChange.emit($event)">
              </app-survey-scale-input>
            }
            @case ('long-text') {
              <textarea
                class="survey-field textarea"
                rows="6"
                [attr.minlength]="question.validation?.minLength || null"
                [attr.maxlength]="question.validation?.maxLength || null"
                [attr.aria-invalid]="error ? 'true' : 'false'"
                [ngModel]="stringAnswer"
                (ngModelChange)="answerChange.emit($event)"
                placeholder="Escribe tu respuesta con detalle...">
              </textarea>
            }
            @case ('date') {
              <input class="survey-field" type="date" [ngModel]="stringAnswer" (ngModelChange)="answerChange.emit($event)" />
            }
            @case ('time') {
              <input class="survey-field" type="time" [ngModel]="stringAnswer" (ngModelChange)="answerChange.emit($event)" />
            }
            @case ('email') {
              <input class="survey-field" type="email" [ngModel]="stringAnswer" (ngModelChange)="answerChange.emit($event)" placeholder="nombre@empresa.com" />
            }
            @case ('phone') {
              <input class="survey-field" type="tel" [ngModel]="stringAnswer" (ngModelChange)="answerChange.emit($event)" placeholder="+1 000 000 0000" />
            }
            @default {
              <input
                class="survey-field"
                type="text"
                [attr.minlength]="question.validation?.minLength || null"
                [attr.maxlength]="question.validation?.maxLength || null"
                [attr.aria-invalid]="error ? 'true' : 'false'"
                [ngModel]="stringAnswer"
                (ngModelChange)="answerChange.emit($event)"
                placeholder="Escribe tu respuesta..." />
            }
          }
        </div>

        @if (error) {
          <div class="question-error" role="alert">{{ error }}</div>
        }
      </article>
    </section>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
    }

    .question-shell {
      width: 100%;
      min-height: calc(100svh - 112px);
      display: grid;
      place-items: center;
      padding: clamp(22px, 5vw, 56px) clamp(18px, 4vw, 32px) 24px;
      position: relative;
      z-index: 1;
    }

    .question-card {
      width: min(820px, 100%);
      padding: clamp(28px, 5vw, 56px);
      border-radius: var(--response-card-radius, 28px);
      background: rgba(255, 255, 255, 0.92);
      border: 1px solid rgba(15, 23, 42, 0.08);
      box-shadow: 0 28px 90px rgba(15, 23, 42, 0.14);
      color: var(--response-heading, #111827);
      backdrop-filter: blur(18px);
      animation: card-in 260ms ease both;
    }

    .question-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin-bottom: 24px;
    }

    .question-pill,
    .required-pill {
      width: fit-content;
      padding: 8px 12px;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 850;
      letter-spacing: 0.06em;
      text-transform: uppercase;
    }

    .question-pill {
      color: var(--response-primary, #7c3aed);
      background: color-mix(in srgb, var(--response-primary, #7c3aed) 12%, white);
    }

    .required-pill {
      color: #be123c;
      background: #fff1f2;
    }

    h2 {
      margin: 0;
      font-family: var(--response-title-font, Inter, sans-serif);
      font-size: clamp(28px, 4.5vw, 46px);
      line-height: 1.14;
      letter-spacing: 0;
      color: var(--response-heading, #111827);
      overflow-wrap: anywhere;
    }

    .question-help {
      margin: 14px 0 0;
      color: var(--response-muted, #64748b);
      font-size: 16px;
      line-height: 1.6;
    }

    .question-image {
      display: block;
      max-width: 100%;
      max-height: 260px;
      object-fit: contain;
      margin: 24px 0 0;
      border-radius: 18px;
    }

    .answer-area {
      margin-top: 30px;
    }

    .survey-field {
      width: 100%;
      border: 1px solid var(--response-border, #e2e8f0);
      border-radius: var(--response-button-radius, 16px);
      padding: 18px 20px;
      background: var(--response-answer-bg, #ffffff);
      color: var(--response-heading, #111827);
      font: inherit;
      font-size: 17px;
      outline: none;
      box-shadow: 0 8px 22px rgba(15, 23, 42, 0.05);
      transition: border-color 160ms ease, box-shadow 160ms ease;
    }

    .survey-field:focus {
      border-color: var(--response-primary, #7c3aed);
      box-shadow: 0 0 0 4px color-mix(in srgb, var(--response-primary, #7c3aed) 14%, transparent);
    }

    .textarea {
      resize: vertical;
      min-height: 160px;
      line-height: 1.55;
    }

    .question-error {
      margin-top: 18px;
      padding: 12px 14px;
      border-radius: 14px;
      color: #991b1b;
      background: #fef2f2;
      border: 1px solid #fecaca;
      font-size: 14px;
      font-weight: 750;
    }

    @keyframes card-in {
      from {
        opacity: 0;
        transform: translateY(10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    @media (max-width: 640px) {
      .question-shell {
        min-height: auto;
        padding-top: 18px;
      }

      .question-card {
        padding: 24px;
      }
    }

    :host-context(.multi-question-page) .question-shell {
      min-height: auto;
      padding: 0;
      display: block;
    }

    :host-context(.multi-question-page) .question-card {
      width: 100%;
      padding: clamp(22px, 4vw, 34px);
    }

    :host-context(.multi-question-page) h2 {
      font-size: clamp(24px, 3.5vw, 34px);
    }
  `]
})
export class SurveyQuestionCardComponent {
  @Input({ required: true }) question!: Question;
  @Input() index = 0;
  @Input() total = 0;
  @Input() answer: AnswerValue | string[] | undefined;
  @Input() error = '';
  @Output() answerChange = new EventEmitter<AnswerValue | string[]>();

  get questionType(): PublicQuestionType {
    const raw = String(this.question?.type || 'text');
    if (raw === 'telefono') return 'phone';
    if (raw === 'seleccion-multiple') return 'multi-select';
    return raw as PublicQuestionType;
  }

  get safeOptions() {
    return this.question.options?.length
      ? this.question.options
      : [
        { id: 'option-1', texto: 'Opcion 1' },
        { id: 'option-2', texto: 'Opcion 2' }
      ];
  }

  get stringAnswer(): string {
    return typeof this.answer === 'string' || typeof this.answer === 'number' ? String(this.answer) : '';
  }

  get numberAnswer(): number | undefined {
    return typeof this.answer === 'number' ? this.answer : undefined;
  }

  get arrayAnswer(): string[] {
    return Array.isArray(this.answer) ? this.answer : [];
  }

  get helperText(): string {
    if (this.questionType === 'multiple-choice') return 'Selecciona una opcion para continuar.';
    if (this.questionType === 'multi-select') return 'Puedes seleccionar una o varias opciones.';
    if (this.questionType === 'rating') return 'Elige una calificacion de 1 a 5 estrellas.';
    if (this.questionType === 'scale') return 'Selecciona el numero que mejor represente tu respuesta.';
    if (this.questionType === 'nps') return 'Responde de 0 a 10 segun tu probabilidad de recomendar.';
    if (this.questionType === 'email') return 'Ingresa un correo valido.';
    if (this.questionType === 'phone') return 'Ingresa un numero de contacto.';
    if (this.questionType === 'date') return 'Selecciona una fecha.';
    if (this.questionType === 'time') return 'Selecciona una hora.';
    if (this.questionType === 'long-text') return 'Escribe una respuesta detallada.';
    return 'Escribe tu respuesta.';
  }

  range(min: number, max: number): number[] {
    const start = Number.isFinite(min) ? min : 1;
    const end = Number.isFinite(max) ? max : 10;
    return Array.from({ length: Math.max(0, end - start + 1) }, (_, index) => start + index);
  }
}
