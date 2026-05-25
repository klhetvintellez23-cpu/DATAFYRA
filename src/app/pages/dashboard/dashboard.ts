import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { Question, Survey, SurveyMetadata, SurveyService } from '../../services/survey.service';

type DashboardFilter = 'all' | 'activo' | 'borrador' | 'cerrado' | 'withResponses' | 'withoutResponses';
type DashboardSort = 'updated' | 'responses' | 'created' | 'status';
type CreateMode = 'blank' | 'template' | 'import';
type DashboardLayout = 'grid' | 'list';

interface DashboardFolder {
  id: string;
  name: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardPage implements OnInit {
  surveys = signal<Survey[]>([]);
  folders = signal<DashboardFolder[]>([]);
  surveyFolders = signal<Record<string, string>>({});
  selectedFolderId = signal<string | null>(null);
  copiedId = signal<string | null>(null);
  openMenuId = signal<string | null>(null);
  searchTerm = signal('');
  activeFilter = signal<DashboardFilter>('all');
  sortBy = signal<DashboardSort>('created');
  layoutMode = signal<DashboardLayout>('grid');
  
  isCreating = signal<boolean>(false);
  showCreateModal = signal<boolean>(false);
  newSurveyTitle = signal<string>('');
  newSurveyDescription = signal<string>('');
  createError = signal<string | null>(null);
  createMode = signal<CreateMode>('blank');
  importTitle = signal<string>('Encuesta importada');
  importText = signal<string>('');

  private readonly foldersStorageKey = 'datafyra-dashboard-folders';
  private readonly surveyFoldersStorageKey = 'datafyra-dashboard-survey-folders';

  readonly filterOptions: { value: DashboardFilter; label: string }[] = [
    { value: 'all', label: 'Todas' },
    { value: 'activo', label: 'Activas' },
    { value: 'borrador', label: 'Borradores' },
    { value: 'withResponses', label: 'Con respuestas' }
  ];

  readonly sortOptions: { value: DashboardSort; label: string }[] = [
    { value: 'updated', label: 'Última modificación' },
    { value: 'created', label: 'Fecha de creación' },
    { value: 'responses', label: 'Más respuestas' },
    { value: 'status', label: 'Estado' }
  ];

  totalResponses = computed(() =>
    this.surveys().reduce((sum, survey) => sum + this.responseCount(survey), 0)
  );

  planUsagePercent = computed(() => Math.min(100, Math.round((this.totalResponses() / 100) * 100)));

  planUsageLabel = computed(() => `${Math.min(this.totalResponses(), 100)}/100`);

  filteredSurveys = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const filter = this.activeFilter();
    const source = this.surveys();
    const folderId = this.selectedFolderId();
    const sorted = [...source].filter((survey) => {
      const matchesTerm = !term
        || survey.title.toLowerCase().includes(term)
        || survey.description.toLowerCase().includes(term);

      if (!matchesTerm) return false;
      if (folderId && this.folderForSurvey(survey.id) !== folderId) return false;
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

    this.loadDashboardState();
    this.loadSurveys();
  }

  async loadSurveys(): Promise<void> {
    const userId = this.auth.user()?.id;
    if (!userId) return;

    const data = await this.surveyService.getSurveysByUser(userId);
    this.surveys.set(data);
  }

  openCreateModal(): void {
    this.newSurveyTitle.set('');
    this.newSurveyDescription.set('');
    this.createError.set(null);
    this.createMode.set('blank');
    this.importTitle.set('Encuesta importada');
    this.importText.set('');
    this.showCreateModal.set(true);
  }

  closeCreateModal(): void {
    this.showCreateModal.set(false);
    this.createError.set(null);
  }

  async confirmCreate(): Promise<void> {
    if (this.createMode() === 'template') {
      this.closeCreateModal();
      void this.router.navigate(['/templates'], { queryParams: { returnTo: '/dashboard' } });
      return;
    }

    if (this.createMode() === 'import') {
      await this.createFromImport();
      return;
    }

    if (!this.newSurveyTitle().trim()) return;

    const user = this.auth.user();
    if (!user) return;

    this.isCreating.set(true);
    this.createError.set(null);

    try {
      const survey = await this.surveyService.createSurvey(
        user.id,
        this.newSurveyTitle().trim(),
        this.newSurveyDescription().trim() || 'Sin descripción',
        this.defaultDirectMetadata()
      );
      if (survey) {
        this.closeCreateModal();
        void this.router.navigate(['/editor', survey.id]);
      } else {
        this.createError.set('No se pudo crear la encuesta. Revisa la conexión o la configuración de la base de datos.');
      }
    } catch (e) {
      console.error('Error creating survey:', e);
      this.createError.set('Ocurrió un error creando la encuesta. Intenta de nuevo.');
    } finally {
      this.isCreating.set(false);
    }
  }

  private defaultDirectMetadata(): SurveyMetadata {
    return {
      welcomeLayout: 'minimal',
      ctaText: 'Comenzar',
      endLayout: 'compact',
      endTitle: 'Gracias por responder',
      endDescription: 'Tus respuestas quedaron registradas.',
      thankYouTitle: 'Gracias por responder',
      thankYouDescription: 'Tus respuestas quedaron registradas.',
      brand: {
        primaryColor: '#18181b',
        secondaryColor: '#71717a',
        backgroundColor: '#ffffff',
        backgroundImageUrl: undefined,
        surfaceColor: '#ffffff',
        textColor: '#09090b',
        questionStyle: 'minimal',
        buttonStyle: 'square',
        cardRadius: 16,
        buttonRadius: 10,
        fontTitle: 'Inter',
        fontBody: 'Inter',
        fontButton: 'Inter',
        shadowPreset: 'none',
        glassEffect: false,
        borderGlow: false,
        entryAnimation: 'fadeUp',
        progressBar: { enabled: true, style: 'line' }
      }
    };
  }

  setSearchTerm(value: string): void {
    this.searchTerm.set(value);
  }

  setFilter(value: DashboardFilter): void {
    this.activeFilter.set(value);
  }

  setSortBy(value: DashboardSort): void {
    this.sortBy.set(value);
  }

  setLayoutMode(value: DashboardLayout): void {
    this.layoutMode.set(value);
  }

  resetDashboardFilters(): void {
    this.searchTerm.set('');
    this.activeFilter.set('all');
    this.selectedFolderId.set(null);
  }

  emptyTitle(): string {
    return this.surveys().length === 0 ? 'No hay encuestas todavia' : 'No hay resultados';
  }

  emptyDescription(): string {
    return this.surveys().length === 0
      ? 'Crea tu primera encuesta para empezar a recopilar respuestas.'
      : 'Ajusta la busqueda, cambia el filtro o vuelve al inicio.';
  }

  setCreateMode(mode: CreateMode): void {
    this.createMode.set(mode);
    this.createError.set(null);
  }

  fillImportExample(): void {
    this.importTitle.set('Feedback de producto');
    this.importText.set([
      '# Puedes pegar una pregunta por línea',
      '¿Qué tan fácil fue usar el producto?',
      '¿Qué funcionalidad usas más? | Editor | Plantillas | Analíticas | Compartir',
      '¿Qué deberíamos mejorar primero?',
      '¿Nos recomendarías? | Sí | No | Tal vez'
    ].join('\n'));
  }

  selectFolder(folderId: string): void {
    this.selectedFolderId.set(folderId);
    this.openMenuId.set(null);
  }

  clearFolderFilter(): void {
    this.selectedFolderId.set(null);
  }

  addFolder(): void {
    const name = prompt('Nombre de la carpeta');
    const clean = name?.trim();
    if (!clean) return;
    this.folders.update((folders) => [...folders, { id: crypto.randomUUID(), name: clean }]);
    this.persistFolders();
  }

  renameFolder(folder: DashboardFolder, event: Event): void {
    event.stopPropagation();
    const name = prompt('Nuevo nombre de la carpeta', folder.name);
    const clean = name?.trim();
    if (!clean) return;
    this.folders.update((folders) => folders.map((item) => item.id === folder.id ? { ...item, name: clean } : item));
    this.persistFolders();
  }

  deleteFolder(folder: DashboardFolder, event: Event): void {
    event.stopPropagation();
    if (!confirm(`Eliminar la carpeta "${folder.name}"? Las encuestas no se eliminarán.`)) return;
    this.folders.update((folders) => folders.filter((item) => item.id !== folder.id));
    this.surveyFolders.update((map) => {
      const next = { ...map };
      for (const [surveyId, folderId] of Object.entries(next)) {
        if (folderId === folder.id) delete next[surveyId];
      }
      return next;
    });
    if (this.selectedFolderId() === folder.id) this.selectedFolderId.set(null);
    this.persistFolders();
    this.persistSurveyFolders();
  }

  moveSurveyToFolder(surveyId: string, folderId: string | null, event: Event): void {
    event.stopPropagation();
    this.surveyFolders.update((map) => {
      const next = { ...map };
      if (folderId) next[surveyId] = folderId;
      else delete next[surveyId];
      return next;
    });
    this.openMenuId.set(null);
    this.persistSurveyFolders();
  }

  folderCount(folderId: string): number {
    return this.surveys().filter((survey) => this.folderForSurvey(survey.id) === folderId).length;
  }

  folderForSurvey(surveyId: string): string | null {
    return this.surveyFolders()[surveyId] ?? null;
  }

  folderName(folderId: string | null): string {
    if (!folderId) return 'Sin carpeta';
    return this.folders().find((folder) => folder.id === folderId)?.name ?? 'Sin carpeta';
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

  async createFromImport(): Promise<void> {
    const user = this.auth.user();
    if (!user) return;

    const questions = this.parseImportedQuestions(this.importText());
    if (!questions.length) {
      this.createError.set('Pega al menos una pregunta. Usa una línea por pregunta y separa opciones con "|".');
      return;
    }

    this.isCreating.set(true);
    this.createError.set(null);

    try {
      const survey = await this.surveyService.createSurvey(
        user.id,
        this.importTitle().trim() || 'Encuesta importada',
        'Preguntas importadas desde texto.',
        undefined,
        questions
      );
      if (survey) {
        this.closeCreateModal();
        void this.router.navigate(['/editor', survey.id]);
      } else {
        this.createError.set('No se pudo importar la encuesta. Revisa la conexión o configuración.');
      }
    } catch (error) {
      console.error('Error importing questions:', error);
      this.createError.set('Ocurrió un error importando las preguntas.');
    } finally {
      this.isCreating.set(false);
    }
  }

  responseCount(survey: Survey): number {
    return survey.responses_count ?? survey.responses.length ?? 0;
  }

  responseCountLabel(survey: Survey): string {
    const count = this.responseCount(survey);
    return `${count} respuesta${count === 1 ? '' : 's'}`;
  }

  filterCount(filter: DashboardFilter): number {
    const source = this.surveys();
    const folderId = this.selectedFolderId();
    return source.filter((survey) => {
      if (folderId && this.folderForSurvey(survey.id) !== folderId) return false;
      if (filter === 'withResponses') return this.responseCount(survey) > 0;
      if (filter === 'withoutResponses') return this.responseCount(survey) === 0;
      if (filter === 'all') return true;
      return survey.status === filter;
    }).length;
  }

  statusLabel(status: Survey['status']): string {
    if (status === 'activo') return 'Activa';
    if (status === 'cerrado') return 'Cerrada';
    return 'Borrador';
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

  private loadDashboardState(): void {
    try {
      this.folders.set(JSON.parse(localStorage.getItem(this.foldersStorageKey) || '[]') as DashboardFolder[]);
      this.surveyFolders.set(JSON.parse(localStorage.getItem(this.surveyFoldersStorageKey) || '{}') as Record<string, string>);
    } catch {
      this.folders.set([]);
      this.surveyFolders.set({});
    }
  }

  private persistFolders(): void {
    localStorage.setItem(this.foldersStorageKey, JSON.stringify(this.folders()));
  }

  private persistSurveyFolders(): void {
    localStorage.setItem(this.surveyFoldersStorageKey, JSON.stringify(this.surveyFolders()));
  }

  private parseImportedQuestions(text: string): Question[] {
    return text
      .split(/\r?\n/)
      .map((line) => line.trim().replace(/^[-*•]\s+/, '').replace(/^\d+[.)]\s+/, ''))
      .filter((line) => Boolean(line) && !line.startsWith('#'))
      .map((line) => {
        const parts = line.split('|').map((part) => part.trim()).filter(Boolean);
        const questionText = parts[0] ?? '';
        const options = parts.slice(1);
        return {
          id: crypto.randomUUID(),
          type: options.length ? 'multiple-choice' : 'text',
          text: questionText,
          required: false,
          options: options.map((option) => ({ id: crypto.randomUUID(), texto: option }))
        };
      });
  }
}
