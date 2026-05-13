import { inject, Injectable, signal } from '@angular/core';
import { SurveyMapperService } from './survey-mapper.service';
import { SurveyRepositoryService, QuestionType, SurveyStatus, AnswerValue } from './survey-repository.service';

export type { QuestionType, SurveyStatus, AnswerValue } from './survey-repository.service';

export interface QuestionOption {
  id: string;
  texto: string;
}

export interface QuestionValidation {
  minLength?: number;
  maxLength?: number;
  minSelections?: number;
  maxSelections?: number;
  validationType?: 'email' | 'phone' | 'url' | 'number' | 'custom';
  customPattern?: string;
}

export interface ConditionalRule {
  answerEquals?: AnswerValue;
  answerIncludes?: string;
  goTo?: string;
}

export interface SurveyElementConfig {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  zIndex?: number;
  positioned?: boolean;
  originX?: number;
  originY?: number;
}

export interface Question {
  id: string;
  type: QuestionType;
  text: string;
  required: boolean;
  options: QuestionOption[];
  min?: number;
  max?: number;
  imageUrl?: string;
  imageConfig?: SurveyElementConfig;
  metaConfig?: SurveyElementConfig;
  titleConfig?: SurveyElementConfig;
  helpConfig?: SurveyElementConfig;
  answerConfig?: SurveyElementConfig;
  validation?: QuestionValidation;
  logic?: ConditionalRule[];
  randomizeOptions?: boolean;
}

export interface SurveyBrand {
  logoUrl?: string;
  logoConfig?: SurveyElementConfig;
  primaryColor?: string;
  secondaryColor?: string;
  backgroundColor?: string;
  surfaceColor?: string;
  textColor?: string;
  buttonStyle?: 'rounded' | 'square' | 'pill';
  buttonRadius?: number;
  buttonColor?: string;
  buttonTextColor?: string;
  cardRadius?: number;
  fontTitle?: string;
  fontBody?: string;
  fontButton?: string;
  glassEffect?: boolean;
  shadowPreset?: 'none' | 'soft' | 'medium' | 'strong' | 'float';
  borderGlow?: boolean;
  entryAnimation?: 'none' | 'fadeUp' | 'scaleIn' | 'slideLeft';
  progressBar?: {
    enabled: boolean;
    style: 'line' | 'dots' | 'percentage';
    color?: string;
  };
}

export interface DecoratedImage {
  id: string;
  imageUrl: string;
  config: SurveyElementConfig;
}

export type CanvasElementType = 'text' | 'button' | 'image' | 'shape' | 'question' | 'progress';

export interface CanvasElement {
  id: string;
  type: CanvasElementType;
  content?: string;
  questionId?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  zIndex: number;
  locked: boolean;
  hidden: boolean;
  styles: Record<string, any>;
}

export interface CanvasScreen {
  id: string;
  type: 'welcome' | 'question' | 'end';
  background: {
    type: 'solid' | 'gradient' | 'image';
    value: string;
  };
  elements: CanvasElement[];
}

export interface CanvasData {
  screens: CanvasScreen[];
  layoutVersion?: number;
}

export interface SurveyMetadata {
  canvas?: CanvasData;
  brand?: SurveyBrand;
  theme?: Record<string, any>;
  welcomeImages?: DecoratedImage[];
  welcomeTitleConfig?: SurveyElementConfig;
  welcomeDescConfig?: SurveyElementConfig;
  welcomeKickerConfig?: SurveyElementConfig;
  welcomeCtaConfig?: SurveyElementConfig;
  welcomeMetaConfig?: SurveyElementConfig;
  welcomePreviewConfig?: SurveyElementConfig;
  endTitle?: string;
  endDescription?: string;
  thankYouTitle?: string;
  thankYouDescription?: string;
  endImages?: DecoratedImage[];
  endRuleConfig?: SurveyElementConfig;
  endIconConfig?: SurveyElementConfig;
  endTitleConfig?: SurveyElementConfig;
  endDescConfig?: SurveyElementConfig;
  endSummaryConfig?: SurveyElementConfig;
  endBrandConfig?: SurveyElementConfig;
  ctaText?: string;
  paginationMode?: 'one-by-one' | 'paged' | 'all-at-once';
  questionsPerPage?: number;
  progressMode?: 'percentage' | 'steps' | 'hidden';
  closesAt?: string;
  maxResponses?: number;
  privacyMode?: 'anonymous' | 'collect-contact';
  responsePolicy?: 'multiple' | 'once-per-browser';
}

export interface Answer {
  questionId: string;
  value: AnswerValue;
}

export interface SurveyResponse {
  id: string;
  surveyId: string;
  answers: Answer[];
  completedAt: string;
  duration: number;
}

