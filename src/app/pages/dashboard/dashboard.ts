import { Component, computed, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { NavbarComponent } from '../../components/navbar/navbar';
import { AuthService } from '../../services/auth.service';
import { SurveyService, Survey } from '../../services/survey.service';
import { AnalyticsService } from '../../services/analytics.service';
import { DecimalPipe, SlicePipe, TitleCasePipe } from '@angular/common';

type DashboardFilter = 'all' | 'activo' | 'borrador' | 'cerrado' | 'withResponses' | 'withoutResponses';
type DashboardSort = 'updated' | 'responses' | 'created' | 'status';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [NavbarComponent, FormsModule, DecimalPipe, SlicePipe, TitleCasePipe],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardPage implements OnInit {
  surveys = signal<Survey[]>([]);
  copiedId = signal<string | null>(null);
  openMenuId = signal<string | null>(null);
  searchTerm = signal('');
  activeFilter = signal<DashboardFilter>('all');
  sortBy = signal<DashboardSort>('updated');
  readonly filters: DashboardFilter[] = ['all', 'activo', 'borrador', 'cerrado', 'withResponses', 'withoutResponses'];

  userName = computed(() => {
    const user = this.auth.user();
    if (!user || (!user.name && !user.email)) return 'User';
    return (user.name || user.email.split('@')[0]).split(' ')[0];
  });

  totalResponses = computed(() =>
    this.surveys().reduce((sum, s) => sum + this.responseCount(s), 0)
  );

  activeSurveys = computed(() =>
    this.surveys().filter(s => s.status === 'activo').length
  );

  lastSevenDayResponses = computed(() =>
    this.recentInsights().reduce((sum, item) => sum + item.count, 0)
  );

  averageCompletionRate = computed(() => {
    const surveys = this.surveys().filter((survey) => this.responseCount(survey) > 0);
    if (!surveys.length) return 0;
    const total = surveys.reduce((sum, survey) => sum + this.analyticsService.getMetrics(survey).completionRate, 0);
    return Math.round(total / surveys.length);
  });

  filteredSurveys = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const filter = this.activeFilter();
    const sorted = [...this.surveys()]
      .filter((survey) => {
        const matchesTerm = !term
          || survey.title.toLowerCase().includes(term)
          || survey.description.toLowerCase().includes(term);
        if (!matchesTerm) return false;
        if (filter === 'withResponses') return this.responseCount(survey) > 0;
        if (filter === 'withoutResponses') return this.responseCount(survey) === 0;
        if (filter === 'all') return true;
        return survey.status === filter;
      });

    const sort = this.sortBy();
    sorted.sort((a, b) => {
      if (sort === 'responses') return this.responseCount(b) - this.responseCount(a);
      if (sort === 'created') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (sort === 'status') return this.statusRank(a) - this.statusRank(b);
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
    return sorted;
  });

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
      const count = allResponses.filter(r => r.completedAt && typeof r.completedAt === 'string' && r.completedAt.split('T')[0] === dateStr).length;
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
    if (!this.ensureAuthenticated()) {
      return;
    }

    this.loadSurveys();
  }

  private ensureAuthenticated(): boolean {
    if (!this.auth.isLoggedIn()) {
      this.router.navigate(['/']);
      return false;
    }

    return true;
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

  setFilter(filter: DashboardFilter): void {
    this.activeFilter.set(filter);
  }

  setSearchTerm(value: string): void {
    this.searchTerm.set(value);
  }

  setSortBy(value: DashboardSort): void {
    this.sortBy.set(value);
  }

  toggleCardMenu(id: string, event: Event): void {
    event.stopPropagation();
    this.openMenuId.update((current) => current === id ? null : id);
  }

  closeCardMenu(event?: Event): void {
    event?.stopPropagation();
    this.openMenuId.set(null);
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
    this.openMenuId.set(null);
    setTimeout(() => this.copiedId.set(null), 2000);
  }

  openPublicSurvey(id: string, event: Event): void {
    event.stopPropagation();
    this.openMenuId.set(null);
    window.open(this.surveyService.getShareLink(id), '_blank', 'noopener,noreferrer');
  }

  downloadQr(id: string, event: Event): void {
    event.stopPropagation();
    this.openMenuId.set(null);
    window.open(this.qrImageUrl(id), '_blank', 'noopener,noreferrer');
  }

  async toggleSurveyStatus(survey: Survey, event: Event): Promise<void> {
    event.stopPropagation();
    const nextStatus = survey.status === 'activo' ? 'cerrado' : 'activo';
    const saved = await this.surveyService.saveSurvey({ ...survey, status: nextStatus });
    if (saved) {
      this.surveys.update((list) => list.map((item) => item.id === saved.id ? saved : item));
    }
    this.openMenuId.set(null);
  }

  async duplicateSurvey(source: Survey, event: Event): Promise<void> {
    event.stopPropagation();
    const user = this.auth.user();
    if (!user) return;

    const created = await this.surveyService.createSurvey(user.id, `${source.title} copia`, source.description);
    if (!created) return;

    const copy = await this.surveyService.saveSurvey({
      ...created,
      questions: source.questions.map((question) => ({
        ...question,
        id: crypto.randomUUID(),
        options: question.options.map((option) => ({ ...option, id: crypto.randomUUID() }))
      })),
      metadata: source.metadata,
      status: 'borrador'
    });

    if (copy) {
      this.surveys.update((list) => [copy, ...list]);
      this.openMenuId.set(null);
      void this.router.navigate(['/editor', copy.id]);
    }
  }

  goTemplates(): void {
    void this.router.navigate(['/templates']);
  }

  goShowcase(): void {
    void this.router.navigate(['/showcase']);
  }

  qrImageUrl(id: string): string {
    return `https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(this.surveyService.getShareLink(id))}`;
  }

  responseCount(survey: Survey): number {
    return survey.responses_count ?? survey.responses.length ?? 0;
  }

  questionCount(survey: Survey): number {
    return survey.questions.length;
  }

  lastResponseLabel(survey: Survey): string {
    const last = [...survey.responses].sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())[0];
    return last ? this.getTimeSince(last.completedAt) : 'Sin respuestas';
  }

  closesAtLabel(survey: Survey): string {
    return survey.metadata?.closesAt ? new Date(survey.metadata.closesAt).toLocaleDateString() : '';
  }

  isClosingSoon(survey: Survey): boolean {
    if (!survey.metadata?.closesAt || survey.status !== 'activo') return false;
    const diff = new Date(survey.metadata.closesAt).getTime() - Date.now();
    return diff > 0 && diff <= 3 * 86400000;
  }

  hasReachedLimit(survey: Survey): boolean {
    const limit = survey.metadata?.maxResponses;
    return Boolean(limit && this.responseCount(survey) >= limit);
  }

  hasContactCollection(survey: Survey): boolean {
    return survey.metadata?.privacyMode === 'collect-contact';
  }

  hasOneResponsePolicy(survey: Survey): boolean {
    return survey.metadata?.responsePolicy === 'once-per-browser';
  }

  statusLabel(survey: Survey): string {
    if (this.hasReachedLimit(survey)) return 'Limite alcanzado';
    if (this.isClosingSoon(survey)) return 'Cierra pronto';
    return survey.status;
  }

  filterLabel(filter: DashboardFilter): string {
    switch (filter) {
      case 'activo': return 'Activas';
      case 'borrador': return 'Borradores';
      case 'cerrado': return 'Cerradas';
      case 'withResponses': return 'Con respuestas';
      case 'withoutResponses': return 'Sin respuestas';
      default: return 'Todas';
    }
  }

  private statusRank(survey: Survey): number {
    if (survey.status === 'activo') return 0;
    if (survey.status === 'borrador') return 1;
    return 2;
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
