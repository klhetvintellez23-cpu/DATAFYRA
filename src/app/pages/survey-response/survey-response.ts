import { Component, OnInit, signal, computed } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { SurveyService, Survey, Question } from '../../services/survey.service';

@Component({
  selector: 'app-survey-response',
  imports: [FormsModule],
  templateUrl: './survey-response.html',
  styleUrl: './survey-response.css'
})
export class SurveyResponsePage implements OnInit {
  survey = signal<Survey | null>(null);
  currentIndex = signal(0);
  answers = signal<Map<string, string | number>>(new Map());
  completed = signal(false);
  startTime = 0;
  notFound = signal(false);

  currentQuestion = computed(() => {
    const s = this.survey();
    if (!s) return null;
    return s.questions[this.currentIndex()] || null;
  });

  progress = computed(() => {
    const s = this.survey();
    if (!s || s.questions.length === 0) return 0;
    return ((this.currentIndex() + 1) / s.questions.length) * 100;
  });

  totalQuestions = computed(() => this.survey()?.questions.length || 0);

  isFirst = computed(() => this.currentIndex() === 0);
  isLast = computed(() => this.currentIndex() === this.totalQuestions() - 1);

  currentAnswer = computed(() => {
    const q = this.currentQuestion();
    if (!q) return undefined;
    return this.answers().get(q.id);
  });

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private surveyService: SurveyService
  ) {}

  async ngOnInit(): Promise<void> {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) { this.notFound.set(true); return; }

    const s = await this.surveyService.getSurvey(id);
    if (!s || s.status !== 'activo') { this.notFound.set(true); return; }

    this.survey.set(s);
    this.startTime = Date.now();
  }

  selectRating(value: number): void {
    const q = this.currentQuestion();
    if (!q) return;
    const newMap = new Map(this.answers());
    newMap.set(q.id, value);
    this.answers.set(newMap);
  }

  selectOption(optionText: string): void {
    const q = this.currentQuestion();
    if (!q) return;
    const newMap = new Map(this.answers());
    newMap.set(q.id, optionText);
    this.answers.set(newMap);
  }

  updateText(value: string): void {
    const q = this.currentQuestion();
    if (!q) return;
    const newMap = new Map(this.answers());
    newMap.set(q.id, value);
    this.answers.set(newMap);
  }

  goNext(): void {
    if (this.isLast()) {
      this.submitSurvey();
    } else {
      this.currentIndex.update(i => i + 1);
    }
  }

  goPrev(): void {
    if (!this.isFirst()) {
      this.currentIndex.update(i => i - 1);
    }
  }

  canProceed(): boolean {
    const q = this.currentQuestion();
    if (!q) return false;
    if (!q.required) return true;
    const answer = this.answers().get(q.id);
    return answer !== undefined && answer !== '';
  }

  private async submitSurvey(): Promise<void> {
    const s = this.survey();
    if (!s) return;

    try {
      const duration = Math.floor((Date.now() - this.startTime) / 1000);
      const answersArray = Array.from(this.answers().entries()).map(([questionId, value]) => ({
        questionId,
        value
      }));

      await this.surveyService.addResponse(s.id, answersArray, duration);
      this.completed.set(true);
    } catch (err) {
      console.error('Error submitting survey:', err);
      // Optional: add error signal to UI
    }
  }

  generateRange(min: number, max: number): number[] {
    const result = [];
    for (let i = min; i <= max; i++) { result.push(i); }
    return result;
  }
}