export interface Survey {
  id: string;
  userId: string;
  title: string;
  description: string;
  questions: Question[];
  status: SurveyStatus;
  metadata?: SurveyMetadata;
  createdAt: string;
  updatedAt: string;
  responses_count?: number;
  responses: SurveyResponse[];
}

@Injectable({ providedIn: 'root' })
export class SurveyService {
  private readonly repository = inject(SurveyRepositoryService);
  private readonly mapper = inject(SurveyMapperService);
  private readonly surveys = signal<Survey[]>([]);
  private readonly metadataStorageKey = 'datafyra-survey-metadata';

  readonly allSurveys = this.surveys.asReadonly();

  async getSurveysByUser(userId: string): Promise<Survey[]> {
    if (!this.repository.isAvailable()) {
      this.surveys.set([]);
      return [];
    }

    const rows = await this.repository.getSurveysByUser(userId);
    const mapped = rows.map((survey) => this.hydrateSurvey(this.mapper.mapSurvey(survey)));
    this.surveys.set(mapped);
    return mapped;
  }

  async getSurvey(id: string): Promise<Survey | undefined> {
    if (!this.repository.isAvailable()) {
      return undefined;
    }

    const row = await this.repository.getSurvey(id);
    if (!row) {
      return undefined;
    }

    return this.hydrateSurvey(this.mapper.mapSurvey(row));
  }

  async createSurvey(userId: string, title: string, description: string): Promise<Survey | null> {
    if (!this.repository.isAvailable()) {
      return null;
    }

    const row = await this.repository.createSurvey(userId, title, description);
    return row ? this.hydrateSurvey(this.mapper.mapSurvey(row)) : null;
  }

  async saveSurvey(survey: Survey): Promise<Survey | null> {
    if (!this.repository.isAvailable()) {
      return null;
    }

    const row = await this.repository.saveSurvey({
      id: survey.id,
      title: survey.title,
      description: survey.description,
      status: survey.status,
      questions: survey.questions.map((question) => ({
        id: question.id,
        type: question.type,
        text: question.text,
        required: question.required,
        options: question.options.map((option) => ({
          id: option.id,
          texto: option.texto
        })),
        min: question.min,
        max: question.max,
        imageUrl: question.imageUrl,
        imageConfig: question.imageConfig,
        metaConfig: question.metaConfig,
        titleConfig: question.titleConfig,
        helpConfig: question.helpConfig,
        answerConfig: question.answerConfig,
        validation: question.validation,
        logic: question.logic,
        randomizeOptions: question.randomizeOptions
      })),
      metadata: survey.metadata
    });

    if (!row) {
      return null;
    }

    this.persistMetadata(survey.id, survey.metadata);
    const mapped = this.hydrateSurvey(this.mapper.mapSurvey(row), survey.metadata);
    this.surveys.update((list) => {
      const index = list.findIndex((item) => item.id === mapped.id);
      if (index === -1) {
        return [mapped, ...list];
      }

      const next = [...list];
      next[index] = mapped;
      return next;
    });
    return mapped;
  }

  async deleteSurvey(id: string): Promise<boolean> {
    if (!this.repository.isAvailable()) {
      return false;
    }

    const success = await this.repository.deleteSurvey(id);

    if (success) {
      this.surveys.update((list) => list.filter((survey) => survey.id !== id));
      return true;
    }

    return false;
  }

  async addResponse(surveyId: string, answers: Answer[], duration: number): Promise<void> {
    if (!this.repository.isAvailable()) {
      throw new Error('Falta configurar Supabase en public/env.js.');
    }

    const envio = await this.repository.createSurveyResponse(surveyId, duration);
    await this.repository.insertAnswers(
      envio.id,
      answers.map((answer) => ({
        questionId: answer.questionId,
        value: this.mapper.normalizeAnswerValue(answer.value)
      }))
    );
  }

  getShareLink(surveyId: string): string {
    return `${window.location.origin}/survey/${surveyId}`;
  }

  private hydrateSurvey(survey: Survey, metadataOverride?: SurveyMetadata): Survey {
    const rawMetadata = metadataOverride ?? this.readMetadata(survey.id) ?? survey.metadata ?? {};
    
    if (!rawMetadata.canvas) {
      rawMetadata.canvas = this.createDefaultCanvas(survey, rawMetadata);
    }

    return {
      ...survey,
      metadata: rawMetadata
    };
  }

