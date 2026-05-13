import { ChangeDetectionStrategy, Component, OnInit, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { Survey, SurveyService } from '../../services/survey.service';

type DashboardFilter = 'all' | 'activo' | 'borrador' | 'cerrado' | 'withResponses' | 'withoutResponses';
type DashboardSort = 'updated' | 'responses' | 'created' | 'status';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [FormsModule],
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
  sortBy = signal<DashboardSort>('created');

  totalResponses = computed(() =>
    this.surveys().reduce((sum, survey) => sum + this.responseCount(survey), 0)
  );

  planUsagePercent = computed(() => Math.min(100, Math.round((this.totalResponses() / 100) * 100)));

  planUsageLabel = computed(() => `${Math.min(this.totalResponses(), 100)}/100`);

  filteredSurveys = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const filter = this.activeFilter();
    const sorted = [...this.surveys()].filter((survey) => {
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

  constructor(
    public auth: AuthService,
    private surveyService: SurveyService,
    public router: Router
  ) {}

  ngOnInit(): void {
    if (!this.ensureAuthenticated()) {
      return;
    }

    this.loadSurveys();
  }

  async loadSurveys(): Promise<void> {
    const userId = this.auth.user()?.id;
    if (!userId) return;

    const data = await this.surveyService.getSurveysByUser(userId);
    this.surveys.set(data);
  }

  async createNew(): Promise<void> {
    const user = this.auth.user();
    if (!user) return;

    const survey = await this.surveyService.createSurvey(user.id, 'Nueva Encuesta', 'Descripcion de tu encuesta');
    if (survey) {
      void this.router.navigate(['/editor', survey.id]);
    }
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
    if (!confirm('Eliminar esta encuesta? Esta accion no se puede deshacer.')) return;

    const success = await this.surveyService.deleteSurvey(id);
    if (success) {
      await this.loadSurveys();
    }
  }

  copyLink(id: string, event: Event): void {
    event.stopPropagation();
    const link = this.surveyService.getShareLink(id);
    void navigator.clipboard.writeText(link);
    this.copiedId.set(id);
    this.openMenuId.set(null);
    setTimeout(() => this.copiedId.set(null), 2000);
  }

  openPublicSurvey(id: string, event: Event): void {
    event.stopPropagation();
    this.openMenuId.set(null);
    window.open(this.surveyService.getShareLink(id), '_blank', 'noopener,noreferrer');
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

  responseCount(survey: Survey): number {
    return survey.responses_count ?? survey.responses.length ?? 0;
  }

  responseCountLabel(survey: Survey): string {
    const count = this.responseCount(survey);
    return `${count} respuesta${count === 1 ? '' : 's'}`;
  }

  userInitial(): string {
    const user = this.auth.user();
    const source = user?.name || user?.email || 'A';
    return source.trim().charAt(0).toUpperCase();
  }

  coverColor(id: string): string {
    const colors = ['#bfe7d5', '#f2dfb7', '#cfe2ff', '#e5d4ff', '#ffd4c8', '#d8ead2'];
    const index = [...id].reduce((sum, char) => sum + char.charCodeAt(0), 0) % colors.length;
    return colors[index];
  }

  private ensureAuthenticated(): boolean {
    if (!this.auth.isLoggedIn()) {
      void this.router.navigate(['/']);
      return false;
    }

    return true;
  }

  private statusRank(survey: Survey): number {
    if (survey.status === 'activo') return 0;
    if (survey.status === 'borrador') return 1;
    return 2;
  }
}
