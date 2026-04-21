import { Component, computed, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { Router } from '@angular/router';
import { NavbarComponent } from '../../components/navbar/navbar';
import { AuthService } from '../../services/auth.service';
import { SurveyService, Survey } from '../../services/survey.service';
import { AnalyticsService } from '../../services/analytics.service';
import { DecimalPipe, UpperCasePipe, SlicePipe, TitleCasePipe } from '@angular/common';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [NavbarComponent, DecimalPipe, UpperCasePipe, SlicePipe, TitleCasePipe],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardPage implements OnInit {
  surveys = signal<Survey[]>([]);
  copiedId = signal<string | null>(null);

  userName = computed(() => {
    const user = this.auth.user();
    if (!user || (!user.name && !user.email)) return 'User';
    return (user.name || user.email.split('@')[0]).split(' ')[0];
  });

  totalResponses = computed(() =>
    this.surveys().reduce((sum, s) => sum + s.responses.length, 0)
  );

  activeSurveys = computed(() =>
    this.surveys().filter(s => s.status === 'activo').length
  );

  recentInsights = computed(() => {
    const allResponses = this.surveys()
      .flatMap(s => s.responses)
      .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());

    // Last 7 days distribution
    const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const now = new Date();
    const result: { label: string; count: number; active: boolean }[] = [];

    let maxIndex = 0;
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 86400000);
      const dateStr = date.toISOString().split('T')[0];
      const count = allResponses.filter(r => r.completedAt.split('T')[0] === dateStr).length;
      result.push({ label: days[date.getDay()], count, active: false });
    }

    // Find max for highlighting exactly like Stitch design
    let maxCount = 0;
    result.forEach((r, idx) => {
      if (r.count > maxCount) { maxCount = r.count; maxIndex = idx; }
    });
    if (maxCount > 0) {
      result[maxIndex].active = true;
    }

    return result;
  });

  maxInsight = computed(() =>
    Math.max(...this.recentInsights().map(r => r.count), 1)
  );

  constructor(
    public auth: AuthService,
    private surveyService: SurveyService,
    private analyticsService: AnalyticsService,
    public router: Router
  ) {}

  ngOnInit(): void {
    if (!this.auth.isLoggedIn()) {
      this.router.navigate(['/']);
      return;
    }
    this.loadSurveys();
  }

  async loadSurveys(): Promise<void> {
    const userId = this.auth.user()?.id;
    if (userId) {
      const data = await this.surveyService.getSurveysByUser(userId);
      this.surveys.set(data);
    }
  }

  async createNew(): Promise<void> {
    const user = this.auth.user();
    if (!user) return;
    const survey = await this.surveyService.createSurvey(user.id, 'Nueva Encuesta', 'Descripción de tu encuesta');
    if (survey) {
      this.router.navigate(['/editor', survey.id]);
    }
  }

  async deleteSurvey(id: string, event: Event): Promise<void> {
    event.stopPropagation();
    if (confirm('¿Eliminar esta encuesta? Esta acción no se puede deshacer.')) {
      const success = await this.surveyService.deleteSurvey(id);
      if (success) {
        this.loadSurveys();
      }
    }
  }

  copyLink(id: string, event: Event): void {
    event.stopPropagation();
    const link = this.surveyService.getShareLink(id);
    navigator.clipboard.writeText(link);
    this.copiedId.set(id);
    setTimeout(() => this.copiedId.set(null), 2000);
  }

  getTimeSince(dateStr: string): string {
    const diff = (Date.now() - new Date(dateStr).getTime()) || 0;
    if (diff < 0) return 'Hace instantes';
    const days = Math.floor(diff / 86400000);
    if (days === 0) return 'Hoy';
    if (days === 1) return 'Ayer';
    if (days < 7) return `Hace ${days} días`;
    if (days < 30) return `Hace ${Math.floor(days / 7)} sem`;
    return `Hace ${Math.floor(days / 30)} mes`;
  }
}
