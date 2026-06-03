import { Component, HostListener, OnInit, signal, computed } from '@angular/core';
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
  showExportDropdown = signal(false);
  chartViewTypes = signal<Record<string, 'bars' | 'donut' | 'pie'>>({});
  chartColors = ['#440789', '#9333ea', '#c084fc', '#e9d5ff', '#6d28d9', '#a78bfa', '#ddd6fe'];
  hoveredSlice = signal<{ label: string; percentage: number; count: number } | null>(null);

  maxDaily = computed(() => Math.max(...this.dailyData().map(d => d.count), 1));
  maxDistribution = computed(() => Math.max(...this.distribution().map(d => d.count), 1));
  maxTrend = computed(() => Math.max(...this.trendData().data, 1));

  getPieChartSlices(distribution: any[]) {
    let currentAngle = -90; 
    const totalCount = this.getTotalDistributionCount(distribution);
    
    return distribution.map((item, i) => {
      const percentage = totalCount ? (item.count / totalCount) : 0;
      const angle = percentage * 360;
      const startAngle = currentAngle;
      const endAngle = currentAngle + angle;
      currentAngle = endAngle;

      if (percentage === 1 || percentage > 0.999) {
        return { color: this.chartColors[i % this.chartColors.length], isFull: true, path: '', label: item.label, count: item.count, percentage: item.percentage };
      }

      const x1 = 50 + 50 * Math.cos((Math.PI * startAngle) / 180);
      const y1 = 50 + 50 * Math.sin((Math.PI * startAngle) / 180);
      const x2 = 50 + 50 * Math.cos((Math.PI * endAngle) / 180);
      const y2 = 50 + 50 * Math.sin((Math.PI * endAngle) / 180);
      
      const largeArcFlag = angle > 180 ? 1 : 0;
      const pathData = `M 50 50 L ${x1} ${y1} A 50 50 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;

      return { color: this.chartColors[i % this.chartColors.length], isFull: false, path: pathData, label: item.label, count: item.count, percentage: item.percentage };
    });
  }

  getTotalDistributionCount(distribution: any[]): number {
    return distribution.reduce((acc, cur) => acc + (cur.count || 0), 0);
  }

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

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement | null;
    if (!target?.closest('.ana-export-menu')) {
      this.showExportDropdown.set(false);
    }
  }

  toggleExportDropdown(event: MouseEvent): void {
    event.stopPropagation();
    this.showExportDropdown.update((open) => !open);
  }

  getChartViewType(questionId: string): 'bars' | 'donut' | 'pie' {
    return this.chartViewTypes()[questionId] || 'bars';
  }

  setChartViewType(questionId: string, type: 'bars' | 'donut' | 'pie'): void {
    this.chartViewTypes.update(types => ({...types, [questionId]: type}));
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
    const s = this.survey();
    if (!s) return;
    this.openAnalyticsPdfReport(s);
  }

  private openAnalyticsPdfReport(survey: Survey): void {
    const reportWindow = window.open('', '_blank', 'width=1100,height=800');
    const html = this.buildAnalyticsReportHtml(survey);

    if (!reportWindow) {
      this.downloadBlob(new Blob([html], { type: 'text/html' }), `${this.slugifyFileName(survey.title)}_informe.html`);
      return;
    }

    reportWindow.document.open();
    reportWindow.document.write(html);
    reportWindow.document.close();
    reportWindow.focus();
    setTimeout(() => reportWindow.print(), 350);
  }

  private buildAnalyticsReportHtml(survey: Survey): string {
    const metrics = this.analyticsService.getMetrics(survey);
    const generatedAt = new Date().toLocaleString();
    const latestResponse = survey.responses
      .map((response) => response.completedAt)
      .sort()
      .at(-1);
    const latestLabel = latestResponse ? new Date(latestResponse).toLocaleString() : 'Sin respuestas';
    const trend = this.analyticsService.getResponseTrend(survey.responses, 14);
    const maxTrend = Math.max(...trend.data, 1);
    const requiredCount = survey.questions.filter((question) => question.required).length;
    const tableHeaders = ['#', 'Fecha', 'Duracion', 'Nombre', 'Email', ...survey.questions.map((question) => question.text || 'Pregunta')];

    const trendRows = trend.data.map((value, index) => `
      <tr>
        <td>${this.htmlEscape(trend.labels[index] ?? '')}</td>
        <td>${value}</td>
        <td>${value === 0 ? 'Sin actividad' : value === maxTrend ? 'Pico del periodo' : 'Actividad registrada'}</td>
      </tr>
    `).join('');

    const questionSections = survey.questions.map((question, index) => {
      const answered = survey.responses.filter((response) => response.answers.some((answer) => answer.questionId === question.id));
      const distribution = this.analyticsService.getQuestionDistribution(survey, question.id);
      const textResponses = this.analyticsService.getTextResponses(survey, question.id);
      const maxDistribution = Math.max(...distribution.map((item) => item.count), 1);
      const body = distribution.length > 0
        ? distribution.map((item) => `
            <div class="dist-row">
              <span>${this.htmlEscape(item.label)}</span>
              <div><i style="width:${Math.max((item.count / maxDistribution) * 100, item.count > 0 ? 4 : 0)}%"></i></div>
              <strong>${item.count}</strong>
              <em>${item.percentage}%</em>
            </div>
          `).join('')
        : textResponses.length > 0
          ? textResponses.slice(0, 12).map((text) => `<blockquote>${this.htmlEscape(text)}</blockquote>`).join('')
          : '<p class="muted">No hay respuestas registradas para esta pregunta.</p>';

      return `
        <section class="question-card">
          <div class="question-head">
            <span>Pregunta ${index + 1}</span>
            <strong>${answered.length} respuesta${answered.length === 1 ? '' : 's'}</strong>
          </div>
          <h3>${this.htmlEscape(question.text || 'Pregunta sin titulo')}</h3>
          ${question.description ? `<p class="muted">${this.htmlEscape(question.description)}</p>` : ''}
          ${body}
        </section>
      `;
    }).join('');

    const responseRows = survey.responses.map((response, index) => {
      const name = this.formatCell(response.answers.find((answer) => answer.questionId === '__participant_name')?.value ?? '');
      const email = this.formatCell(response.answers.find((answer) => answer.questionId === '__participant_email')?.value ?? '');
      const answers = survey.questions.map((question) => this.formatCell(response.answers.find((answer) => answer.questionId === question.id)?.value ?? 'Sin respuesta'));
      return `
        <tr>
          <td>${index + 1}</td>
          <td>${this.htmlEscape(new Date(response.completedAt).toLocaleString())}</td>
          <td>${this.htmlEscape(this.formatDuration(response.duration))}</td>
          <td>${this.htmlEscape(name || '-')}</td>
          <td>${this.htmlEscape(email || '-')}</td>
          ${answers.map((answer) => `<td>${this.htmlEscape(answer)}</td>`).join('')}
        </tr>
      `;
    }).join('');

    return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <title>Informe - ${this.htmlEscape(survey.title || 'Encuesta')}</title>
  <style>
    @page { size: A4; margin: 16mm; }
    * { box-sizing: border-box; }
    body { margin: 0; color: #111827; background: #f8fafc; font-family: Inter, Arial, sans-serif; line-height: 1.45; }
    .report { max-width: 1100px; margin: 0 auto; padding: 32px; background: #fff; }
    .hero { border: 1px solid #e5e7eb; border-radius: 18px; padding: 28px; background: linear-gradient(135deg, #ffffff, #f3f0ff); }
    .eyebrow { margin: 0 0 8px; color: #440789; font-size: 12px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; }
    h1 { margin: 0; color: #111827; font-size: 34px; line-height: 1.1; }
    h2 { margin: 32px 0 12px; font-size: 20px; }
    h3 { margin: 8px 0; font-size: 16px; }
    p { margin: 8px 0 0; }
    .muted { color: #64748b; }
    .meta { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 18px; color: #475569; font-size: 12px; }
    .meta span { border: 1px solid #e5e7eb; border-radius: 999px; padding: 6px 10px; background: #fff; }
    .metrics { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-top: 18px; }
    .metric { border: 1px solid #e5e7eb; border-radius: 14px; padding: 14px; background: #fff; }
    .metric small { display: block; color: #64748b; font-size: 11px; font-weight: 700; }
    .metric strong { display: block; margin-top: 6px; color: #440789; font-size: 24px; line-height: 1; }
    .summary-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
    .panel, .question-card { break-inside: avoid; border: 1px solid #e5e7eb; border-radius: 14px; padding: 16px; background: #fff; }
    .question-card { margin-bottom: 12px; }
    .question-head { display: flex; justify-content: space-between; gap: 12px; color: #64748b; font-size: 12px; font-weight: 700; }
    .report-table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
    .report-table th, .report-table td { border: 1px solid #e5e7eb; padding: 8px; text-align: left; vertical-align: top; }
    .report-table th { background: #f8fafc; color: #334155; font-weight: 800; }
    .dist-row { display: grid; grid-template-columns: minmax(150px, 1fr) 2fr 48px 48px; gap: 10px; align-items: center; margin-top: 9px; font-size: 12px; }
    .dist-row div { height: 8px; border-radius: 999px; background: #eef2ff; overflow: hidden; }
    .dist-row i { display: block; height: 100%; border-radius: inherit; background: #440789; }
    .dist-row strong, .dist-row em { text-align: right; font-style: normal; }
    blockquote { margin: 10px 0 0; border-left: 3px solid #c4b5fd; padding: 8px 10px; background: #f8fafc; color: #334155; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 10px; }
    th, td { border: 1px solid #e5e7eb; padding: 7px; text-align: left; vertical-align: top; }
    th { background: #f1f5f9; color: #334155; font-weight: 800; }
    td { color: #1f2937; }
    .footer { margin-top: 28px; padding-top: 12px; border-top: 1px solid #e5e7eb; color: #64748b; font-size: 11px; }
    @media print {
      body { background: #fff; }
      .report { padding: 0; max-width: none; }
      .hero, .panel, .question-card, .metric { box-shadow: none; }
    }
  </style>
</head>
<body>
  <main class="report">
    <section class="hero">
      <p class="eyebrow">Informe de resultados</p>
      <h1>${this.htmlEscape(survey.title || 'Encuesta sin titulo')}</h1>
      ${survey.description ? `<p class="muted">${this.htmlEscape(survey.description)}</p>` : ''}
      <div class="meta">
        <span>Generado: ${this.htmlEscape(generatedAt)}</span>
        <span>Ultima respuesta: ${this.htmlEscape(latestLabel)}</span>
        <span>Estado: ${this.htmlEscape(String(survey.status))}</span>
        <span>${survey.questions.length} pregunta${survey.questions.length === 1 ? '' : 's'} (${requiredCount} requerida${requiredCount === 1 ? '' : 's'})</span>
      </div>
      <div class="metrics">
        <article class="metric"><small>Total respuestas</small><strong>${metrics.totalResponses}</strong></article>
        <article class="metric"><small>Tasa de completado</small><strong>${metrics.completionRate}%</strong></article>
        <article class="metric"><small>Tiempo promedio</small><strong>${this.htmlEscape(metrics.avgDurationFormatted)}</strong></article>
        <article class="metric"><small>NPS</small><strong>${metrics.npsScore > 0 ? '+' : ''}${metrics.npsScore}</strong></article>
      </div>
    </section>

    <h2>Resumen ejecutivo</h2>
    <section class="summary-grid">
      <article class="panel">
        <h3>Lectura general</h3>
        <p class="muted">La encuesta registra ${metrics.totalResponses} respuesta${metrics.totalResponses === 1 ? '' : 's'}, con una tasa de completado de ${metrics.completionRate}% y un tiempo promedio de ${this.htmlEscape(metrics.avgDurationFormatted)}.</p>
      </article>
      <article class="panel">
        <h3>Movimiento de respuestas, ultimos 14 dias</h3>
        <table class="report-table">
          <thead>
            <tr>
              <th>Dia</th>
              <th>Respuestas</th>
              <th>Lectura</th>
            </tr>
          </thead>
          <tbody>${trendRows}</tbody>
        </table>
      </article>
    </section>

    <h2>Analisis por pregunta</h2>
    ${questionSections || '<p class="muted">No hay preguntas configuradas.</p>'}

    <h2>Base completa de respuestas</h2>
    <table>
      <thead><tr>${tableHeaders.map((header) => `<th>${this.htmlEscape(header)}</th>`).join('')}</tr></thead>
      <tbody>${responseRows || `<tr><td colspan="${tableHeaders.length}">Sin respuestas registradas.</td></tr>`}</tbody>
    </table>

    <p class="footer">Informe generado por DataEncuesta. Revise los datos personales antes de compartir este documento externamente.</p>
  </main>
</body>
</html>`;
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

  private formatDuration(seconds: number): string {
    const safeSeconds = Math.max(0, Math.floor(seconds || 0));
    const mins = Math.floor(safeSeconds / 60);
    const secs = safeSeconds % 60;
    return `${mins}m ${secs}s`;
  }

  private slugifyFileName(value: string): string {
    return (value || 'encuesta')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '') || 'encuesta';
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
