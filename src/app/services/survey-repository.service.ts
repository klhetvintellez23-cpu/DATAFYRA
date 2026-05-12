import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';

export type QuestionType =
  | 'rating'
  | 'multiple-choice'
  | 'multi-select'
  | 'text'
  | 'long-text'
  | 'scale'
  | 'nps'
  | 'email'
  | 'phone'
  | 'date'
  | 'time';
export type SurveyStatus = 'borrador' | 'activo' | 'cerrado';
export type AnswerValue = string | string[] | number | boolean | Record<string, unknown> | null;
type SurveyQuestionDbType = 'calificacion' | 'seleccion_multiple' | 'texto' | 'texto_largo' | 'escala';
type SurveyElementConfig = { x: number; y: number; width: number; height: number; rotation?: number; zIndex?: number; positioned?: boolean; originX?: number; originY?: number };

export interface SurveyQuestionInput {
  id: string;
  type: QuestionType;
  text: string;
  required: boolean;
  options: Array<{
    id: string;
    texto: string;
  }>;
  min?: number;
  max?: number;
  imageUrl?: string;
  imageConfig?: SurveyElementConfig;
  metaConfig?: SurveyElementConfig;
  titleConfig?: SurveyElementConfig;
  helpConfig?: SurveyElementConfig;
  answerConfig?: SurveyElementConfig;
  validation?: {
    minLength?: number;
    maxLength?: number;
    minSelections?: number;
    maxSelections?: number;
    validationType?: 'email' | 'phone' | 'url' | 'number' | 'custom';
    customPattern?: string;
  };
  logic?: Array<{
    answerEquals?: AnswerValue;
    answerIncludes?: string;
    goTo?: string;
  }>;
  randomizeOptions?: boolean;
}

export interface SurveySaveInput {
  id: string;
  title: string;
  description: string;
  status: SurveyStatus;
  questions: SurveyQuestionInput[];
  metadata?: any;
}

export interface SurveyOptionRow {
  id: string;
  texto: string;
}

export interface SurveyQuestionRow {
  id: string;
  tipo: SurveyQuestionDbType;
  enunciado: string;
  es_obligatoria: boolean;
  metadatos?: {
    questionType?: QuestionType;
    min?: number;
    max?: number;
    imageUrl?: string;
    imageConfig?: SurveyElementConfig;
    metaConfig?: SurveyElementConfig;
    titleConfig?: SurveyElementConfig;
    helpConfig?: SurveyElementConfig;
    answerConfig?: SurveyElementConfig;
    validation?: SurveyQuestionInput['validation'];
    logic?: SurveyQuestionInput['logic'];
    randomizeOptions?: boolean;
  } | null;
  indice_orden?: number | null;
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
  metadatos?: any;
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
      .order('indice_orden', { foreignTable: 'preguntas', ascending: true })
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
      .order('indice_orden', { foreignTable: 'preguntas', ascending: true })
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

