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
    if (!id) { this.router.navigate(['/dashboard']); return; }

    const s = await this.surveyService.getSurvey(id);
    if (!s) { this.router.navigate(['/dashboard']); return; }

    this.survey.set(s);
    this.metrics.set(this.analyticsService.getMetrics(s));
    this.dailyData.set(this.analyticsService.getDailyResponses(s.responses, 7));
    this.trendData.set(this.analyticsService.getResponseTrend(s.responses, 14));

    // Default to first question
    if (s.questions.length > 0) {
      this.selectQuestion(s.questions[0].id);
    }
  }

  selectQuestion(questionId: string): void {
    this.selectedQuestion.set(questionId);
    const s = this.survey();
    if (!s) return;

    const q = s.questions.find(q => q.id === questionId);
    if (!q) return;

    if (q.type === 'text') {
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

    const headers = ['Response ID', 'Timestamp', 'Duration (s)', ...s.questions.map(q => q.text)];
    const rows = s.responses.map(r => {
      const answers = s.questions.map(q => {
        const a = r.answers.find(a => a.questionId === q.id);
        return a ? String(a.value).replace(/,/g, ';') : '';
      });
      return [r.id, r.completedAt, String(r.duration), ...answers];
    });

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${s.title.replace(/\s+/g, '_')}_export.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
}
