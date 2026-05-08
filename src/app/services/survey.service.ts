import { inject, Injectable, signal } from '@angular/core';
import { SurveyMapperService } from './survey-mapper.service';
import { SurveyRepositoryService, QuestionType, SurveyStatus, AnswerValue } from './survey-repository.service';

export type { QuestionType, SurveyStatus, AnswerValue } from './survey-repository.service';

export interface QuestionOption {
  id: string;
  texto: string;
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
  imageConfig?: { x: number; y: number; width: number; height: number; rotation: number; zIndex: number };
}

export interface SurveyBrand {
  logoUrl?: string;
  logoConfig?: { x: number; y: number; width: number; height: number };
  primaryColor?: string;
  secondaryColor?: string;
  backgroundColor?: string;
  surfaceColor?: string;
  textColor?: string;
  buttonStyle?: 'rounded' | 'square' | 'pill';
  buttonRadius?: number;
  cardRadius?: number;
}

export interface DecoratedImage {
  id: string;
  imageUrl: string;
  config: { x: number; y: number; width: number; height: number; rotation: number; zIndex: number };
}

export interface SurveyMetadata {
  brand?: SurveyBrand;
  welcomeImages?: DecoratedImage[];
  endTitle?: string;
  endDescription?: string;
  endImages?: DecoratedImage[];
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
        imageConfig: question.imageConfig
      }))
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
    return {
      ...survey,
      metadata: metadataOverride ?? this.readMetadata(survey.id) ?? survey.metadata
    };
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
