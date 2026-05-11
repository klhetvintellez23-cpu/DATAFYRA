import { Injectable } from '@angular/core';
import type { AnswerValue, SurveyAnswerRow, SurveyRow } from './survey-repository.service';
import type { Question, Survey } from './survey.service';

@Injectable({ providedIn: 'root' })
export class SurveyMapperService {
  mapSurvey(survey: SurveyRow): Survey {
    return {
      id: survey.id,
      userId: survey.usuario_id,
      title: survey.titulo,
      description: survey.descripcion,
      status: survey.estado,
      metadata: survey.metadatos,
      createdAt: survey.creado_el,
      updatedAt: survey.actualizado_el,
      responses_count: survey.envios_count?.[0]?.count || survey.envios?.length || 0,
      responses: (survey.envios || []).map((response) => ({
        id: response.id,
        surveyId: response.encuesta_id,
        completedAt: response.completado_el,
        duration: response.duracion,
        answers: (response.respuestas || []).map((answer) => ({
          questionId: answer.pregunta_id,
          value: this.extractAnswerValue(answer.valor)
        }))
      })),
      questions: (survey.preguntas || [])
        .slice()
        .sort((a, b) => (a.indice_orden ?? 0) - (b.indice_orden ?? 0))
        .map((question) => this.mapQuestion(question))
    };
  }

  private mapQuestion(question: NonNullable<SurveyRow['preguntas']>[number]): Question {
    return {
      id: question.id,
      type: this.mapQuestionType(question.tipo, question.metadatos?.questionType),
      text: question.enunciado,
      required: question.es_obligatoria,
      min: question.metadatos?.min,
      max: question.metadatos?.max,
      imageUrl: question.metadatos?.imageUrl,
      imageConfig: question.metadatos?.imageConfig,
      validation: question.metadatos?.validation,
      logic: question.metadatos?.logic ?? [],
      randomizeOptions: question.metadatos?.randomizeOptions ?? false,
      options: (question.opciones_pregunta || []).map((option) => ({
        id: option.id,
        texto: option.texto
      }))
    };
  }

  private mapQuestionType(type: string, metadataType?: string): Question['type'] {
    if (this.isKnownQuestionType(metadataType)) {
      return metadataType;
    }

    switch (type) {
      case 'texto':
        return 'text';
      case 'texto_largo':
        return 'long-text';
      case 'seleccion_multiple':
        return 'multiple-choice';
      case 'calificacion':
        return 'rating';
      case 'escala':
      default:
        return 'scale';
    }
  }

  private isKnownQuestionType(type: string | undefined): type is Question['type'] {
    return [
      'rating',
      'multiple-choice',
      'multi-select',
      'text',
      'long-text',
      'scale',
      'nps',
      'email',
      'phone',
      'date',
      'time'
    ].includes(type ?? '');
  }

  extractAnswerValue(value: SurveyAnswerRow['valor']): AnswerValue {
    if (value && typeof value === 'object' && 'val' in value) {
      return (value.val as AnswerValue | undefined) ?? null;
    }

    return value ?? null;
  }

  normalizeAnswerValue(value: AnswerValue): AnswerValue | { val: AnswerValue } {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return value;
    }

    return { val: value };
  }
}
