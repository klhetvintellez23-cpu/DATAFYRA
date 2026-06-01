import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, computed, signal } from '@angular/core';
import { AnswerValue, Question, Survey, SurveyBrand, SurveyElementConfig } from '../../services/survey.service';
import { SurveyNavigationButtonsComponent } from '../../pages/survey-response/components/survey-navigation-buttons';
import { SurveyQuestionCardComponent } from '../../pages/survey-response/components/survey-question-card';
import { SurveyThankYouScreenComponent } from '../../pages/survey-response/components/survey-thank-you-screen';
import { SurveyWelcomeScreenComponent } from '../../pages/survey-response/components/survey-welcome-screen';

type SimulatorTransformKind =
  | 'logo'
  | 'welcome-title'
  | 'welcome-desc'
  | 'welcome-cta'
  | 'welcome-kicker'
  | 'welcome-meta'
  | 'welcome-preview'
  | 'question-meta'
  | 'question-title'
  | 'question-help'
  | 'question-image'
  | 'question-answer'
  | 'end-rule'
  | 'end-icon'
  | 'end-title'
  | 'end-desc'
  | 'end-summary'
  | 'end-brand'
  | string;
type TransformMode = 'move' | 'resize' | 'stretch';

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
    <main
      class="simulator-page"
      [class.design-mode]="designMode"
      [class.question-style-classic]="questionStyle() === 'classic'"
      [class.question-style-compact]="questionStyle() === 'compact'"
      [class.question-style-soft]="questionStyle() === 'soft'"
      [class.question-style-outlined]="questionStyle() === 'outlined'"
      [class.question-style-minimal]="questionStyle() === 'minimal'"
      [class.question-style-boxed]="questionStyle() === 'boxed'"
      [class.question-style-glass]="questionStyle() === 'glass'"
      [class.question-style-solid]="questionStyle() === 'solid'"
      [class.question-style-underline]="questionStyle() === 'underline'"
      [ngStyle]="themeStyle()">
      @if (showUtilityToolbar) {
        <div class="simulator-toolbar" [class.design-toolbar-hidden]="designMode">
          <span>{{ designMode ? 'Diseño en vivo' : 'Modo simulación' }}</span>
          @if (!designMode) {
            <button type="button" (click)="restart()">Reiniciar vista previa</button>
          }
        </div>
      }

      @if (shouldShowThanks()) {
        <app-survey-thank-you-screen
          [survey]="survey"
          [brand]="brand()"
          [designMode]="designMode"
          (transformStart)="transformStart.emit($event)"
          (titleChange)="endTitleChange.emit($event)"
          (descriptionChange)="endDescriptionChange.emit($event)">
        </app-survey-thank-you-screen>
      } @else if (shouldShowWelcome()) {
        <app-survey-welcome-screen
          [survey]="survey"
          [brand]="brand()"
          [questionCount]="survey.questions.length"
          [designMode]="designMode"
          (transformStart)="transformStart.emit($event)"
          (titleChange)="welcomeTitleChange.emit($event)"
          (descriptionChange)="welcomeDescriptionChange.emit($event)"
          (ctaTextChange)="ctaTextChange.emit($event)"
          (extraTextChange)="extraTextChange.emit($event)"
          (deleteRequest)="deleteRequest.emit($event)"
          (start)="startSurvey()">
        </app-survey-welcome-screen>
      } @else if (shouldShowQuestions()) {
        <div class="simulator-progress" aria-hidden="true">
          <div class="simulator-progress-fill" [style.width]="progress() + '%'"></div>
        </div>

        <section class="simulator-question-page" [class.multi-question-page]="currentPageQuestions().length > 1">
          @if (designMode && currentPageQuestions().length === 0) {
            <div class="empty-question-page">
              <span class="material-symbols-outlined">post_add</span>
              <strong>Página vacía</strong>
              <p>Agrega una pregunta para empezar a construir esta página.</p>
              <button type="button" (click)="addQuestionAfter.emit(designPageInsertAfterIndex())">
                <span class="material-symbols-outlined">add</span>
                Agregar pregunta
              </button>
            </div>
          }
          @for (question of currentPageQuestions(); track question.id) {
            <div
              class="design-question-card-shell"
              [class.design-clickable-question]="designMode"
              (click)="openStaticQuestion(question)">
              
              @if (designMode) {
                <div class="design-question-actions-pill" (click)="$event.stopPropagation()">
                  <button type="button" (click)="editQuestion.emit(survey.questions.indexOf(question))" title="Editar"><span class="material-symbols-outlined">edit</span></button>
                  <button type="button" (click)="editQuestionLogic.emit(survey.questions.indexOf(question))" title="Lógica"><span class="material-symbols-outlined">account_tree</span></button>
                  <button type="button" class="danger" (click)="deleteQuestion.emit(survey.questions.indexOf(question))" title="Eliminar"><span class="material-symbols-outlined">delete</span></button>
                </div>
              }

              <app-survey-question-card
                [question]="question"
                [index]="survey.questions.indexOf(question)"
                [total]="survey.questions.length"
                [answer]="getAnswer(question.id)"
                [error]="$first ? validationError() : ''"
                [designMode]="false"
                [staticLayout]="designMode && designSection === 'questions'"
                (answerChange)="updateAnswer(question.id, $event)">
              </app-survey-question-card>
            </div>
          }
          @if (designMode && currentPageQuestions().length > 0) {
            <div class="design-page-add-question">
               <button class="design-page-add-btn" type="button" (click)="addQuestionAfter.emit(survey.questions.length - 1)">
                 <span class="material-symbols-outlined">add</span>
                 Nueva pregunta
               </button>
            </div>
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

    .simulator-question-page {
      width: min(900px, 100%);
      margin: 0 auto;
      padding: clamp(22px, 5vw, 44px) clamp(18px, 4vw, 30px) 24px;
      display: grid;
      gap: 18px;
    }

    .simulator-question-page.multi-question-page {
      padding-bottom: 24px;
    }

    .simulator-page.design-mode {
      min-height: auto;
      overflow: visible;
      background:
        radial-gradient(circle at 12% 14%, color-mix(in srgb, var(--response-secondary, #06b6d4) 16%, transparent) 0%, transparent 32%),
        radial-gradient(circle at 88% 12%, color-mix(in srgb, var(--response-primary, #7c3aed) 16%, transparent) 0%, transparent 30%),
        linear-gradient(135deg, var(--response-bg, #f5f3ff), color-mix(in srgb, var(--response-bg, #f5f3ff) 78%, white));
    }

    .simulator-page.design-mode .simulator-progress {
      display: none;
    }

    .simulator-page.design-mode .simulator-question-page {
      width: min(900px, 100%);
      padding: 32px 28px;
      gap: 28px;
    }

    .empty-question-page {
      min-height: 360px;
      border: 1px dashed rgba(79, 70, 229, 0.28);
      border-radius: 24px;
      display: grid;
      place-items: center;
      align-content: center;
      gap: 10px;
      padding: 32px;
      background: rgba(255, 255, 255, 0.72);
      color: #475569;
      text-align: center;
    }

    .empty-question-page > .material-symbols-outlined {
      color: var(--response-primary, #4f46e5);
      font-size: 34px;
    }

    .empty-question-page strong {
      color: #111827;
      font-size: 18px;
      font-weight: 900;
    }

    .empty-question-page p {
      max-width: 320px;
      margin: 0;
      font-size: 13px;
      line-height: 1.5;
    }

    .empty-question-page button {
      min-height: 38px;
      border: 0;
      border-radius: 999px;
      display: inline-flex;
      align-items: center;
      gap: 7px;
      padding: 0 14px;
      background: var(--response-primary, #4f46e5);
      color: #ffffff;
      font: inherit;
      font-size: 13px;
      font-weight: 850;
      cursor: pointer;
    }

    .design-question-card-shell {
      position: relative;
      border-radius: var(--response-card-radius, 28px);
      transition: transform 180ms ease, box-shadow 180ms ease;
    }

    .design-clickable-question {
      cursor: pointer;
    }

    .design-clickable-question app-survey-question-card {
      pointer-events: none;
    }

    .design-clickable-question:hover {
      transform: translateY(-2px);
    }

    :host ::ng-deep .design-clickable-question:hover app-survey-question-card .question-card {
      border-color: color-mix(in srgb, var(--response-primary, #4f46e5) 28%, rgba(15, 23, 42, 0.08));
      box-shadow: 0 28px 76px rgba(15, 23, 42, 0.14);
    }

    :host ::ng-deep .simulator-page.design-mode app-survey-question-card .question-shell {
      min-height: auto;
      padding: 0;
      place-items: stretch;
    }

    :host ::ng-deep .simulator-page.design-mode app-survey-question-card .question-card {
      width: 100%;
      padding: 30px 34px;
      animation: none;
    }

    :host ::ng-deep .simulator-page.design-mode app-survey-question-card .question-card:not(.positioned-layout) {
      display: grid;
      gap: 8px;
    }

    :host ::ng-deep .simulator-page.design-mode app-survey-question-card .question-meta {
      margin-bottom: 8px;
      gap: 8px;
    }

    :host ::ng-deep .simulator-page.design-mode app-survey-question-card h2 {
      margin-top: 4px;
      font-size: clamp(24px, 3vw, 32px);
      line-height: 1.18;
    }

    :host ::ng-deep .simulator-page.design-mode app-survey-question-card .question-help {
      margin-top: 6px;
      font-size: 14px;
      line-height: 1.45;
    }

    :host ::ng-deep .simulator-page.design-mode app-survey-question-card .answer-area {
      margin-top: 14px;
    }

    :host ::ng-deep .simulator-page.design-mode app-survey-question-card .question-pill,
    :host ::ng-deep .simulator-page.design-mode app-survey-question-card .required-pill {
      border-radius: 999px;
    }

    .design-question-actions-pill {
      position: absolute;
      top: 16px;
      right: 16px;
      display: flex;
      align-items: center;
      background: #f1edf7;
      border-radius: 999px;
      padding: 4px;
      z-index: 10;
      gap: 2px;
    }

    .design-question-actions-pill button {
      background: none;
      border: none;
      border-radius: 50%;
      width: 32px;
      height: 32px;
      display: grid;
      place-items: center;
      cursor: pointer;
      color: #625b71;
    }

    .design-question-actions-pill button:hover {
      background: rgba(0,0,0,0.05);
    }

    .design-question-actions-pill button.danger {
      color: #ef4444;
    }

    .design-question-actions-pill button .material-symbols-outlined {
      font-size: 18px;
    }

    .design-page-add-question {
      display: flex;
      justify-content: center;
      margin-top: 10px;
    }

    .design-page-add-btn {
      background: #7f00ff;
      color: white;
      border: none;
      border-radius: 999px;
      padding: 10px 24px;
      font-size: 14px;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(127,0,255,0.25);
      transition: all 0.2s ease;
    }

    .design-page-add-btn:hover {
      background: #6a00d6;
      transform: translateY(-1px);
      box-shadow: 0 6px 16px rgba(127,0,255,0.35);
    }

    :host ::ng-deep .simulator-page.question-style-compact app-survey-question-card .question-card {
      padding: 22px 26px;
      border-radius: 16px;
      box-shadow: 0 14px 38px rgba(15, 23, 42, 0.08);
    }

    :host ::ng-deep .simulator-page.question-style-compact app-survey-question-card .question-meta {
      display: none;
    }

    :host ::ng-deep .simulator-page.question-style-compact app-survey-question-card h2 {
      font-size: clamp(22px, 2.6vw, 28px);
      margin-top: 0;
    }

    :host ::ng-deep .simulator-page.question-style-compact app-survey-question-card .question-help,
    :host ::ng-deep .simulator-page.question-style-compact app-survey-question-card .answer-area {
      margin-top: 8px;
    }

    :host ::ng-deep .simulator-page.question-style-soft app-survey-question-card .question-card {
      background:
        linear-gradient(180deg, color-mix(in srgb, var(--response-primary, #4f46e5) 6%, #ffffff), #ffffff 62%);
      border-color: color-mix(in srgb, var(--response-primary, #4f46e5) 14%, #ffffff);
      box-shadow: 0 20px 54px rgba(79, 70, 229, 0.1);
      overflow: hidden;
      text-align: center;
    }

    :host ::ng-deep .simulator-page.question-style-soft app-survey-question-card .question-card::before {
      content: "";
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 5px;
      background: linear-gradient(90deg, var(--response-primary, #4f46e5), var(--response-secondary, #06b6d4));
    }

    :host ::ng-deep .simulator-page.question-style-soft app-survey-question-card .question-meta {
      display: none;
    }

    :host ::ng-deep .simulator-page.question-style-soft app-survey-question-card .answer-area {
      width: min(620px, 100%);
      margin-left: auto;
      margin-right: auto;
    }

    :host ::ng-deep .simulator-page.question-style-outlined app-survey-question-card .question-card {
      background: #ffffff;
      border: 1.5px solid color-mix(in srgb, var(--response-primary, #4f46e5) 22%, #d1d5db);
      box-shadow: none;
    }

    :host ::ng-deep .simulator-page.question-style-outlined app-survey-question-card .question-card:not(.positioned-layout) {
      display: grid;
      grid-template-columns: minmax(0, 0.88fr) minmax(280px, 1.12fr);
      column-gap: 28px;
      align-items: start;
    }

    :host ::ng-deep .simulator-page.question-style-outlined app-survey-question-card .question-meta {
      display: none;
    }

    :host ::ng-deep .simulator-page.question-style-outlined app-survey-question-card [data-design-kind="question-title"],
    :host ::ng-deep .simulator-page.question-style-outlined app-survey-question-card [data-design-kind="question-help"],
    :host ::ng-deep .simulator-page.question-style-outlined app-survey-question-card [data-design-kind="question-image"] {
      grid-column: 1;
    }

    :host ::ng-deep .simulator-page.question-style-outlined app-survey-question-card [data-design-kind="question-answer"] {
      grid-column: 2;
      grid-row: 1 / span 3;
    }

    :host ::ng-deep .simulator-page.question-style-outlined app-survey-question-card .survey-field {
      box-shadow: none;
      background: #fbfaff;
    }

    :host ::ng-deep .simulator-page.question-style-minimal {
      background: var(--response-bg, #f8fafc);
    }

    :host ::ng-deep .simulator-page.question-style-minimal app-survey-question-card .question-card {
      padding: 18px 0 28px;
      background: transparent;
      border: 0;
      border-bottom: 1px solid rgba(15, 23, 42, 0.12);
      border-radius: 0;
      box-shadow: none;
      backdrop-filter: none;
    }

    :host ::ng-deep .simulator-page.question-style-minimal app-survey-question-card .question-meta {
      display: none;
    }

    :host ::ng-deep .simulator-page.question-style-minimal app-survey-question-card h2 {
      margin-top: 0;
      font-size: clamp(24px, 3vw, 34px);
    }

    :host ::ng-deep .simulator-page.question-style-minimal app-survey-question-card .survey-field,
    :host ::ng-deep .simulator-page.question-style-minimal app-survey-question-card .option-button {
      box-shadow: none;
      background: #ffffff;
    }

    :host ::ng-deep .simulator-page.question-style-boxed app-survey-question-card .question-card {
      background: #ffffff;
      border: 1px solid color-mix(in srgb, var(--response-primary, #4f46e5) 18%, #e5e7eb);
      box-shadow: 0 18px 48px rgba(15, 23, 42, 0.1);
    }

    :host ::ng-deep .simulator-page.question-style-boxed app-survey-question-card .question-meta {
      display: none;
    }

    :host ::ng-deep .simulator-page.question-style-boxed app-survey-question-card .option-list {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    :host ::ng-deep .simulator-page.question-style-boxed app-survey-question-card .option-button {
      min-height: 86px;
      align-items: start;
      border-radius: 14px;
      background: color-mix(in srgb, var(--response-primary, #4f46e5) 6%, #ffffff);
    }

    :host ::ng-deep .simulator-page.question-style-glass app-survey-question-card .question-card {
      background: color-mix(in srgb, var(--response-surface, #ffffff) 68%, transparent);
      border: 1px solid rgba(255, 255, 255, 0.42);
      box-shadow: 0 32px 90px rgba(15, 23, 42, 0.22);
      backdrop-filter: blur(22px);
    }

    :host ::ng-deep .simulator-page.question-style-glass app-survey-question-card .survey-field,
    :host ::ng-deep .simulator-page.question-style-glass app-survey-question-card .option-button {
      background: rgba(255, 255, 255, 0.72);
    }

    :host ::ng-deep .simulator-page.question-style-solid app-survey-question-card .question-card {
      background: var(--response-surface, #111827);
      border: 0;
      box-shadow: 0 24px 70px rgba(15, 23, 42, 0.28);
    }

    :host ::ng-deep .simulator-page.question-style-solid app-survey-question-card .question-pill,
    :host ::ng-deep .simulator-page.question-style-solid app-survey-question-card .required-pill {
      background: color-mix(in srgb, var(--response-primary, #4f46e5) 18%, transparent);
    }

    :host ::ng-deep .simulator-page.question-style-underline app-survey-question-card .question-card {
      padding-inline: 0;
      background: transparent;
      border: 0;
      border-radius: 0;
      border-bottom: 2px solid color-mix(in srgb, var(--response-primary, #111827) 48%, transparent);
      box-shadow: none;
      backdrop-filter: none;
    }

    :host ::ng-deep .simulator-page.question-style-underline app-survey-question-card .question-meta {
      display: none;
    }

    :host ::ng-deep .simulator-page.question-style-underline app-survey-question-card .survey-field,
    :host ::ng-deep .simulator-page.question-style-underline app-survey-question-card .option-button {
      border-radius: 0;
      border-width: 0 0 1px;
      box-shadow: none;
    }

    @media (max-width: 760px) {
      :host ::ng-deep .simulator-page.question-style-outlined app-survey-question-card .question-card:not(.positioned-layout) {
        grid-template-columns: 1fr;
      }

      :host ::ng-deep .simulator-page.question-style-outlined app-survey-question-card [data-design-kind="question-answer"] {
        grid-column: 1;
        grid-row: auto;
      }

      :host ::ng-deep .simulator-page.question-style-boxed app-survey-question-card .option-list {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class SurveySimulatorComponent implements OnChanges {
  @Input({ required: true }) survey!: Survey;
  @Input() designMode = false;
  @Input() showUtilityToolbar = true;
  @Input() designSection: 'welcome' | 'questions' | 'end' = 'welcome';
  @Input() designQuestionIndex = 0;
  @Input() designPageIndex = 0;
  @Output() welcomeTitleChange = new EventEmitter<string>();
  @Output() welcomeDescriptionChange = new EventEmitter<string>();
  @Output() ctaTextChange = new EventEmitter<string>();
  @Output() questionTextChange = new EventEmitter<{ index: number; text: string }>();
  @Output() endTitleChange = new EventEmitter<string>();
  @Output() endDescriptionChange = new EventEmitter<string>();
  @Output() addQuestionAfter = new EventEmitter<number>();
  @Output() extraTextChange = new EventEmitter<{id: string, text: string}>();
  @Output() deleteRequest = new EventEmitter<string>();
  @Output() editQuestion = new EventEmitter<number>();
  @Output() editQuestionLogic = new EventEmitter<number>();
  @Output() deleteQuestion = new EventEmitter<number>();
  @Output() transformStart = new EventEmitter<{ event: MouseEvent; kind: SimulatorTransformKind; mode: TransformMode; index?: number; frame?: SurveyElementConfig; frames?: Record<string, SurveyElementConfig> }>();

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
      if (!questions.length) return [[]];
      const breaks = this.normalizedPageBreaks(questions.length);
      const page = Math.max(0, Math.min(this.designPageIndex, breaks.length - 1));
      const start = breaks[page] ?? 0;
      const end = breaks[page + 1] ?? questions.length;
      return [questions.slice(start, end)];
    }

    const breaks = this.normalizedPageBreaks(questions.length);
    if (breaks.length <= 1) return questions.length ? [questions] : [];
    return breaks.map((start, index) => questions.slice(start, breaks[index + 1] ?? questions.length));
  });

  currentPageQuestions = computed(() => {
    const questions = this.pages()[this.currentPageIndex()] ?? [];
    return this.designMode ? questions : this.applyConditionalVisibility(questions);
  });
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
      const target = this.firstMatchedLogicTarget();
      if (target === 'end') {
        this.completed.set(true);
        return;
      }

      if (target) {
        const targetIndex = this.survey.questions.findIndex((question) => question.id === target);
        if (targetIndex >= 0) {
          this.completed.set(true);
          return;
        }
      }

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

  questionStyle(): NonNullable<SurveyBrand['questionStyle']> {
    return this.brand().questionStyle ?? 'classic';
  }

  openStaticQuestion(question: Question): void {
    if (!this.designMode) return;
    this.editQuestion.emit(this.survey.questions.indexOf(question));
  }

  themeStyle(): Record<string, string> {
    const brand = this.brand();
    const primary = brand.primaryColor || '#7c3aed';
    const secondary = brand.secondaryColor || '#06b6d4';
    const background = brand.backgroundColor || '#f5f3ff';
    const text = brand.textColor || '#111827';
    const style: Record<string, string> = {
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
    if (brand.backgroundImageUrl) {
      const opacity = 1 - (brand.backgroundOpacity !== undefined ? brand.backgroundOpacity : 0.28);
      style['background-image'] = `linear-gradient(rgba(255, 255, 255, ${opacity}), rgba(255, 255, 255, ${opacity})), url("${brand.backgroundImageUrl}")`;
      style['background-size'] = 'cover';
      style['background-position'] = 'center';
    }
    return style;
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
        return `La pregunta "${question.text || 'sin título'}" es obligatoria.`;
      }

      if (!hasAnswer) continue;

      if (question.type === 'email' && typeof answer === 'string' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(answer.trim())) {
        return 'Ingresa un correo electrónico válido.';
      }

      if (question.type === 'phone' && typeof answer === 'string' && !/^[+()\d\s.-]{7,}$/.test(answer.trim())) {
        return 'Ingresa un número de teléfono válido.';
      }
    }

    return '';
  }

  private firstMatchedLogicTarget(): string {
    for (const question of this.currentPageQuestions()) {
      const target = this.matchedLogicTarget(question);
      if (target) return target;
    }

    return '';
  }

  private applyConditionalVisibility(questions: Question[]): Question[] {
    const visible: Question[] = [];

    for (let index = 0; index < questions.length; index += 1) {
      const question = questions[index];
      visible.push(question);

      const target = this.matchedLogicTarget(question);
      if (!target) continue;
      if (target === 'end') break;

      const targetIndex = questions.findIndex((item) => item.id === target);
      if (targetIndex > index) {
        index = targetIndex - 1;
      }
    }

    return visible;
  }

  private matchedLogicTarget(question: Question): string {
    const answer = this.answers().get(question.id);
    for (const rule of question.logic ?? []) {
      if (!rule.goTo) continue;
      if (rule.answerEquals && answer === rule.answerEquals) return rule.goTo;
      if (rule.answerIncludes && Array.isArray(answer) && answer.includes(rule.answerIncludes)) return rule.goTo;
    }
    return '';
  }

    private normalizedPageBreaks(total: number): number[] {
    const raw = this.survey.metadata?.questionPageBreaks ?? [0];
    const values = raw.length ? [...raw] : [0];
    if (values[0] !== 0) values.unshift(0);
    const breaks = values
      .map((value) => Math.max(0, Math.min(total, Math.round(Number(value) || 0))))
      .filter((value) => value >= 0 && value <= total)
      .sort((a, b) => a - b);
    return breaks.length ? breaks : [0];
  }

  designPageInsertAfterIndex(): number {
    const total = this.survey?.questions.length ?? 0;
    const breaks = this.normalizedPageBreaks(total);
    const page = Math.max(0, Math.min(this.designPageIndex, breaks.length - 1));
    return (breaks[page] ?? total) - 1;
  }
}


