import { Injectable } from '@angular/core';
import { Survey, SurveyResponse } from './survey.service';

export interface SurveyMetrics {
  totalResponses: number;
  completionRate: number;
  avgDuration: number;
  avgDurationFormatted: string;
  npsScore: number;
}

export interface DailyResponseData {
  label: string;
  count: number;
}

export interface DistributionItem {
  label: string;
  count: number;
  percentage: number;
}

@Injectable({ providedIn: 'root' })
export class AnalyticsService {

  getMetrics(survey: Survey): SurveyMetrics {
    const responses = survey.responses;
    const total = responses.length;

    if (total === 0) {
      return {
        totalResponses: 0,
        completionRate: 0,
        avgDuration: 0,
        avgDurationFormatted: '0m 0s',
        npsScore: 0
      };
    }

    // Completion rate: responses that answered all required questions
    const requiredQuestionIds = survey.questions.filter(q => q.required).map(q => q.id);
    const completed = responses.filter(r => {
      const answeredIds = r.answers.map(a => a.questionId);
      return requiredQuestionIds.every(qid => answeredIds.includes(qid));
    });
    const completionRate = (completed.length / total) * 100;

    // Average duration
    const avgDuration = responses.reduce((sum, r) => sum + r.duration, 0) / total;
    const mins = Math.floor(avgDuration / 60);
    const secs = Math.floor(avgDuration % 60);

    // NPS: based on scale/rating questions (simplified)
    const scaleQuestions = survey.questions.filter(q => q.type === 'scale' || q.type === 'rating');
    let nps = 0;
    if (scaleQuestions.length > 0) {
      const firstScaleQ = scaleQuestions[0];
      const maxVal = firstScaleQ.max || 10;
      let promoters = 0, detractors = 0;
      responses.forEach(r => {
        const ans = r.answers.find(a => a.questionId === firstScaleQ.id);
        if (ans && typeof ans.value === 'number') {
          const normalized = (ans.value / maxVal) * 10;
          if (normalized >= 9) promoters++;
          else if (normalized <= 6) detractors++;
        }
      });
      nps = Math.round(((promoters - detractors) / total) * 100);
    }

    return {
      totalResponses: total,
      completionRate: Math.round(completionRate * 10) / 10,
      avgDuration,
      avgDurationFormatted: `${mins}m ${secs}s`,
      npsScore: nps
    };
  }

  getDailyResponses(responses: SurveyResponse[], days: number = 7): DailyResponseData[] {
    const now = new Date();
    const result: DailyResponseData[] = [];
    const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 86400000);
      const dateStr = date.toISOString().split('T')[0];
      const count = responses.filter(r => r.completedAt.split('T')[0] === dateStr).length;
      result.push({
        label: dayNames[date.getDay()],
        count
      });
    }
    return result;
  }

  getQuestionDistribution(survey: Survey, questionId: string): DistributionItem[] {
    const question = survey.questions.find(q => q.id === questionId);
    if (!question) return [];

    const answers = survey.responses
      .map(r => r.answers.find(a => a.questionId === questionId))
      .filter(a => a !== undefined);

    if (question.type === 'multiple-choice') {
      const counts: Record<string, number> = {};
      question.options.forEach(o => counts[o.texto] = 0);
      answers.forEach(a => {
        if (typeof a.value === 'string' && counts[a.value] !== undefined) {
          counts[a.value]++;
        }
      });
      const total = answers.length || 1;
      return Object.entries(counts).map(([label, count]) => ({
        label, count, percentage: Math.round((count / total) * 100)
      }));
    }

    if (question.type === 'rating' || question.type === 'scale') {
      const min = question.min || 1;
      const max = question.max || 10;
      const counts: Record<number, number> = {};
      for (let i = min; i <= max; i++) counts[i] = 0;
      answers.forEach(a => {
        if (typeof a.value === 'number' && counts[a.value] !== undefined) {
          counts[a.value]++;
        }
      });
      const total = answers.length || 1;
      return Object.entries(counts).map(([label, count]) => ({
        label, count, percentage: Math.round((count / total) * 100)
      }));
    }

    return [];
  }

  getTextResponses(survey: Survey, questionId: string): string[] {
    return survey.responses
      .map(r => r.answers.find(a => a.questionId === questionId))
      .filter((a): a is { questionId: string; value: string | number } => a !== undefined && typeof a.value === 'string' && a.value.length > 0)
      .map(a => a.value as string);
  }

  getResponseTrend(responses: SurveyResponse[], days: number = 14): { labels: string[]; data: number[] } {
    const now = new Date();
    const labels: string[] = [];
    const data: number[] = [];

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 86400000);
      const dateStr = date.toISOString().split('T')[0];
      labels.push(`${date.getDate()}/${date.getMonth() + 1}`);
      data.push(responses.filter(r => r.completedAt.split('T')[0] === dateStr).length);
    }

    return { labels, data };
  }
}