  private createDefaultCanvas(survey: Survey, metadata: SurveyMetadata): CanvasData {
    const bg = metadata.brand?.backgroundColor ?? '#f4f0ff';
    const screens: any[] = [
      {
        id: 'welcome',
        type: 'welcome',
        background: { type: 'solid', value: bg },
        elements: [
          {
            id: 'welcome-title',
            type: 'text',
            content: survey.title || 'Bienvenido a la encuesta',
            x: metadata.welcomeTitleConfig?.x ?? 50,
            y: metadata.welcomeTitleConfig?.y ?? 50,
            width: metadata.welcomeTitleConfig?.width ?? 600,
            height: metadata.welcomeTitleConfig?.height ?? 80,
            rotation: 0,
            zIndex: 10,
            locked: false,
            hidden: false,
            styles: {
              fontSize: 48,
              fontWeight: 800,
              color: metadata.brand?.textColor ?? '#111827'
            }
          },
          {
            id: 'welcome-desc',
            type: 'text',
            content: survey.description || 'Por favor, responde a las siguientes preguntas.',
            x: metadata.welcomeDescConfig?.x ?? 50,
            y: metadata.welcomeDescConfig?.y ?? 150,
            width: metadata.welcomeDescConfig?.width ?? 600,
            height: metadata.welcomeDescConfig?.height ?? 60,
            rotation: 0,
            zIndex: 10,
            locked: false,
            hidden: false,
            styles: {
              fontSize: 18,
              fontWeight: 400,
              color: metadata.brand?.textColor ?? '#374151'
            }
          },
          {
            id: 'welcome-cta',
            type: 'button',
            content: metadata.ctaText || 'Comenzar encuesta',
            x: metadata.welcomeCtaConfig?.x ?? 50,
            y: metadata.welcomeCtaConfig?.y ?? 240,
            width: metadata.welcomeCtaConfig?.width ?? 200,
            height: metadata.welcomeCtaConfig?.height ?? 50,
            rotation: 0,
            zIndex: 10,
            locked: false,
            hidden: false,
            styles: {
              backgroundColor: metadata.brand?.primaryColor ?? '#7c3aed',
              color: metadata.brand?.buttonTextColor ?? '#ffffff',
              borderRadius: metadata.brand?.buttonStyle === 'pill' ? 9999 : metadata.brand?.buttonRadius ?? 8
            }
          }
        ]
      }
    ];

    // Add question screens
    survey.questions.forEach((q, i) => {
      screens.push({
        id: `question-${i}`,
        type: 'question',
        background: { type: 'solid', value: bg },
        elements: [
          {
            id: `q-${i}-title`,
            type: 'text',
            content: q.text || `Pregunta ${i + 1}`,
            x: 50,
            y: 50,
            width: 600,
            height: 60,
            rotation: 0,
            zIndex: 10,
            locked: false,
            hidden: false,
            styles: {
              fontSize: 32,
              fontWeight: 700,
              color: metadata.brand?.textColor ?? '#111827'
            }
          }
        ]
      });
    });

    // Add end screen
    screens.push({
      id: 'end',
      type: 'end',
      background: { type: 'solid', value: bg },
      elements: [
        {
          id: 'end-title',
          type: 'text',
          content: metadata.endTitle || '¡Gracias por participar!',
          x: 50,
          y: 50,
          width: 600,
          height: 80,
          rotation: 0,
          zIndex: 10,
          locked: false,
          hidden: false,
          styles: {
            fontSize: 48,
            fontWeight: 800,
            color: metadata.brand?.textColor ?? '#111827'
          }
        },
        {
          id: 'end-desc',
          type: 'text',
          content: metadata.endDescription || 'Tus respuestas han sido registradas.',
          x: 50,
          y: 150,
          width: 600,
          height: 60,
          rotation: 0,
          zIndex: 10,
          locked: false,
          hidden: false,
          styles: {
            fontSize: 18,
            fontWeight: 400,
            color: metadata.brand?.textColor ?? '#374151'
          }
        }
      ]
    });

    return { screens };
  }

  private readMetadata(surveyId: string): SurveyMetadata | undefined {
    if (typeof window === 'undefined') {
      return undefined;
    }

    try {
      const raw = window.localStorage.getItem(this.metadataStorageKey);
      if (!raw) {
        return undefined;
      }

      const parsed = JSON.parse(raw) as Record<string, SurveyMetadata>;
      return parsed[surveyId];
    } catch (error) {
      console.warn('Error reading survey metadata from localStorage:', error);
      return undefined;
    }
  }

  private persistMetadata(surveyId: string, metadata?: SurveyMetadata): void {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      const raw = window.localStorage.getItem(this.metadataStorageKey);
      const parsed = raw ? (JSON.parse(raw) as Record<string, SurveyMetadata>) : {};

      if (metadata) {
        parsed[surveyId] = metadata;
      } else {
        delete parsed[surveyId];
      }

      window.localStorage.setItem(this.metadataStorageKey, JSON.stringify(parsed));
    } catch (error) {
      console.warn('Error persisting survey metadata in localStorage:', error);
    }
  }
}
