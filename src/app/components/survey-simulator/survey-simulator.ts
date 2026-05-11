import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges, computed, signal } from '@angular/core';
import { AnswerValue, Question, Survey, SurveyBrand } from '../../services/survey.service';
import { SurveyNavigationButtonsComponent } from '../../pages/survey-response/components/survey-navigation-buttons';
import { SurveyQuestionCardComponent } from '../../pages/survey-response/components/survey-question-card';
import { SurveyThankYouScreenComponent } from '../../pages/survey-response/components/survey-thank-you-screen';
import { SurveyWelcomeScreenComponent } from '../../pages/survey-response/components/survey-welcome-screen';

@Component({
  selector: 'app-survey-simulator',
  standalone: true,
  imports: [
    CommonModule,
    SurveyWelcomeScreenComponent,
    SurveyQuestionCardComponent,
    SurveyNavigationButtonsComponent,
    SurveyThankYouScreenComponent
  ],
  template: `
    <main class="simulator-page" [ngStyle]="themeStyle()">
      <div class="simulator-toolbar" [class.design-toolbar-hidden]="designMode">
        <span>{{ designMode ? 'Diseño en vivo' : 'Modo simulacion' }}</span>
        @if (!designMode) {
          <button type="button" (click)="restart()">Reiniciar vista previa</button>
        }
      </div>

      @if (shouldShowThanks()) {
        <app-survey-thank-you-screen [survey]="survey" [brand]="brand()"></app-survey-thank-you-screen>
      } @else if (shouldShowWelcome()) {
        <app-survey-welcome-screen
          [survey]="survey"
          [brand]="brand()"
          [questionCount]="survey.questions.length"
          (start)="startSurvey()">
        </app-survey-welcome-screen>
      } @else if (shouldShowQuestions()) {
        <div class="simulator-progress" aria-hidden="true">
          <div class="simulator-progress-fill" [style.width]="progress() + '%'"></div>
        </div>

        <section class="simulator-question-page" [class.multi-question-page]="currentPageQuestions().length > 1">
          @for (question of currentPageQuestions(); track question.id) {
            <app-survey-question-card
              [question]="question"
              [index]="survey.questions.indexOf(question)"
              [total]="survey.questions.length"
              [answer]="getAnswer(question.id)"
              [error]="$first ? validationError() : ''"
              (answerChange)="updateAnswer(question.id, $event)">
            </app-survey-question-card>
          }
        </section>

        @if (!designMode) {
          <app-survey-navigation-buttons
            [isFirst]="isFirst()"
            [isLast]="isLast()"
            [busy]="false"
            (previous)="goPrev()"
            (next)="goNext()">
          </app-survey-navigation-buttons>
        }
      }
    </main>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
      height: 100%;
    }

    .simulator-page {
      position: relative;
      min-height: 100%;
      overflow: auto;
      color: var(--response-heading, #111827);
      font-family: var(--response-body-font, Inter, "Segoe UI", sans-serif);
      background:
        radial-gradient(circle at 12% 14%, color-mix(in srgb, var(--response-secondary, #06b6d4) 16%, transparent) 0%, transparent 32%),
        radial-gradient(circle at 88% 12%, color-mix(in srgb, var(--response-primary, #7c3aed) 16%, transparent) 0%, transparent 30%),
        linear-gradient(135deg, var(--response-bg, #f5f3ff), color-mix(in srgb, var(--response-bg, #f5f3ff) 78%, white));
    }

    .simulator-toolbar {
      position: sticky;
      top: 0;
      z-index: 30;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      padding: 10px 14px;
      background: rgba(15, 23, 42, 0.86);
      color: #ffffff;
      backdrop-filter: blur(12px);
      font-size: 12px;
      font-weight: 800;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    .simulator-toolbar.design-toolbar-hidden {
      display: none;
    }

    .simulator-toolbar button {
      border: 1px solid rgba(255, 255, 255, 0.26);
      border-radius: 999px;
      padding: 8px 12px;
      background: rgba(255, 255, 255, 0.12);
      color: #ffffff;
      font: inherit;
      cursor: pointer;
      text-transform: none;
      letter-spacing: 0;
    }

    .simulator-progress {
      position: sticky;
      top: 42px;
      z-index: 20;
      height: 5px;
      background: rgba(255, 255, 255, 0.42);
    }

    .simulator-progress-fill {
      height: 100%;
      width: 0;
      background: linear-gradient(90deg, var(--response-primary, #7c3aed), var(--response-secondary, #06b6d4));
      transition: width 220ms ease;
    }

    .simulator-question-page.multi-question-page {
      width: min(900px, 100%);
      margin: 0 auto;
      padding: clamp(22px, 5vw, 44px) clamp(18px, 4vw, 30px) 24px;
      display: grid;
      gap: 18px;
    }
  `]
})
export class SurveySimulatorComponent implements OnChanges {
  @Input({ required: true }) survey!: Survey;
  @Input() designMode = false;
  @Input() designSection: 'welcome' | 'questions' | 'end' = 'welcome';
  @Input() designQuestionIndex = 0;

