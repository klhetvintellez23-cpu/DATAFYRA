import { Injectable, signal, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';

export type QuestionType = 'rating' | 'multiple-choice' | 'text' | 'scale';
export type SurveyStatus = 'borrador' | 'activo' | 'cerrado';

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

export interface SurveyResponse {
  id: string;
  surveyId: string;
  answers: { questionId: string; value: any }[];
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
  private supabase = inject(SupabaseService).client;
  private surveys = signal<Survey[]>([]);

  readonly allSurveys = this.surveys.asReadonly();

  async getSurveysByUser(userId: string): Promise<Survey[]> {
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

    const mapped = data.map(s => this.mapSurvey(s));
    this.surveys.set(mapped);
    return mapped;
  }

  async getSurvey(id: string): Promise<Survey | undefined> {
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
      return undefined;
    }
    return this.mapSurvey(data);
  }

  async createSurvey(userId: string, title: string, description: string): Promise<Survey | null> {
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

    if (error) return null;
    return this.mapSurvey(data);
  }

  async deleteSurvey(id: string): Promise<boolean> {
    const { error } = await this.supabase
      .from('encuestas')
      .delete()
      .eq('id', id);

    if (!error) {
      this.surveys.update(list => list.filter(s => s.id !== id));
      return true;
    }
    return false;
  }

  async addResponse(surveyId: string, answers: { questionId: string; value: any }[], duration: number): Promise<void> {
    // 1. Create Envio
    const { data: envio, error: envioError } = await this.supabase
      .from('envios')
      .insert({
        encuesta_id: surveyId,
        duracion: duration
      })
      .select()
      .single();

    if (envioError) throw envioError;

    // 2. Create Answers
    const answersToInsert = answers.map(a => ({
      envio_id: envio.id,
      pregunta_id: a.questionId,
      valor: typeof a.value === 'object' ? a.value : { val: a.value }
    }));

    const { error: answersError } = await this.supabase
      .from('respuestas')
      .insert(answersToInsert);

    if (answersError) throw answersError;
  }

  getShareLink(surveyId: string): string {
    return `${window.location.origin}/survey/${surveyId}`;
  }

  private mapSurvey(s: any): Survey {
    return {
      id: s.id,
      userId: s.usuario_id,
      title: s.titulo,
      description: s.descripcion,
      status: s.estado,
      createdAt: s.creado_el,
      updatedAt: s.actualizado_el,
      responses_count: s.envios_count?.[0]?.count || s.envios?.length || 0,
      responses: (s.envios || []).map((e: any) => ({
        id: e.id,
        surveyId: e.encuesta_id,
        completedAt: e.completado_el,
        duration: e.duracion,
        answers: (e.respuestas || []).map((r: any) => ({
          questionId: r.pregunta_id,
          value: r.valor?.val !== undefined ? r.valor.val : r.valor
        }))
      })),
      questions: (s.preguntas || []).map((q: any) => ({
        id: q.id,
        type: q.tipo,
        text: q.enunciado,
        required: q.es_obligatoria,
        min: q.metadatos?.min,
        max: q.metadatos?.max,
        options: (q.opciones_pregunta || []).map((o: any) => ({
          id: o.id,
          texto: o.texto
        }))
      }))
    };
  }
}
