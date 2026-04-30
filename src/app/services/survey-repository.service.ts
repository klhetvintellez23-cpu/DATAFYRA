import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';

export type QuestionType = 'rating' | 'multiple-choice' | 'text' | 'scale';
export type SurveyStatus = 'borrador' | 'activo' | 'cerrado';
export type AnswerValue = string | number | boolean | Record<string, unknown> | null;

export interface SurveyOptionRow {
  id: string;
  texto: string;
}

export interface SurveyQuestionRow {
  id: string;
  tipo: QuestionType;
  enunciado: string;
  es_obligatoria: boolean;
  metadatos?: {
    min?: number;
    max?: number;
  } | null;
  opciones_pregunta?: SurveyOptionRow[] | null;
}

export interface SurveyAnswerRow {
  pregunta_id: string;
  valor: AnswerValue | { val?: AnswerValue };
}

export interface SurveyResponseRow {
  id: string;
  encuesta_id: string;
  completado_el: string;
  duracion: number;
  respuestas?: SurveyAnswerRow[] | null;
}

export interface SurveyRow {
  id: string;
  usuario_id: string;
  titulo: string;
  descripcion: string;
  estado: SurveyStatus;
  creado_el: string;
  actualizado_el: string;
  envios_count?: Array<{ count: number }> | null;
  envios?: SurveyResponseRow[] | null;
  preguntas?: SurveyQuestionRow[] | null;
}

@Injectable({ providedIn: 'root' })
export class SurveyRepositoryService {
  private readonly supabaseService = inject(SupabaseService);
  private readonly supabase = this.supabaseService.client;

  isAvailable(): boolean {
    return this.supabase !== null;
  }

  async getSurveysByUser(userId: string): Promise<SurveyRow[]> {
    if (!this.supabase) {
      return [];
    }

    const { data, error } = await this.supabase
      .from('encuestas')
      .select(`
        *,
        preguntas (*, opciones_pregunta (*)),
        envios (count)
      `)
      .eq('usuario_id', userId)
      .order('creado_el', { ascending: false });

    if (error) {
      console.error('Error fetching surveys:', error);
      return [];
    }

    return (data as SurveyRow[]) ?? [];
  }

  async getSurvey(id: string): Promise<SurveyRow | null> {
    if (!this.supabase) {
      return null;
    }

    const { data, error } = await this.supabase
      .from('encuestas')
      .select(`
        *,
        preguntas (*, opciones_pregunta (*)),
        envios (*, respuestas (*))
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching survey deep:', error);
      return null;
    }

    return data as SurveyRow;
  }

  async createSurvey(userId: string, title: string, description: string): Promise<SurveyRow | null> {
    if (!this.supabase) {
      return null;
    }

    const { data, error } = await this.supabase
      .from('encuestas')
      .insert({
        usuario_id: userId,
        titulo: title,
        descripcion: description,
        estado: 'borrador'
      })
      .select()
      .single();

    if (error) {
      return null;
    }

    return data as SurveyRow;
  }

  async deleteSurvey(id: string): Promise<boolean> {
    if (!this.supabase) {
      return false;
    }

    const { error } = await this.supabase
      .from('encuestas')
      .delete()
      .eq('id', id);

    return !error;
  }

  async createSurveyResponse(surveyId: string, duration: number): Promise<{ id: string }> {
    if (!this.supabase) {
      throw new Error('Falta configurar Supabase en public/env.js.');
    }

    const { data, error } = await this.supabase
      .from('envios')
      .insert({
        encuesta_id: surveyId,
        duracion: duration
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data as { id: string };
  }

  async insertAnswers(
    envioId: string,
    answers: Array<{ questionId: string; value: AnswerValue | { val: AnswerValue } }>
  ): Promise<void> {
    if (!this.supabase) {
      throw new Error('Falta configurar Supabase en public/env.js.');
    }

    const payload = answers.map((answer) => ({
      envio_id: envioId,
      pregunta_id: answer.questionId,
      valor: answer.value
    }));

    const { error } = await this.supabase
      .from('respuestas')
      .insert(payload);

    if (error) {
      throw error;
    }
  }
}
