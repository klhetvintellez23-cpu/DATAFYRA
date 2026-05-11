import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AnswerValue, Question, Survey, SurveyBrand, SurveyService } from '../../services/survey.service';
import { SurveyNavigationButtonsComponent } from './components/survey-navigation-buttons';
import { SurveyQuestionCardComponent } from './components/survey-question-card';
import { SurveyThankYouScreenComponent } from './components/survey-thank-you-screen';
import { SurveyWelcomeScreenComponent } from './components/survey-welcome-screen';

interface PublicThemePreset {
  name: string;
  primary: string;
  secondary: string;
  background: string;
  surface: string;
  text: string;
}

@Component({
  selector: 'app-survey-response',
  standalone: true,
  imports: [
    CommonModule,
    SurveyWelcomeScreenComponent,
    SurveyQuestionCardComponent,
    SurveyNavigationButtonsComponent,
    SurveyThankYouScreenComponent
  ],
  templateUrl: './survey-response.html',
  styleUrl: './survey-response.css'
})
export class SurveyResponsePage implements OnInit {
  survey = signal<Survey | null>(null);
  currentPageIndex = signal(0);
  answers = signal<Map<string, AnswerValue | string[]>>(new Map());
  started = signal(false);
  completed = signal(false);
  startTime = 0;
  notFound = signal(false);
  isSubmitting = signal(false);
  validationError = signal('');
  submitError = signal('');
  private readonly partialStoragePrefix = 'datafyra-partial-response';

  readonly publicThemePresets: PublicThemePreset[] = [
    { name: 'Lila moderno', primary: '#7c3aed', secondary: '#06b6d4', background: '#f5f3ff', surface: '#ffffff', text: '#111827' },
    { name: 'Azul corporativo', primary: '#2563eb', secondary: '#0ea5e9', background: '#eff6ff', surface: '#ffffff', text: '#0f172a' },
    { name: 'Verde salud', primary: '#059669', secondary: '#14b8a6', background: '#ecfdf5', surface: '#ffffff', text: '#064e3b' },
    { name: 'Cafe elegante', primary: '#8b5e34', secondary: '#c08457', background: '#f7f2ec', surface: '#ffffff', text: '#2f1f17' },
    { name: 'Negro premium', primary: '#111827', secondary: '#d4af37', background: '#0b0f19', surface: '#ffffff', text: '#0f172a' },
    { name: 'Rosado suave', primary: '#db2777', secondary: '#f9a8d4', background: '#fdf2f8', surface: '#ffffff', text: '#3b1026' },
    { name: 'Naranja energetico', primary: '#ea580c', secondary: '#f59e0b', background: '#fff7ed', surface: '#ffffff', text: '#431407' },
    { name: 'Minimal blanco', primary: '#18181b', secondary: '#71717a', background: '#ffffff', surface: '#ffffff', text: '#09090b' },
    { name: 'Gris profesional', primary: '#475569', secondary: '#0284c7', background: '#f1f5f9', surface: '#ffffff', text: '#0f172a' },
    { name: 'Morado tecnologico', primary: '#6d28d9', secondary: '#22d3ee', background: '#120f24', surface: '#ffffff', text: '#111827' }
  ];

  pages = computed(() => {
    const s = this.survey();
    if (!s) return [];

    const questions = s.questions;
    const metadata = s.metadata;
    const mode = metadata?.paginationMode ?? 'one-by-one';

    if (mode === 'all-at-once') {
      return questions.length ? [questions] : [];
    }

    const perPage = mode === 'paged'
      ? this.clampNumber(metadata?.questionsPerPage, 1, 50, 3)
      : 1;

    const pages = [];
    for (let index = 0; index < questions.length; index += perPage) {
      pages.push(questions.slice(index, index + perPage));
    }
    return pages;
  });

  progress = computed(() => {
    const pages = this.pages();
    if (!pages.length || !this.started()) return 0;
    return ((this.currentPageIndex() + 1) / pages.length) * 100;
  });

