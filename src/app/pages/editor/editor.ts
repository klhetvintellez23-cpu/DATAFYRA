import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TitleCasePipe } from '@angular/common';
import { NavbarComponent } from '../../components/navbar/navbar';
import { AuthService } from '../../services/auth.service';
import { SurveyService, Survey, Question, QuestionType } from '../../services/survey.service';

@Component({
  selector: 'app-editor',
  imports: [FormsModule, RouterLink, NavbarComponent, TitleCasePipe],
  templateUrl: './editor.html',
  styleUrl: './editor.css'
})
export class EditorPage implements OnInit {
  survey = signal<Survey | null>(null);
  isNew = signal(false);
  saved = signal(false);
  preview = signal(false);

  questionTypes: { type: QuestionType; label: string; icon: string }[] = [
    { type: 'rating', label: 'Rating (1-10)', icon: 'Star' },
    { type: 'multiple-choice', label: 'Opción Múltiple', icon: 'List' },
    { type: 'text', label: 'Texto Libre', icon: 'Text' },
    { type: 'scale', label: 'Escala (1-5)', icon: 'Scale' }
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private surveyService: SurveyService,
    private auth: AuthService
  ) {}

  async ngOnInit(): Promise<void> {
    if (!this.ensureAuthenticated()) {
      return;
    }

    const id = this.route.snapshot.paramMap.get('id');
    if (id === 'new' || !id) {
      await this.initializeNewSurvey();
      return;
    }

    await this.loadExistingSurvey(id);
  }

  private ensureAuthenticated(): boolean {
    if (!this.auth.isLoggedIn()) {
      this.router.navigate(['/']);
      return false;
    }

    return true;
  }

  private async initializeNewSurvey(): Promise<void> {
    this.isNew.set(true);
    const user = this.auth.user();
    if (!user) {
      return;
    }

    const newSurvey = await this.surveyService.createSurvey(user.id, 'Nueva Encuesta', '');
    if (newSurvey) {
      this.survey.set(newSurvey);
    }
  }

  private async loadExistingSurvey(id: string): Promise<void> {
    const existing = await this.surveyService.getSurvey(id);
    if (existing) {
      this.survey.set({ ...existing });
      return;
    }

    this.router.navigate(['/dashboard']);
  }

  updateTitle(value: string): void {
    const s = this.survey();
    if (s) {
      s.title = value;
      this.survey.set({ ...s });
    }
  }

  updateDescription(value: string): void {
    const s = this.survey();
    if (s) {
      s.description = value;
      this.survey.set({ ...s });
    }
  }

  async addQuestion(type: QuestionType): Promise<void> {
    const s = this.survey();
    if (s) {
      // For now, we update local state and save later, or we could create in DB immediately.
      // Standard flow is add to local state then save.
      const q: Question = {
        id: 'new-' + Date.now(),
        type,
        text: '',
        required: true,
        options: type === 'multiple-choice' ? [
          { id: 'o1', texto: 'Opción 1' },
          { id: 'o2', texto: 'Opción 2' }
        ] : []
      };
      if (type === 'rating') { q.min = 1; q.max = 10; }
      if (type === 'scale') { q.min = 1; q.max = 5; }
      
      s.questions = [...s.questions, q];
      this.survey.set({ ...s });
    }
  }

  updateQuestionText(qIndex: number, value: string): void {
    const s = this.survey();
    if (s) {
      s.questions[qIndex].text = value;
      this.survey.set({ ...s });
    }
  }

  toggleRequired(qIndex: number): void {
    const s = this.survey();
    if (s) {
      s.questions[qIndex].required = !s.questions[qIndex].required;
      this.survey.set({ ...s });
    }
  }

  removeQuestion(qIndex: number): void {
    const s = this.survey();
    if (s) {
      s.questions = s.questions.filter((_, i) => i !== qIndex);
      this.survey.set({ ...s });
    }
  }

  updateOption(qIndex: number, oIndex: number, value: string): void {
    const s = this.survey();
    if (s) {
      s.questions[qIndex].options[oIndex].texto = value;
      this.survey.set({ ...s });
    }
  }

  addOption(qIndex: number): void {
    const s = this.survey();
    if (s) {
      const newOpt = { id: 'o-' + Date.now(), texto: `Nueva Opción` };
      s.questions[qIndex].options = [...s.questions[qIndex].options, newOpt];
      this.survey.set({ ...s });
    }
  }

  removeOption(qIndex: number, oIndex: number): void {
    const s = this.survey();
    if (s && s.questions[qIndex].options.length > 2) {
      s.questions[qIndex].options = s.questions[qIndex].options.filter((_, i) => i !== oIndex);
      this.survey.set({ ...s });
    }
  }

  moveQuestion(from: number, direction: number): void {
    const s = this.survey();
    if (!s) return;
    const to = from + direction;
    if (to < 0 || to >= s.questions.length) return;
    const questions = [...s.questions];
    [questions[from], questions[to]] = [questions[to], questions[from]];
    s.questions = questions;
    this.survey.set({ ...s });
  }

  async save(): Promise<void> {
    const s = this.survey();
    if (s) {
      // In a real Supabase flow, we'd have an 'updateSurveyFull' method.
      // For now, let's just trigger the state.
      this.saved.set(true);
      setTimeout(() => this.saved.set(false), 2000);
    }
  }

  async publish(): Promise<void> {
    const s = this.survey();
    if (s) {
      s.status = 'activo';
      this.saved.set(true);
      setTimeout(() => this.saved.set(false), 2000);
    }
  }

  getShareLink(): string {
    const s = this.survey();
    return s ? this.surveyService.getShareLink(s.id) : '';
  }

  copyShareLink(): void {
    navigator.clipboard.writeText(this.getShareLink());
  }

  getTypeIcon(type: QuestionType): string {
    return this.questionTypes.find(t => t.type === type)?.icon || '?';
  }

  getTypeLabel(type: QuestionType): string {
    return this.questionTypes.find(t => t.type === type)?.label || type;
  }
}
