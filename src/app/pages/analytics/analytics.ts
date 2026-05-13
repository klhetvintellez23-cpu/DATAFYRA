import { Component, OnInit, signal, computed } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { NavbarComponent } from '../../components/navbar/navbar';
import { SurveyService, Survey } from '../../services/survey.service';
import { AnalyticsService, SurveyMetrics, DistributionItem } from '../../services/analytics.service';

@Component({
  selector: 'app-analytics',
  imports: [RouterLink, NavbarComponent, DecimalPipe],
  templateUrl: './analytics.html',
  styleUrl: './analytics.css'
})
export class AnalyticsPage implements OnInit {
  survey = signal<Survey | null>(null);
  metrics = signal<SurveyMetrics | null>(null);
  dailyData = signal<{ label: string; count: number }[]>([]);
  selectedQuestion = signal<string>('');
  distribution = signal<DistributionItem[]>([]);
  textResponses = signal<string[]>([]);
  trendData = signal<{ labels: string[]; data: number[] }>({ labels: [], data: [] });

  maxDaily = computed(() => Math.max(...this.dailyData().map(d => d.count), 1));
  maxDistribution = computed(() => Math.max(...this.distribution().map(d => d.count), 1));
  maxTrend = computed(() => Math.max(...this.trendData().data, 1));

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private surveyService: SurveyService,
    private analyticsService: AnalyticsService
  ) {}

  async ngOnInit(): Promise<void> {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.router.navigate(['/dashboard']);
      return;
    }

    const s = await this.surveyService.getSurvey(id);
    if (!s) {
      this.router.navigate(['/dashboard']);
      return;
    }

    this.initializeSurveyState(s);
  }

  private initializeSurveyState(survey: Survey): void {
    this.survey.set(survey);
    this.metrics.set(this.analyticsService.getMetrics(survey));
    this.dailyData.set(this.analyticsService.getDailyResponses(survey.responses, 7));
    this.trendData.set(this.analyticsService.getResponseTrend(survey.responses, 14));

    if (survey.questions.length > 0) {
      this.selectQuestion(survey.questions[0].id);
    }
  }

  selectQuestion(questionId: string): void {
    this.selectedQuestion.set(questionId);
    const s = this.survey();
    if (!s) return;

    const q = s.questions.find(q => q.id === questionId);
    if (!q) return;

    if (['text', 'long-text', 'email', 'phone', 'url', 'number', 'date', 'time'].includes(q.type)) {
      this.textResponses.set(this.analyticsService.getTextResponses(s, questionId));
      this.distribution.set([]);
    } else {
      this.distribution.set(this.analyticsService.getQuestionDistribution(s, questionId));
      this.textResponses.set([]);
    }
  }

  getQuestionText(id: string): string {
    return this.survey()?.questions.find(q => q.id === id)?.text || '';
  }

  getQuestionType(id: string): string {
    return this.survey()?.questions.find(q => q.id === id)?.type || '';
  }

  exportCSV(): void {
    const s = this.survey();
    if (!s) return;

    const headers = ['Response ID', 'Timestamp', 'Duration (s)', 'Nombre', 'Email', ...s.questions.map(q => q.text)];
    const rows = s.responses.map(r => {
      const name = r.answers.find(a => a.questionId === '__participant_name')?.value ?? '';
      const email = r.answers.find(a => a.questionId === '__participant_email')?.value ?? '';
      const answers = s.questions.map(q => {
        const a = r.answers.find(a => a.questionId === q.id);
        return a ? this.formatCell(a.value) : '';
      });
      return [r.id, r.completedAt, String(r.duration), this.formatCell(name), this.formatCell(email), ...answers];
    });

    const csv = [headers.map(h => this.csvEscape(h)).join(','), ...rows.map(r => r.map(cell => this.csvEscape(cell)).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${s.title.replace(/\s+/g, '_')}_export.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  exportExcel(): void {
    const s = this.survey();
    if (!s) return;
    const headers = ['Response ID', 'Timestamp', 'Duration (s)', 'Nombre', 'Email', ...s.questions.map(q => q.text)];
    const rows = s.responses.map(r => {
      const name = r.answers.find(a => a.questionId === '__participant_name')?.value ?? '';
      const email = r.answers.find(a => a.questionId === '__participant_email')?.value ?? '';
      return [
        r.id,
        r.completedAt,
        String(r.duration),
        this.formatCell(name),
        this.formatCell(email),
        ...s.questions.map(q => this.formatCell(r.answers.find(a => a.questionId === q.id)?.value ?? ''))
      ];
    });
    const table = `<table><thead><tr>${headers.map(h => `<th>${this.htmlEscape(h)}</th>`).join('')}</tr></thead><tbody>${rows.map(row => `<tr>${row.map(cell => `<td>${this.htmlEscape(cell)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
    const blob = new Blob([table], { type: 'application/vnd.ms-excel' });
    this.downloadBlob(blob, `${s.title.replace(/\s+/g, '_')}_export.xls`);
  }

  exportPDF(): void {
    window.print();
  }

  private downloadBlob(blob: Blob, fileName: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  }

  private formatCell(value: unknown): string {
    if (Array.isArray(value)) return value.join(' | ');
    if (value && typeof value === 'object') return JSON.stringify(value);
    return String(value ?? '');
  }

  private csvEscape(value: string): string {
    return `"${value.replace(/"/g, '""')}"`;
  }

  private htmlEscape(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}