  totalQuestions = computed(() => this.survey()?.questions.length || 0);
  isFirst = computed(() => this.currentPageIndex() === 0);
  isLast = computed(() => this.currentPageIndex() === this.pages().length - 1);

  currentPageQuestions = computed(() => this.pages()[this.currentPageIndex()] ?? []);
  currentQuestion = computed(() => this.currentPageQuestions()[0] ?? null);

  currentAnswer = computed(() => {
    const question = this.currentQuestion();
    return question ? this.answers().get(question.id) : undefined;
  });

  constructor(
    private readonly route: ActivatedRoute,
    private readonly surveyService: SurveyService
  ) {}

  async ngOnInit(): Promise<void> {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.notFound.set(true);
      return;
    }

    const loadedSurvey = await this.surveyService.getSurvey(id);
    if (!loadedSurvey || loadedSurvey.status !== 'activo') {
      this.notFound.set(true);
      return;
    }

    this.survey.set(this.prepareSurveyForResponse(loadedSurvey));
    this.restorePartialResponse(loadedSurvey.id);
    this.startTime = Date.now();
  }

  startSurvey(): void {
    this.started.set(true);
    this.completed.set(false);
    if (this.currentPageIndex() >= this.pages().length) {
      this.currentPageIndex.set(0);
    }
    this.validationError.set('');
    this.startTime = Date.now();
    this.persistPartialResponse();
  }

  updateAnswer(questionIdOrValue: string | AnswerValue | string[], value?: AnswerValue | string[]): void {
    const questionId = value === undefined ? this.currentQuestion()?.id : String(questionIdOrValue);
    const answerValue = value === undefined ? questionIdOrValue as AnswerValue | string[] : value;
    if (!questionId) return;

    const newMap = new Map(this.answers());
    newMap.set(questionId, answerValue);
    this.answers.set(newMap);
    this.validationError.set('');
    this.submitError.set('');
    this.persistPartialResponse();
  }

  goNext(): void {
    const validationMessage = this.getValidationMessage();
    if (validationMessage) {
      this.validationError.set(validationMessage);
      return;
    }

    const target = this.findConditionalTarget();
    if (target === 'end') {
      void this.submitSurvey();
      return;
    }

    if (typeof target === 'number') {
      this.currentPageIndex.set(target);
      this.validationError.set('');
      this.submitError.set('');
      this.persistPartialResponse();
      return;
    }

    if (this.isLast()) {
      void this.submitSurvey();
      return;
    }

    this.currentPageIndex.update(index => index + 1);
    this.validationError.set('');
    this.submitError.set('');
    this.persistPartialResponse();
  }

  goPrev(): void {
    if (!this.isFirst()) {
      this.currentPageIndex.update(index => index - 1);
      this.validationError.set('');
      this.submitError.set('');
      this.persistPartialResponse();
    }
  }

  canProceed(): boolean {
    return this.getValidationMessage() === '';
  }

  private getValidationMessage(): string {
    const questions = this.currentPageQuestions();
    if (!questions.length) return 'No hay una pregunta disponible para responder.';

    for (const q of questions) {
      const answer = this.answers().get(q.id);
      const hasAnswer = Array.isArray(answer)
        ? answer.length > 0
        : typeof answer === 'string'
          ? answer.trim().length > 0
          : answer !== undefined && answer !== null;

      if (q.required && !hasAnswer) {
        return `La pregunta "${q.text || 'sin titulo'}" es obligatoria. Selecciona o escribe una respuesta para continuar.`;
      }

      if (!hasAnswer) {
        continue;
      }

      const type = String(q.type || '').toLowerCase();
      if (type === 'email' && typeof answer === 'string' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(answer.trim())) {
        return 'Ingresa un correo electronico valido.';
      }

      if ((type === 'phone' || type === 'telefono') && typeof answer === 'string' && !/^[+()\d\s.-]{7,}$/.test(answer.trim())) {
        return 'Ingresa un numero de telefono valido.';
      }

      const validation = q.validation;
      if (typeof answer === 'string') {
        const length = answer.trim().length;
        if (validation?.minLength && length < validation.minLength) {
          return `La pregunta "${q.text || 'sin titulo'}" necesita al menos ${validation.minLength} caracteres.`;
        }
        if (validation?.maxLength && length > validation.maxLength) {
          return `La pregunta "${q.text || 'sin titulo'}" permite maximo ${validation.maxLength} caracteres.`;
        }
      }

      if (Array.isArray(answer)) {
        if (validation?.minSelections && answer.length < validation.minSelections) {
          return `Selecciona al menos ${validation.minSelections} opcion(es).`;
        }
        if (validation?.maxSelections && answer.length > validation.maxSelections) {
          return `Selecciona como maximo ${validation.maxSelections} opcion(es).`;
        }
      }
    }

    return '';
  }

  getAnswer(questionId: string): AnswerValue | string[] | undefined {
    return this.answers().get(questionId);
  }

  brand(): SurveyBrand {
    return this.survey()?.metadata?.brand ?? {};
  }

  progressMode(): NonNullable<Survey['metadata']>['progressMode'] {
    return this.survey()?.metadata?.progressMode ?? 'percentage';
  }

  progressLabel(): string {
    const current = this.currentPageIndex() + 1;
    const total = Math.max(this.pages().length, 1);
    if (this.progressMode() === 'steps') {
      return `${current} de ${total}`;
    }

    return `${Math.round(this.progress())}%`;
  }

  themeStyle(): Record<string, string> {
    const fallback = this.publicThemePresets[0];
    const brand = this.brand();
    const primary = this.safeColor(brand.primaryColor, fallback.primary);
    const secondary = this.safeColor(brand.secondaryColor, fallback.secondary);
    const background = this.safeColor(brand.backgroundColor, fallback.background);
    const surface = this.safeColor(brand.surfaceColor, fallback.surface);
    const text = this.safeColor(brand.textColor, fallback.text);
    const metadata = this.survey()?.metadata as any;
    const backgroundImage = metadata?.theme?.backgroundImage || metadata?.backgroundImage || '';
    const buttonColor = this.safeColor(brand.buttonColor, primary);
    const buttonText = this.safeColor(brand.buttonTextColor, '#ffffff');
    const cardRadius = this.clampNumber(brand.cardRadius, 16, 36, 28);
    const buttonRadius = this.clampNumber(brand.buttonRadius, 10, 999, 18);
    const fontTitle = brand.fontTitle || 'Inter';
    const fontBody = brand.fontBody || 'Inter';

    return {
      '--response-primary': primary,
      '--response-secondary': secondary,
      '--response-bg': background,
      '--response-surface': surface,
      '--response-answer-bg': '#ffffff',
      '--response-heading': text,
      '--response-text': text,
      '--response-muted': this.mixMuted(text),
      '--response-border': 'rgba(15, 23, 42, 0.12)',
      '--response-button': buttonColor,
      '--response-button-text': buttonText,
      '--response-button-radius': `${brand.buttonStyle === 'pill' ? 999 : buttonRadius}px`,
      '--response-card-radius': `${cardRadius}px`,
      '--response-title-font': `'${fontTitle}', Inter, sans-serif`,
      '--response-body-font': `'${fontBody}', Inter, sans-serif`,
      '--response-background-image': backgroundImage ? `url(${backgroundImage})` : 'none'
    };
  }

  private async submitSurvey(): Promise<void> {
    const s = this.survey();
    if (!s || this.isSubmitting()) return;

    this.isSubmitting.set(true);
    this.submitError.set('');

    try {
      const duration = Math.floor((Date.now() - this.startTime) / 1000);
      const answersArray = Array.from(this.answers().entries()).map(([questionId, value]) => ({
        questionId,
        value
      }));

      await this.surveyService.addResponse(s.id, answersArray, duration);
      this.completed.set(true);
      this.clearPartialResponse();
    } catch (error) {
      console.error('Error submitting survey:', error);
      this.submitError.set('No pudimos enviar la encuesta. Revisa tu conexion e intenta de nuevo.');
    } finally {
      this.isSubmitting.set(false);
    }
  }

  private findConditionalTarget(): number | 'end' | null {
    const pages = this.pages();
    for (const question of this.currentPageQuestions()) {
      const answer = this.answers().get(question.id);
      const rule = question.logic?.find((item) => this.matchesRule(answer, item));
      if (!rule?.goTo) continue;
      if (rule.goTo === 'end') return 'end';

      const pageIndex = pages.findIndex((page) => page.some((item) => item.id === rule.goTo));
      if (pageIndex >= 0) return pageIndex;
    }

    return null;
  }

  private matchesRule(answer: AnswerValue | string[] | undefined, rule: NonNullable<Question['logic']>[number]): boolean {
    if (answer === undefined || answer === null) return false;
    if (rule.answerIncludes && Array.isArray(answer)) {
      return answer.includes(rule.answerIncludes);
    }
    if (rule.answerEquals !== undefined) {
      return String(answer) === String(rule.answerEquals);
    }
    return false;
  }

  private prepareSurveyForResponse(survey: Survey): Survey {
    return {
      ...survey,
      questions: survey.questions.map((question) => ({
        ...question,
        options: question.randomizeOptions ? this.shuffleOptions(question.options, `${survey.id}:${question.id}`) : question.options
      }))
    };
  }

  private shuffleOptions<T>(items: T[], seedText: string): T[] {
    const result = [...items];
    let seed = Array.from(seedText).reduce((total, char) => total + char.charCodeAt(0), Date.now() % 997);
    for (let index = result.length - 1; index > 0; index--) {
      seed = (seed * 9301 + 49297) % 233280;
      const swapIndex = Math.floor((seed / 233280) * (index + 1));
      [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
    }
    return result;
  }

  private persistPartialResponse(): void {
    const survey = this.survey();
    if (!survey || this.completed()) return;
    try {
      localStorage.setItem(this.partialStorageKey(survey.id), JSON.stringify({
        started: this.started(),
        currentPageIndex: this.currentPageIndex(),
        answers: Array.from(this.answers().entries()),
        startTime: this.startTime || Date.now()
      }));
    } catch {
      // localStorage can be unavailable in private contexts.
    }
  }

  private restorePartialResponse(surveyId: string): void {
    try {
      const raw = localStorage.getItem(this.partialStorageKey(surveyId));
      if (!raw) return;
      const parsed = JSON.parse(raw) as {
        started?: boolean;
        currentPageIndex?: number;
        answers?: Array<[string, AnswerValue | string[]]>;
        startTime?: number;
      };
      this.started.set(parsed.started ?? false);
      this.currentPageIndex.set(Math.max(0, parsed.currentPageIndex ?? 0));
      this.answers.set(new Map(parsed.answers ?? []));
      this.startTime = parsed.startTime ?? Date.now();
    } catch {
      this.clearPartialResponse();
    }
  }

  private clearPartialResponse(): void {
    const survey = this.survey();
    if (!survey) return;
    localStorage.removeItem(this.partialStorageKey(survey.id));
  }

  private partialStorageKey(surveyId: string): string {
    return `${this.partialStoragePrefix}:${surveyId}`;
  }

  private safeColor(value: string | undefined, fallback: string): string {
    if (!value || !/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value.trim())) {
      return fallback;
    }

    return value.trim();
  }

  private clampNumber(value: number | undefined, min: number, max: number, fallback: number): number {
    if (typeof value !== 'number' || Number.isNaN(value)) {
      return fallback;
    }

    return Math.max(min, Math.min(max, value));
  }

  private mixMuted(textColor: string): string {
    return textColor.toLowerCase() === '#ffffff' ? '#d1d5db' : '#64748b';
  }
}