  async saveSurvey(input: SurveySaveInput): Promise<SurveyRow | null> {
    if (!this.supabase) {
      return null;
    }

    const surveyPayload: Record<string, any> = {
      titulo: input.title,
      descripcion: input.description,
      estado: input.status,
      metadatos: input.metadata ?? null
    };

    let { error: surveyError } = await this.supabase
      .from('encuestas')
      .update(surveyPayload)
      .eq('id', input.id);

    if (surveyError && this.isMissingMetadataColumnError(surveyError)) {
      delete surveyPayload['metadatos'];
      const retry = await this.supabase
        .from('encuestas')
        .update(surveyPayload)
        .eq('id', input.id);
      surveyError = retry.error;
    }

    if (surveyError) {
      console.error('Error updating survey:', surveyError);
      return null;
    }

    const existing = await this.getSurvey(input.id);
    if (!existing) {
      return null;
    }

    const existingQuestions = existing.preguntas ?? [];
    const persistedQuestionIds = new Set(existingQuestions.map((question) => question.id));
    const savedQuestionIds: string[] = [];

    for (let index = 0; index < input.questions.length; index++) {
      const question = input.questions[index];
      const questionPayload = {
        encuesta_id: input.id,
        tipo: this.mapQuestionTypeToDb(question.type),
        enunciado: question.text,
        es_obligatoria: question.required,
        metadatos: this.buildMetadata(question),
        indice_orden: index
      };

      let questionId = question.id;

      if (persistedQuestionIds.has(question.id)) {
        const { error } = await this.supabase
          .from('preguntas')
          .update(questionPayload)
          .eq('id', question.id);

        if (error) {
          console.error('Error updating question:', error);
          return null;
        }
      } else {
        const { data, error } = await this.supabase
          .from('preguntas')
          .insert(questionPayload)
          .select()
          .single();

        if (error || !data) {
          console.error('Error creating question:', error);
          return null;
        }

        questionId = (data as SurveyQuestionRow).id;
      }

      savedQuestionIds.push(questionId);

      if (question.type !== 'multiple-choice' && question.type !== 'multi-select') {
        const { error } = await this.supabase
          .from('opciones_pregunta')
          .delete()
          .eq('pregunta_id', questionId);

        if (error) {
          console.error('Error deleting non-choice options:', error);
          return null;
        }

        continue;
      }

      const existingOptions = existingQuestions.find((item) => item.id === question.id)?.opciones_pregunta ?? [];
      const persistedOptionIds = new Set(existingOptions.map((option) => option.id));
      const savedOptionIds: string[] = [];

      for (const option of question.options) {
        const payload = {
          pregunta_id: questionId,
          texto: option.texto
        };

        let optionId = option.id;
        if (persistedOptionIds.has(option.id)) {
          const { error } = await this.supabase
            .from('opciones_pregunta')
            .update(payload)
            .eq('id', option.id);

          if (error) {
            console.error('Error updating option:', error);
            return null;
          }
        } else {
          const { data, error } = await this.supabase
            .from('opciones_pregunta')
            .insert(payload)
            .select()
            .single();

          if (error || !data) {
            console.error('Error creating option:', error);
            return null;
          }

          optionId = (data as SurveyOptionRow).id;
        }

        savedOptionIds.push(optionId);
      }

      const optionsToDelete = existingOptions
        .map((option) => option.id)
        .filter((optionId) => !savedOptionIds.includes(optionId));

      if (optionsToDelete.length > 0) {
        const { error } = await this.supabase
          .from('opciones_pregunta')
          .delete()
          .in('id', optionsToDelete);

        if (error) {
          console.error('Error deleting removed options:', error);
          return null;
        }
      }
    }

    const questionsToDelete = existingQuestions
      .map((question) => question.id)
      .filter((questionId) => !savedQuestionIds.includes(questionId));

    if (questionsToDelete.length > 0) {
      const { error: deleteOptionsError } = await this.supabase
        .from('opciones_pregunta')
        .delete()
        .in('pregunta_id', questionsToDelete);

      if (deleteOptionsError) {
        console.error('Error deleting removed question options:', deleteOptionsError);
        return null;
      }

      const { error: deleteQuestionsError } = await this.supabase
        .from('preguntas')
        .delete()
        .in('id', questionsToDelete);

      if (deleteQuestionsError) {
        console.error('Error deleting removed questions:', deleteQuestionsError);
        return null;
      }
    }

    return this.getSurvey(input.id);
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

  private mapQuestionTypeToDb(type: QuestionType): SurveyQuestionDbType {
    switch (type) {
      case 'text':
      case 'email':
      case 'phone':
      case 'date':
      case 'time':
        return 'texto';
      case 'long-text':
        return 'texto_largo';
      case 'multiple-choice':
      case 'multi-select':
        return 'seleccion_multiple';
      case 'rating':
        return 'calificacion';
      case 'nps':
      case 'scale':
      default:
        return 'escala';
    }
  }

  private buildMetadata(question: SurveyQuestionInput): Record<string, any> | null {
    const meta: Record<string, any> = { questionType: question.type };
    
    if (question.type === 'rating' || question.type === 'scale' || question.type === 'nps') {
      meta['min'] = question.min ?? 1;
      meta['max'] = question.max ?? 10;
    }
    
    if (question.imageUrl) {
      meta['imageUrl'] = question.imageUrl;
    }
    if (question.imageConfig) {
      meta['imageConfig'] = question.imageConfig;
    }
    if (question.metaConfig) {
      meta['metaConfig'] = question.metaConfig;
    }
    if (question.titleConfig) {
      meta['titleConfig'] = question.titleConfig;
    }
    if (question.helpConfig) {
      meta['helpConfig'] = question.helpConfig;
    }
    if (question.answerConfig) {
      meta['answerConfig'] = question.answerConfig;
    }

    if (question.validation && Object.values(question.validation).some((value) => value !== undefined && value !== '')) {
      meta['validation'] = question.validation;
    }

    if (question.logic?.length) {
      meta['logic'] = question.logic.filter((rule) => rule.goTo);
    }

    if (question.randomizeOptions) {
      meta['randomizeOptions'] = true;
    }

    return Object.keys(meta).length > 0 ? meta : null;
  }

  private isMissingMetadataColumnError(error: { message?: string; code?: string }): boolean {
    const message = error.message?.toLowerCase() ?? '';
    return message.includes('metadatos') && (message.includes('column') || message.includes('schema'));
  }
}
