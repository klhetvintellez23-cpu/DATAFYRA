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

  readonly allSurveys = this.surveys.asReadonly();

  async getSurveysByUser(userId: string): Promise<Survey[]> {
    if (!this.repository.isAvailable()) {
      this.surveys.set([]);
      return [];
    }

    const rows = await this.repository.getSurveysByUser(userId);
    const mapped = rows.map((survey) => this.mapper.mapSurvey(survey));
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

    return this.mapper.mapSurvey(row);
  }

  async createSurvey(userId: string, title: string, description: string): Promise<Survey | null> {
    if (!this.repository.isAvailable()) {
      return null;
    }

    const row = await this.repository.createSurvey(userId, title, description);
    return row ? this.mapper.mapSurvey(row) : null;
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
}