  private readonly inputVersion = signal(0);
  currentPageIndex = signal(0);
  answers = signal<Map<string, AnswerValue | string[]>>(new Map());
  started = signal(false);
  completed = signal(false);
  validationError = signal('');

  pages = computed(() => {
    this.inputVersion();
    const questions = this.survey?.questions ?? [];
    if (this.designMode) {
      const index = Math.max(0, Math.min(this.designQuestionIndex, questions.length - 1));
      return questions[index] ? [[questions[index]]] : [];
    }

    const mode = this.survey?.metadata?.paginationMode ?? 'one-by-one';
    if (mode === 'all-at-once') return questions.length ? [questions] : [];

    const perPage = mode === 'paged'
      ? Math.max(1, Math.min(50, Number(this.survey?.metadata?.questionsPerPage ?? 3)))
      : 1;

    const pages: Question[][] = [];
    for (let index = 0; index < questions.length; index += perPage) {
      pages.push(questions.slice(index, index + perPage));
    }
    return pages;
  });

  currentPageQuestions = computed(() => this.pages()[this.currentPageIndex()] ?? []);
  isFirst = computed(() => this.currentPageIndex() === 0);
  isLast = computed(() => this.currentPageIndex() === this.pages().length - 1);
  progress = computed(() => this.pages().length ? ((this.currentPageIndex() + 1) / this.pages().length) * 100 : 0);

  ngOnChanges(): void {
    this.inputVersion.update((value) => value + 1);
    if (this.designMode) {
      this.currentPageIndex.set(0);
      this.validationError.set('');
    }
  }

  startSurvey(): void {
    this.started.set(true);
    this.completed.set(false);
    this.currentPageIndex.set(0);
    this.validationError.set('');
  }

  shouldShowWelcome(): boolean {
    return this.designMode ? this.designSection === 'welcome' : !this.started();
  }

  shouldShowThanks(): boolean {
    return this.designMode ? this.designSection === 'end' : this.completed();
  }

  shouldShowQuestions(): boolean {
    return this.designMode
      ? this.designSection === 'questions'
      : this.started() && !this.completed();
  }

  restart(): void {
    this.started.set(false);
    this.completed.set(false);
    this.currentPageIndex.set(0);
    this.answers.set(new Map());
    this.validationError.set('');
  }

  updateAnswer(questionId: string, value: AnswerValue | string[]): void {
    const next = new Map(this.answers());
    next.set(questionId, value);
    this.answers.set(next);
    this.validationError.set('');
  }

  getAnswer(questionId: string): AnswerValue | string[] | undefined {
    return this.answers().get(questionId);
  }

  goNext(): void {
    const error = this.getValidationMessage();
    if (error) {
      this.validationError.set(error);
      return;
    }

    if (this.isLast()) {
      this.completed.set(true);
      return;
    }

    this.currentPageIndex.update((index) => index + 1);
  }

  goPrev(): void {
    if (!this.isFirst()) {
      this.currentPageIndex.update((index) => index - 1);
      this.validationError.set('');
    }
  }

  brand(): SurveyBrand {
    return this.survey.metadata?.brand ?? {};
  }

  themeStyle(): Record<string, string> {
    const brand = this.brand();
    const primary = brand.primaryColor || '#7c3aed';
    const secondary = brand.secondaryColor || '#06b6d4';
    const background = brand.backgroundColor || '#f5f3ff';
    const text = brand.textColor || '#111827';
    return {
      '--response-primary': primary,
      '--response-secondary': secondary,
      '--response-bg': background,
      '--response-surface': brand.surfaceColor || '#ffffff',
      '--response-answer-bg': '#ffffff',
      '--response-heading': text,
      '--response-text': text,
      '--response-muted': text.toLowerCase() === '#ffffff' ? '#d1d5db' : '#64748b',
      '--response-border': 'rgba(15, 23, 42, 0.12)',
      '--response-button': brand.buttonColor || primary,
      '--response-button-text': brand.buttonTextColor || '#ffffff',
      '--response-button-radius': `${brand.buttonStyle === 'pill' ? 999 : brand.buttonRadius ?? 18}px`,
      '--response-card-radius': `${brand.cardRadius ?? 28}px`,
      '--response-title-font': `'${brand.fontTitle || 'Inter'}', Inter, sans-serif`,
      '--response-body-font': `'${brand.fontBody || 'Inter'}', Inter, sans-serif`
    };
  }

  private getValidationMessage(): string {
    for (const question of this.currentPageQuestions()) {
      const answer = this.answers().get(question.id);
      const hasAnswer = Array.isArray(answer)
        ? answer.length > 0
        : typeof answer === 'string'
          ? answer.trim().length > 0
          : answer !== undefined && answer !== null;

      if (question.required && !hasAnswer) {
        return `La pregunta "${question.text || 'sin titulo'}" es obligatoria.`;
      }

      if (!hasAnswer) continue;

      if (question.type === 'email' && typeof answer === 'string' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(answer.trim())) {
        return 'Ingresa un correo electronico valido.';
      }

      if (question.type === 'phone' && typeof answer === 'string' && !/^[+()\d\s.-]{7,}$/.test(answer.trim())) {
        return 'Ingresa un numero de telefono valido.';
      }
    }

    return '';
  }
}
