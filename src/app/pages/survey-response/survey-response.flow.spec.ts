import '@angular/compiler';
import { describe, expect, it } from 'vitest';
import { Survey } from '../../services/survey.service';
import { SurveyResponsePage } from './survey-response';

const sampleSurvey: Survey = {
  id: 'survey-1',
  userId: 'user-1',
  title: 'Encuesta publica',
  description: 'Descripcion',
  status: 'activo',
  metadata: {
    brand: {
      primaryColor: '#2563eb',
      secondaryColor: '#06b6d4',
      backgroundColor: '#eff6ff',
      surfaceColor: '#ffffff',
      textColor: '#111827'
    }
  },
  createdAt: '',
  updatedAt: '',
  responses: [],
  questions: [
    {
      id: 'q1',
      type: 'scale',
      text: 'Del 1 al 10',
      required: true,
      options: [],
      min: 1,
      max: 10
    },
    {
      id: 'q2',
      type: 'text',
      text: 'Comentario',
      required: false,
      options: []
    }
  ]
};

describe('SurveyResponsePage public flow', () => {
  function createPage() {
    const route = {
      snapshot: {
        paramMap: {
          get: () => sampleSurvey.id
        }
      }
    };
    const surveyService = {
      getSurvey: async () => sampleSurvey,
      addResponse: async () => undefined
    };

    return new SurveyResponsePage(route as any, surveyService as any);
  }

  it('starts on welcome and moves to the first question', async () => {
    const page = createPage();
    await page.ngOnInit();

    expect(page.started()).toBe(false);
    page.startSurvey();

    expect(page.started()).toBe(true);
    expect(page.currentQuestion()?.id).toBe('q1');
  });

  it('keeps selected scale answers in state and advances', async () => {
    const page = createPage();
    await page.ngOnInit();
    page.startSurvey();

    page.updateAnswer(8);
    expect(page.currentAnswer()).toBe(8);

    page.goNext();
    expect(page.currentQuestion()?.id).toBe('q2');
  });

  it('shows an elegant validation message for required unanswered questions', async () => {
    const page = createPage();
    await page.ngOnInit();
    page.startSurvey();

    page.goNext();

    expect(page.currentQuestion()?.id).toBe('q1');
    expect(page.validationError()).toContain('obligatoria');
  });

  it('submits and shows the thank-you state on the last question', async () => {
    const page = createPage();
    await page.ngOnInit();
    page.startSurvey();

    page.updateAnswer(10);
    page.goNext();
    page.goNext();
    await Promise.resolve();

    expect(page.completed()).toBe(true);
  });
});
