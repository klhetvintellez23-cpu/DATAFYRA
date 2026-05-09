import { CommonModule } from '@angular/common';
import { Component, HostListener, OnDestroy, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subject } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import {
  DecoratedImage,
  Question,
  QuestionType,
  Survey,
  SurveyBrand,
  SurveyMetadata,
  SurveyService
} from '../../services/survey.service';
import { AuthService } from '../../services/auth.service';

type EditorTab = 'design' | 'preview' | 'collect' | 'analyze';
type RightTab = 'content' | 'design';
type AssetKind = 'logo' | 'welcome-image' | 'end-image' | 'question-image';
type TransformMode = 'move' | 'resize';

interface PalettePreset {
  name: string;
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  surfaceColor: string;
  textColor: string;
}

interface ActiveTransform {
  kind: AssetKind;
  index?: number;
  mode: TransformMode;
  startX: number;
  startY: number;
  initialX: number;
  initialY: number;
  initialWidth: number;
  initialHeight: number;
}

@Component({
  selector: 'app-editor',
  imports: [FormsModule, RouterLink, CommonModule],
  templateUrl: './editor.html',
  styleUrl: './editor.css'
})
export class EditorPage implements OnInit, OnDestroy {
  survey = signal<Survey | null>(null);
  isNew = signal(false);
  saved = signal(false);
  preview = signal(false);
  isSaving = signal(false);
  saveError = signal<string | null>(null);
  infoMessage = signal<string | null>(null);
  copied = signal(false);

  activeSection: 'welcome' | 'questions' | 'end' = 'welcome';
  activeQuestionIndex = 0;
  addQuestionPanel = false;
  
  // Customization Tabs (Canva Style)
  customTab: 'content' | 'palettes' | 'colors' | 'buttons' | 'typography' | 'effects' | 'media' = 'palettes';
  currentTab: EditorTab = 'design';

  sidebarClass = () => this.currentTab === 'design' ? 'editor-sidebar-right custom-nav-active' : 'editor-sidebar-right';

  setPreviewDevice(device: 'desktop' | 'tablet' | 'mobile'): void {
    this.previewDevice = device;
  }

  showTemplateModal = false;

  readonly templatePresets: {
    name: string;
    description: string;
    icon: string;
    category: string;
    brand: Partial<import('../../services/survey.service').SurveyBrand>;
    questions: { text: string; type: string }[];
    welcomeTitle: string;
    endTitle: string;
  }[] = [
    {
      name: 'Satisfacción del Cliente',
      description: 'Mide la experiencia de tus clientes con tu producto o servicio.',
      icon: '⭐',
      category: 'Negocio',
      brand: { primaryColor: '#2563eb', secondaryColor: '#0ea5e9', backgroundColor: '#eff6ff', surfaceColor: '#ffffff', textColor: '#1e3a5f', buttonStyle: 'pill', fontTitle: 'Poppins', fontBody: 'Inter', shadowPreset: 'soft' },
      questions: [
        { text: '¿Qué tan satisfecho estás con nuestro servicio?', type: 'rating' },
        { text: '¿Recomendarías nuestro producto a un amigo?', type: 'scale' },
        { text: '¿Qué podemos mejorar?', type: 'text' }
      ],
      welcomeTitle: 'Tu opinión nos importa',
      endTitle: '¡Gracias por tu feedback!'
    },
    {
      name: 'Clima Laboral',
      description: 'Evalúa el ambiente de trabajo y satisfacción del equipo.',
      icon: '👥',
      category: 'RRHH',
      brand: { primaryColor: '#059669', secondaryColor: '#10b981', backgroundColor: '#ecfdf5', surfaceColor: '#ffffff', textColor: '#064e3b', buttonStyle: 'rounded', fontTitle: 'Outfit', fontBody: 'Inter', shadowPreset: 'medium' },
      questions: [
        { text: '¿Cómo calificarías tu ambiente de trabajo?', type: 'scale' },
        { text: '¿Te sientes valorado en tu equipo?', type: 'multiple-choice' },
        { text: '¿Qué sugerencias tienes para mejorar?', type: 'text' }
      ],
      welcomeTitle: 'Encuesta de Clima Laboral',
      endTitle: '¡Tu voz hace la diferencia!'
    },
    {
      name: 'Registro de Evento',
      description: 'Formulario de inscripción para eventos y conferencias.',
      icon: '🎪',
      category: 'Eventos',
      brand: { primaryColor: '#7c3aed', secondaryColor: '#a78bfa', backgroundColor: '#f5f3ff', surfaceColor: '#ffffff', textColor: '#3b0764', buttonStyle: 'pill', fontTitle: 'Space Grotesk', fontBody: 'Inter', shadowPreset: 'float', glassEffect: true },
      questions: [
        { text: '¿Cuál es tu nombre completo?', type: 'text' },
        { text: '¿A qué sesión deseas asistir?', type: 'multiple-choice' },
        { text: '¿Necesitas algún requerimiento especial?', type: 'text' }
      ],
      welcomeTitle: '¡Regístrate al Evento!',
      endTitle: '¡Registro exitoso!'
    },
    {
      name: 'Evaluación Educativa',
      description: 'Evalúa el desempeño docente y cursos académicos.',
      icon: '📚',
      category: 'Educación',
      brand: { primaryColor: '#1d4ed8', secondaryColor: '#3b82f6', backgroundColor: '#eef2ff', surfaceColor: '#ffffff', textColor: '#1e293b', buttonStyle: 'rounded', fontTitle: 'Merriweather', fontBody: 'Source Sans 3', shadowPreset: 'soft' },
      questions: [
        { text: '¿Cómo calificarías la calidad del curso?', type: 'rating' },
        { text: '¿El material fue útil y actualizado?', type: 'scale' },
        { text: '¿Qué tema te gustaría que se agregara?', type: 'text' }
      ],
      welcomeTitle: 'Evaluación del Curso',
      endTitle: '¡Gracias por evaluar!'
    },
    {
      name: 'Consulta Médica',
      description: 'Pre-consulta y seguimiento de pacientes.',
      icon: '🏥',
      category: 'Salud',
      brand: { primaryColor: '#0d9488', secondaryColor: '#14b8a6', backgroundColor: '#f0fdfa', surfaceColor: '#ffffff', textColor: '#134e4a', buttonStyle: 'rounded', fontTitle: 'DM Sans', fontBody: 'Inter', shadowPreset: 'soft' },
      questions: [
        { text: '¿Cuál es el motivo de su consulta?', type: 'text' },
        { text: '¿Tiene alguna alergia conocida?', type: 'multiple-choice' },
        { text: '¿Cómo califica la atención recibida?', type: 'rating' }
      ],
      welcomeTitle: 'Formulario de Paciente',
      endTitle: 'Información registrada correctamente'
    },
    {
      name: 'Feedback de Producto',
      description: 'Recopila opiniones sobre tu producto digital.',
      icon: '🚀',
      category: 'Producto',
      brand: { primaryColor: '#e11d48', secondaryColor: '#f43f5e', backgroundColor: '#fff1f2', surfaceColor: '#ffffff', textColor: '#4c0519', buttonStyle: 'pill', fontTitle: 'Plus Jakarta Sans', fontBody: 'Inter', shadowPreset: 'medium', borderGlow: true },
      questions: [
        { text: '¿Qué funcionalidad usas más?', type: 'multiple-choice' },
        { text: '¿Qué tan fácil es usar el producto?', type: 'scale' },
        { text: '¿Qué funcionalidad te gustaría que agregáramos?', type: 'text' }
      ],
      welcomeTitle: 'Ayúdanos a mejorar',
      endTitle: '¡Tu opinión impulsa nuestro producto!'
    },
    {
      name: 'Encuesta Gastronómica',
      description: 'Evalúa la experiencia en tu restaurante.',
      icon: '🍽️',
      category: 'Restaurante',
      brand: { primaryColor: '#b45309', secondaryColor: '#d97706', backgroundColor: '#fffbeb', surfaceColor: '#ffffff', textColor: '#451a03', buttonStyle: 'rounded', fontTitle: 'Playfair Display', fontBody: 'Lato', shadowPreset: 'soft' },
      questions: [
        { text: '¿Cómo calificarías la calidad de la comida?', type: 'rating' },
        { text: '¿El tiempo de espera fue razonable?', type: 'scale' },
        { text: '¿Algún comentario adicional?', type: 'text' }
      ],
      welcomeTitle: '¿Cómo fue tu experiencia?',
      endTitle: '¡Gracias por visitarnos!'
    },
    {
      name: 'Encuesta Inmobiliaria',
      description: 'Captura preferencias para búsqueda de propiedades.',
      icon: '🏠',
      category: 'Inmobiliaria',
      brand: { primaryColor: '#374151', secondaryColor: '#6b7280', backgroundColor: '#f9fafb', surfaceColor: '#ffffff', textColor: '#111827', buttonStyle: 'square', fontTitle: 'Outfit', fontBody: 'Inter', shadowPreset: 'strong' },
      questions: [
        { text: '¿Qué tipo de propiedad buscas?', type: 'multiple-choice' },
        { text: '¿Cuál es tu presupuesto aproximado?', type: 'multiple-choice' },
        { text: '¿Qué zona prefieres?', type: 'text' }
      ],
      welcomeTitle: 'Encuentra tu hogar ideal',
      endTitle: '¡Te contactaremos pronto!'
    }
  ];

  applyTemplate(index: number): void {
    const tpl = this.templatePresets[index];
    if (!tpl) return;

    this.survey.update((survey) => {
      if (!survey) return survey;
      const currentBrand = this.ensureBrand(survey.metadata?.brand);
      const brand = this.ensureBrand({ ...currentBrand, ...tpl.brand });
      const questions = tpl.questions.map((q, i) => ({
        id: crypto.randomUUID(),
        text: q.text,
        type: q.type as 'text' | 'multiple-choice' | 'scale' | 'rating',
        required: i === 0,
        options: q.type === 'multiple-choice'
          ? [
              { id: crypto.randomUUID(), texto: 'Opción 1' },
              { id: crypto.randomUUID(), texto: 'Opción 2' },
              { id: crypto.randomUUID(), texto: 'Opción 3' }
            ]
          : []
      }));
      const metadata = this.ensureMetadata(survey.metadata);
      return {
        ...survey,
        title: survey.title || tpl.name,
        questions,
        metadata: { ...metadata, brand, endTitle: tpl.endTitle, endDescription: 'Tus respuestas han sido registradas.' }
      };
    });

    this.activeSection = 'welcome';
    this.activeQuestionIndex = 0;
    this.showTemplateModal = false;
    this.queueSave();
  }

  private readonly saveSubject = new Subject<void>();
  private pendingSave = false;
  private activeTransform: ActiveTransform | null = null;

  readonly palettePresets: PalettePreset[] = [
    {
      name: 'Profesional',
      primaryColor: '#1d4ed8',
      secondaryColor: '#0f766e',
      backgroundColor: '#eaf1ff',
      surfaceColor: '#ffffff',
      textColor: '#0f172a'
    },
    {
      name: 'Coral',
      primaryColor: '#ea580c',
      secondaryColor: '#be123c',
      backgroundColor: '#fff1eb',
      surfaceColor: '#fffaf7',
      textColor: '#431407'
    },
    {
      name: 'Bosque',
      primaryColor: '#15803d',
      secondaryColor: '#0f766e',
      backgroundColor: '#edfdf2',
      surfaceColor: '#ffffff',
      textColor: '#052e16'
    },
    {
      name: 'Nocturna',
      primaryColor: '#7c3aed',
      secondaryColor: '#2563eb',
      backgroundColor: '#16132b',
      surfaceColor: '#221b3d',
      textColor: '#f8fafc'
    },
    {
      name: 'Arena',
      primaryColor: '#a16207',
      secondaryColor: '#b45309',
      backgroundColor: '#fff7ed',
      surfaceColor: '#fffbeb',
      textColor: '#451a03'
    },
    {
      name: 'Magenta',
      primaryColor: '#c026d3',
      secondaryColor: '#7c3aed',
      backgroundColor: '#fdf4ff',
      surfaceColor: '#ffffff',
      textColor: '#581c87'
    },
    {
      name: 'Médico',
      primaryColor: '#0891b2',
      secondaryColor: '#14b8a6',
      backgroundColor: '#ecfeff',
      surfaceColor: '#ffffff',
      textColor: '#164e63'
    },
    {
      name: 'Tecnología',
      primaryColor: '#0284c7',
      secondaryColor: '#06b6d4',
      backgroundColor: '#f0f9ff',
      surfaceColor: '#ffffff',
      textColor: '#0c4a6e'
    },
    {
      name: 'Gamer',
      primaryColor: '#a855f7',
      secondaryColor: '#22d3ee',
      backgroundColor: '#0f0a1e',
      surfaceColor: '#1a1333',
      textColor: '#f0e6ff'
    },
    {
      name: 'Elegante',
      primaryColor: '#1f2937',
      secondaryColor: '#d4af37',
      backgroundColor: '#fafaf9',
      surfaceColor: '#ffffff',
      textColor: '#111827'
    },
    {
      name: 'Nutrición',
      primaryColor: '#16a34a',
      secondaryColor: '#84cc16',
      backgroundColor: '#f0fdf4',
      surfaceColor: '#ffffff',
      textColor: '#14532d'
    },
    {
      name: 'Agropecuario',
      primaryColor: '#854d0e',
      secondaryColor: '#65a30d',
      backgroundColor: '#fefce8',
      surfaceColor: '#fffbeb',
      textColor: '#422006'
    },
    {
      name: 'Académico',
      primaryColor: '#1e40af',
      secondaryColor: '#64748b',
      backgroundColor: '#f1f5f9',
      surfaceColor: '#ffffff',
      textColor: '#1e293b'
    },
    {
      name: 'Minimalista',
      primaryColor: '#18181b',
      secondaryColor: '#71717a',
      backgroundColor: '#ffffff',
      surfaceColor: '#fafafa',
      textColor: '#09090b'
    },
    {
      name: 'Pastel',
      primaryColor: '#ec4899',
      secondaryColor: '#a78bfa',
      backgroundColor: '#fdf2f8',
      surfaceColor: '#ffffff',
      textColor: '#831843'
    }
  ];

  readonly questionTypes: { type: QuestionType; label: string; description: string }[] = [
    { type: 'rating', label: 'Rating (1-10)', description: 'Puntaje del 1 al 10' },
    { type: 'multiple-choice', label: 'Opcion multiple', description: 'Varias opciones a elegir' },
    { type: 'text', label: 'Texto libre', description: 'Respuesta abierta' },
    { type: 'scale', label: 'Escala (1-5)', description: 'Nivel de satisfaccion' }
  ];

  readonly fontPresets: { family: string; category: string }[] = [
    { family: 'Inter', category: 'Sans-serif' },
    { family: 'Poppins', category: 'Sans-serif' },
    { family: 'Montserrat', category: 'Sans-serif' },
    { family: 'Roboto', category: 'Sans-serif' },
    { family: 'Lato', category: 'Sans-serif' },
    { family: 'Open Sans', category: 'Sans-serif' },
    { family: 'Nunito', category: 'Sans-serif' },
    { family: 'Raleway', category: 'Sans-serif' },
    { family: 'Playfair Display', category: 'Serif' },
    { family: 'Merriweather', category: 'Serif' },
    { family: 'Oswald', category: 'Sans-serif' },
    { family: 'Rubik', category: 'Sans-serif' },
    { family: 'Work Sans', category: 'Sans-serif' },
    { family: 'Quicksand', category: 'Sans-serif' },
    { family: 'DM Sans', category: 'Sans-serif' },
    { family: 'Manrope', category: 'Sans-serif' },
    { family: 'Urbanist', category: 'Sans-serif' },
    { family: 'Bebas Neue', category: 'Display' },
    { family: 'Archivo', category: 'Sans-serif' },
    { family: 'Space Grotesk', category: 'Sans-serif' }
  ];

  private loadedFonts = new Set<string>();

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly surveyService: SurveyService,
    private readonly auth: AuthService
  ) {}

  ngOnInit(): void {
    if (!this.ensureAuthenticated()) {
      return;
    }

    this.saveSubject.pipe(debounceTime(900)).subscribe(() => {
      void this.executeSave();
    });

    const id = this.route.snapshot.paramMap.get('id');
    if (id === 'new' || !id) {
      void this.initializeNewSurvey();
      return;
    }

    void this.loadExistingSurvey(id);
  }

  ngOnDestroy(): void {
    this.saveSubject.complete();
  }

  @HostListener('document:mousemove', ['$event'])
  onMouseMove(event: MouseEvent): void {
    const transform = this.activeTransform;
    if (!transform) {
      return;
    }

    event.preventDefault();
    const dx = event.clientX - transform.startX;
    const dy = event.clientY - transform.startY;

    if (transform.kind === 'logo') {
      this.survey.update((survey) => {
        if (!survey) {
          return survey;
        }

        const brand = this.ensureBrand(survey.metadata?.brand);
        const config = { ...(brand.logoConfig ?? this.defaultLogoConfig()) };
        if (transform.mode === 'move') {
          config.x = this.clamp(transform.initialX + dx, -40, 560);
          config.y = this.clamp(transform.initialY + dy, -20, 320);
        } else {
          config.width = this.clamp(transform.initialWidth + dx, 48, 320);
          config.height = this.clamp(transform.initialHeight + dy, 32, 220);
        }
        brand.logoConfig = config;
        return { ...survey, metadata: { ...this.ensureMetadata(survey.metadata), brand } };
      });
      return;
    }

    if (transform.kind === 'welcome-image' && transform.index !== undefined) {
      const imageIndex = transform.index;
      this.survey.update((survey) => {
        if (!survey) {
          return survey;
        }

        const metadata = this.ensureMetadata(survey.metadata);
        const images = [...(metadata.welcomeImages ?? [])];
        const item = images[imageIndex];
        if (!item) {
          return survey;
        }

        const config = { ...item.config };
        if (transform.mode === 'move') {
          config.x = this.clamp(transform.initialX + dx, -80, 620);
          config.y = this.clamp(transform.initialY + dy, -40, 380);
        } else {
          config.width = this.clamp(transform.initialWidth + dx, 40, 420);
          config.height = this.clamp(transform.initialHeight + dy, 40, 420);
        }

        images[imageIndex] = { ...item, config };
        return { ...survey, metadata: { ...metadata, welcomeImages: images } };
      });
      return;
    }

    if (transform.kind === 'end-image' && transform.index !== undefined) {
      const imageIndex = transform.index;
      this.survey.update((survey) => {
        if (!survey) {
          return survey;
        }

        const metadata = this.ensureMetadata(survey.metadata);
        const images = [...(metadata.endImages ?? [])];
        const item = images[imageIndex];
        if (!item) {
          return survey;
        }

        const config = { ...item.config };
        if (transform.mode === 'move') {
          config.x = this.clamp(transform.initialX + dx, -80, 620);
          config.y = this.clamp(transform.initialY + dy, -40, 380);
        } else {
          config.width = this.clamp(transform.initialWidth + dx, 40, 420);
          config.height = this.clamp(transform.initialHeight + dy, 40, 420);
        }

        images[imageIndex] = { ...item, config };
        return { ...survey, metadata: { ...metadata, endImages: images } };
      });
      return;
    }

    if (transform.kind === 'question-image' && transform.index !== undefined) {
      const questionIndex = transform.index;
      this.survey.update((survey) => {
        if (!survey) {
          return survey;
        }

        const questions = [...survey.questions];
        const question = { ...questions[questionIndex] };
        if (!question.imageConfig) {
          return survey;
        }

        const config = { ...question.imageConfig };
        if (transform.mode === 'move') {
          config.x = this.clamp(transform.initialX + dx, -20, 420);
          config.y = this.clamp(transform.initialY + dy, -20, 280);
        } else {
          config.width = this.clamp(transform.initialWidth + dx, 40, 320);
          config.height = this.clamp(transform.initialHeight + dy, 40, 320);
        }

        question.imageConfig = config;
        questions[questionIndex] = question;
        return { ...survey, questions };
      });
    }
  }

  @HostListener('document:mouseup')
  onMouseUp(): void {
    if (!this.activeTransform) {
      return;
    }

    this.activeTransform = null;
    this.queueSave();
  }

  @HostListener('window:paste', ['$event'])
  onPaste(event: ClipboardEvent): void {
    const items = event.clipboardData?.items;
    if (!items) {
      return;
    }

    for (let index = 0; index < items.length; index++) {
      const item = items[index];
      if (!item.type.startsWith('image/')) {
        continue;
      }

      const file = item.getAsFile();
      if (!file) {
        return;
      }

      if (this.activeSection === 'welcome') {
        this.readImageFile(file, (imageUrl, width, height) => {
          this.addWelcomeImage(imageUrl, width, height);
        });
      } else if (this.activeSection === 'end') {
        this.readImageFile(file, (imageUrl, width, height) => {
          this.addEndImage(imageUrl, width, height);
        });
      } else if (this.activeSection === 'questions') {
        this.readImageFile(file, (imageUrl, width, height) => {
          this.attachQuestionImage(this.activeQuestionIndex, imageUrl, width, height);
        });
      }
      break;
    }
  }

  async initializeNewSurvey(): Promise<void> {
    this.isNew.set(true);
    const user = this.auth.user();
    if (!user) {
      return;
    }

    const created = await this.surveyService.createSurvey(user.id, 'Nueva Encuesta', '');
    if (!created) {
      this.saveError.set('No se pudo crear la encuesta.');
      return;
    }

    this.survey.set({
      ...created,
      metadata: this.ensureMetadata(created.metadata)
    });
    await this.router.navigate(['/editor', created.id], { replaceUrl: true });
  }

  async loadExistingSurvey(id: string): Promise<void> {
    const survey = await this.surveyService.getSurvey(id);
    const userId = this.auth.user()?.id;
    if (!survey || survey.userId !== userId) {
      await this.router.navigate(['/dashboard']);
      return;
    }

    this.survey.set({
      ...survey,
      metadata: this.ensureMetadata(survey.metadata)
    });
    this.loadCurrentFonts();
  }

  updateTitle(value: string): void {
    this.survey.update((survey) => survey ? { ...survey, title: value } : null);
    this.queueSave();
  }

  updateDescription(value: string): void {
    this.survey.update((survey) => survey ? { ...survey, description: value } : null);
    this.queueSave();
  }

  addQuestion(type: QuestionType): void {
    const survey = this.survey();
    if (!survey) {
      return;
    }

    const question: Question = {
      id: this.createLocalId('question'),
      type,
      text: '',
      required: true,
      options: type === 'multiple-choice'
        ? [
            { id: this.createLocalId('option'), texto: 'Opcion 1' },
            { id: this.createLocalId('option'), texto: 'Opcion 2' }
          ]
        : [],
      min: type === 'rating' || type === 'scale' ? 1 : undefined,
      max: type === 'rating' ? 10 : type === 'scale' ? 5 : undefined
    };

    this.survey.set({ ...survey, questions: [...survey.questions, question] });
    this.activeQuestionIndex = survey.questions.length;
    this.activeSection = 'questions';
    this.addQuestionPanel = false;
    this.queueSave();
  }

  changeQuestionType(index: number, type: QuestionType): void {
    this.survey.update((survey) => {
      if (!survey) {
        return survey;
      }

      const questions = [...survey.questions];
      const question = { ...questions[index] };
      question.type = type;

      if (type === 'multiple-choice' && question.options.length === 0) {
        question.options = [
          { id: this.createLocalId('option'), texto: 'Opcion 1' },
          { id: this.createLocalId('option'), texto: 'Opcion 2' }
        ];
      }

      if (type !== 'multiple-choice') {
        question.options = [];
      }

      if (type === 'rating') {
        question.min = 1;
        question.max = 10;
      } else if (type === 'scale') {
        question.min = 1;
        question.max = 5;
      } else {
        delete question.min;
        delete question.max;
      }

      questions[index] = question;
      return { ...survey, questions };
    });
    this.queueSave();
  }

  updateQuestionText(index: number, text: string): void {
    this.updateQuestion(index, { text });
  }

  toggleRequired(index: number): void {
    const question = this.survey()?.questions[index];
    if (!question) {
      return;
    }

    this.updateQuestion(index, { required: !question.required });
  }

  updateOption(questionIndex: number, optionIndex: number, value: string): void {
    this.survey.update((survey) => {
      if (!survey) {
        return survey;
      }

      const questions = [...survey.questions];
      const question = { ...questions[questionIndex], options: [...questions[questionIndex].options] };
      question.options[optionIndex] = { ...question.options[optionIndex], texto: value };
      questions[questionIndex] = question;
      return { ...survey, questions };
    });
    this.queueSave();
  }

  addOption(questionIndex: number): void {
    this.survey.update((survey) => {
      if (!survey) {
        return survey;
      }

      const questions = [...survey.questions];
      const question = { ...questions[questionIndex], options: [...questions[questionIndex].options] };
      question.options.push({ id: this.createLocalId('option'), texto: 'Nueva opcion' });
      questions[questionIndex] = question;
      return { ...survey, questions };
    });
    this.queueSave();
  }

  removeOption(questionIndex: number, optionIndex: number): void {
    this.survey.update((survey) => {
      if (!survey) {
        return survey;
      }

      const source = survey.questions[questionIndex];
      if (source.options.length <= 2) {
        return survey;
      }

      const questions = [...survey.questions];
      questions[questionIndex] = {
        ...source,
        options: source.options.filter((_, index) => index !== optionIndex)
      };
      return { ...survey, questions };
    });
    this.queueSave();
  }

  removeQuestion(index: number): void {
    this.survey.update((survey) => survey ? {
      ...survey,
      questions: survey.questions.filter((_, questionIndex) => questionIndex !== index)
    } : null);
    this.activeQuestionIndex = Math.max(0, this.activeQuestionIndex - (this.activeQuestionIndex >= index ? 1 : 0));
    this.queueSave();
  }

  duplicateQuestion(index: number): void {
    const survey = this.survey();
    if (!survey) {
      return;
    }

    const original = survey.questions[index];
    const clone: Question = {
      ...original,
      id: this.createLocalId('question'),
      text: original.text ? `${original.text} (copia)` : '',
      options: original.options.map((option) => ({
        ...option,
        id: this.createLocalId('option')
      }))
    };

    const questions = [...survey.questions];
    questions.splice(index + 1, 0, clone);
    this.survey.set({ ...survey, questions });
    this.activeQuestionIndex = index + 1;
    this.activeSection = 'questions';
    this.queueSave();
  }

  moveQuestion(index: number, direction: number): void {
    this.survey.update((survey) => {
      if (!survey) {
        return survey;
      }

      const target = index + direction;
      if (target < 0 || target >= survey.questions.length) {
        return survey;
      }

      const questions = [...survey.questions];
      [questions[index], questions[target]] = [questions[target], questions[index]];
      this.activeQuestionIndex = target;
      return { ...survey, questions };
    });
    this.queueSave();
  }

  applyPalette(palette: PalettePreset): void {
    this.patchBrand({
      primaryColor: palette.primaryColor,
      secondaryColor: palette.secondaryColor,
      backgroundColor: palette.backgroundColor,
      surfaceColor: palette.surfaceColor,
      textColor: palette.textColor
    });
  }

  updateBrandColor(field: keyof Pick<SurveyBrand, 'primaryColor' | 'secondaryColor' | 'backgroundColor' | 'surfaceColor' | 'textColor'>, value: string): void {
    this.patchBrand({ [field]: value } as Partial<SurveyBrand>);
  }

  setButtonStyle(style: NonNullable<SurveyBrand['buttonStyle']>): void {
    this.patchBrand({ buttonStyle: style });
  }

  updateButtonRadius(value: number): void {
    this.patchBrand({ buttonRadius: value });
  }

  updateCardRadius(value: number): void {
    this.patchBrand({ cardRadius: value });
  }

  updateButtonColor(value: string): void {
    this.patchBrand({ buttonColor: value });
  }

  updateButtonTextColor(value: string): void {
    this.patchBrand({ buttonTextColor: value });
  }

  updateFont(field: 'fontTitle' | 'fontBody' | 'fontButton', family: string): void {
    this.loadGoogleFont(family);
    this.patchBrand({ [field]: family } as Partial<SurveyBrand>);
  }

  currentFontTitle(): string {
    return this.brand().fontTitle || 'Inter';
  }

  currentFontBody(): string {
    return this.brand().fontBody || 'Inter';
  }

  currentFontButton(): string {
    return this.brand().fontButton || 'Inter';
  }

  currentButtonColor(): string {
    return this.brand().buttonColor || this.brand().primaryColor || '#7c3aed';
  }

  currentButtonTextColor(): string {
    return this.brand().buttonTextColor || '#ffffff';
  }
  loadGoogleFont(family: string): void {
    if (this.loadedFonts.has(family)) return;
    this.loadedFonts.add(family);
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = `https://fonts.googleapis.com/css2?family=${family.replace(/ /g, '+')}:wght@400;600;700;800&display=swap`;
    document.head.appendChild(link);
  }

  loadCurrentFonts(): void {
    this.loadGoogleFont(this.currentFontTitle());
    this.loadGoogleFont(this.currentFontBody());
    this.loadGoogleFont(this.currentFontButton());
  }

  readonly shadowPresets: { value: string; label: string }[] = [
    { value: 'none', label: 'Sin sombra' },
    { value: 'soft', label: 'Suave' },
    { value: 'medium', label: 'Media' },
    { value: 'strong', label: 'Fuerte' },
    { value: 'float', label: 'Flotante' }
  ];

  readonly animationPresets: { value: string; label: string }[] = [
    { value: 'none', label: 'Ninguna' },
    { value: 'fadeUp', label: 'Aparecer ↑' },
    { value: 'scaleIn', label: 'Escalar' },
    { value: 'slideLeft', label: 'Deslizar ←' }
  ];

  toggleGlass(): void {
    this.patchBrand({ glassEffect: !this.brand().glassEffect });
  }

  setShadowPreset(preset: SurveyBrand['shadowPreset']): void {
    this.patchBrand({ shadowPreset: preset });
  }

  toggleBorderGlow(): void {
    this.patchBrand({ borderGlow: !this.brand().borderGlow });
  }

  setEntryAnimation(animation: SurveyBrand['entryAnimation']): void {
    this.patchBrand({ entryAnimation: animation });
  }

  isGlassActive(): boolean {
    return this.brand().glassEffect === true;
  }

  isGlowActive(): boolean {
    return this.brand().borderGlow === true;
  }

  currentShadow(): string {
    return this.brand().shadowPreset || 'soft';
  }

  currentAnimation(): string {
    return this.brand().entryAnimation || 'none';
  }

  cardEffectClasses(): string {
    const brand = this.brand();
    const classes: string[] = [];
    if (brand.glassEffect) classes.push('effect-glass');
    if (brand.borderGlow) classes.push('effect-glow');
    if (brand.shadowPreset && brand.shadowPreset !== 'soft') classes.push(`shadow-${brand.shadowPreset}`);
    if (brand.entryAnimation && brand.entryAnimation !== 'none') classes.push(`anim-${brand.entryAnimation}`);
    return classes.join(' ');
  }

  showContextMenu(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.contextMenuX = event.clientX;
    this.contextMenuY = event.clientY;
    this.contextMenuVisible = true;
  }

  hideContextMenu(): void {
    this.contextMenuVisible = false;
  }

  toggleSection(sectionId: string): void {
    this.collapsedSections[sectionId] = !this.collapsedSections[sectionId];
  }

  isSectionOpen(sectionId: string): boolean {
    return !this.collapsedSections[sectionId];
  }

  triggerFileInput(inputId: string): void {
    const input = document.getElementById(inputId) as HTMLInputElement;
    input?.click();
  }

  updateCtaText(value: string): void {
    this.survey.update((survey) => {
      if (!survey) return survey;
      const metadata = this.ensureMetadata(survey.metadata);
      return { ...survey, metadata: { ...metadata, ctaText: value } };
    });
    this.queueSave();
  }

  ctaText(): string {
    return this.survey()?.metadata?.ctaText || 'Comenzar encuesta';
  }

  readonly progressStyles: { value: string; label: string }[] = [
    { value: 'line', label: 'Barra' },
    { value: 'dots', label: 'Puntos' },
    { value: 'percentage', label: 'Porcentaje' }
  ];

  progressBarConfig(): { enabled: boolean; style: string; color: string } {
    const pb = this.brand().progressBar;
    return {
      enabled: pb?.enabled ?? true,
      style: pb?.style ?? 'line',
      color: pb?.color || this.brand().primaryColor || '#7c3aed'
    };
  }

  toggleProgressBar(): void {
    const current = this.progressBarConfig();
    this.patchBrand({ progressBar: { ...current, enabled: !current.enabled, style: current.style as 'line' | 'dots' | 'percentage' } });
  }

  setProgressStyle(style: string): void {
    const current = this.progressBarConfig();
    this.patchBrand({ progressBar: { ...current, style: style as 'line' | 'dots' | 'percentage' } });
  }

  progressPercent(): number {
    const total = this.survey()?.questions.length || 1;
    return Math.round(((this.activeQuestionIndex + 1) / total) * 100);
  }

  questionNavLabel(): string {
    const total = this.survey()?.questions.length || 1;
    return `${this.activeQuestionIndex + 1} de ${total}`;
  }

  updateLogoSize(value: number): void {
    this.survey.update((survey) => {
      if (!survey) {
        return survey;
      }

      const metadata = this.ensureMetadata(survey.metadata);
      const brand = this.ensureBrand(metadata.brand);
      const logoConfig = { ...(brand.logoConfig ?? this.defaultLogoConfig()), width: value, height: Math.max(40, Math.round(value * 0.46)) };
      return {
        ...survey,
        metadata: {
          ...metadata,
          brand: {
            ...brand,
            logoConfig
          }
        }
      };
    });
    this.queueSave();
  }

  async onLogoSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }

    this.readImageFile(file, (imageUrl, width, height) => {
      this.survey.update((survey) => {
        if (!survey) {
          return survey;
        }

        const metadata = this.ensureMetadata(survey.metadata);
        const brand = this.ensureBrand(metadata.brand);
        brand.logoUrl = imageUrl;
        brand.logoConfig = {
          ...(brand.logoConfig ?? this.defaultLogoConfig()),
          width: Math.min(Math.max(width, 90), 220),
          height: Math.min(Math.max(height, 48), 140)
        };
        return { ...survey, metadata: { ...metadata, brand } };
      });
      this.queueSave();
    });

    input.value = '';
  }

  removeLogo(): void {
    this.patchBrand({ logoUrl: undefined });
  }

  async onWelcomeImageSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }

    this.readImageFile(file, (imageUrl, width, height) => {
      this.addWelcomeImage(imageUrl, width, height);
    });

    input.value = '';
  }

  removeWelcomeImage(index: number): void {
    this.survey.update((survey) => {
      if (!survey) {
        return survey;
      }

      const metadata = this.ensureMetadata(survey.metadata);
      return {
        ...survey,
        metadata: {
          ...metadata,
          welcomeImages: (metadata.welcomeImages ?? []).filter((_, imageIndex) => imageIndex !== index)
        }
      };
    });
    this.queueSave();
  }

  updateEndTitle(value: string): void {
    this.survey.update((survey) => {
      if (!survey) {
        return survey;
      }

      const metadata = this.ensureMetadata(survey.metadata);
      return { ...survey, metadata: { ...metadata, endTitle: value } };
    });
    this.queueSave();
  }

  updateEndDescription(value: string): void {
    this.survey.update((survey) => {
      if (!survey) {
        return survey;
      }

      const metadata = this.ensureMetadata(survey.metadata);
      return { ...survey, metadata: { ...metadata, endDescription: value } };
    });
    this.queueSave();
  }

  async onEndImageSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }

    this.readImageFile(file, (imageUrl, width, height) => {
      this.addEndImage(imageUrl, width, height);
    });

    input.value = '';
  }

  removeEndImage(index: number): void {
    this.survey.update((survey) => {
      if (!survey) {
        return survey;
      }

      const metadata = this.ensureMetadata(survey.metadata);
      return {
        ...survey,
        metadata: {
          ...metadata,
          endImages: (metadata.endImages ?? []).filter((_, imageIndex) => imageIndex !== index)
        }
      };
    });
    this.queueSave();
  }

  async onQuestionImageSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }

    this.readImageFile(file, (imageUrl, width, height) => {
      this.attachQuestionImage(this.activeQuestionIndex, imageUrl, width, height);
    });

    input.value = '';
  }

  removeQuestionImage(index: number): void {
    this.survey.update((survey) => {
      if (!survey) {
        return survey;
      }

      const questions = [...survey.questions];
      const question = { ...questions[index] };
      delete question.imageUrl;
      delete question.imageConfig;
      questions[index] = question;
      return { ...survey, questions };
    });
    this.queueSave();
  }

  startLogoTransform(mode: TransformMode, event: MouseEvent): void {
    const config = this.brandLogoConfig();
    if (!config) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    this.activeTransform = {
      kind: 'logo',
      mode,
      startX: event.clientX,
      startY: event.clientY,
      initialX: config.x,
      initialY: config.y,
      initialWidth: config.width,
      initialHeight: config.height
    };
  }

  startWelcomeImageTransform(index: number, mode: TransformMode, event: MouseEvent): void {
    const item = this.welcomeImages()[index];
    if (!item) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    this.activeTransform = {
      kind: 'welcome-image',
      index,
      mode,
      startX: event.clientX,
      startY: event.clientY,
      initialX: item.config.x,
      initialY: item.config.y,
      initialWidth: item.config.width,
      initialHeight: item.config.height
    };
  }

  startEndImageTransform(index: number, mode: TransformMode, event: MouseEvent): void {
    const item = this.endImages()[index];
    if (!item) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    this.activeTransform = {
      kind: 'end-image',
      index,
      mode,
      startX: event.clientX,
      startY: event.clientY,
      initialX: item.config.x,
      initialY: item.config.y,
      initialWidth: item.config.width,
      initialHeight: item.config.height
    };
  }

  startQuestionImageTransform(index: number, mode: TransformMode, event: MouseEvent): void {
    const question = this.survey()?.questions[index];
    if (!question?.imageConfig) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    this.activeTransform = {
      kind: 'question-image',
      index,
      mode,
      startX: event.clientX,
      startY: event.clientY,
      initialX: question.imageConfig.x,
      initialY: question.imageConfig.y,
      initialWidth: question.imageConfig.width,
      initialHeight: question.imageConfig.height
    };
  }

  async publish(): Promise<void> {
    const survey = this.survey();
    if (!survey || this.isSaving()) {
      return;
    }

    const validationError = this.validateBeforePublish(survey);
    if (validationError) {
      this.saveError.set(validationError);
      return;
    }

    this.isSaving.set(true);
    this.saveError.set(null);

    try {
      const savedSurvey = await this.surveyService.saveSurvey(this.normalizeSurvey({ ...survey, status: 'activo' }));
      if (!savedSurvey) {
        throw new Error('No se pudo publicar la encuesta.');
      }

      this.survey.set(savedSurvey);
      this.currentTab = 'collect';
      this.pulseSavedState();
      this.infoMessage.set('Encuesta publicada correctamente.');
    } catch (error) {
      console.error('Error publishing survey:', error);
      this.saveError.set('No se pudo publicar la encuesta.');
    } finally {
      this.isSaving.set(false);
    }
  }

  copyShareLink(): void {
    const survey = this.survey();
    if (!survey) {
      return;
    }

    if (survey.status !== 'activo') {
      this.saveError.set('Publica la encuesta antes de compartirla.');
      return;
    }

    navigator.clipboard.writeText(this.getShareLink());
    this.copied.set(true);
    this.infoMessage.set('Enlace copiado al portapapeles.');
    setTimeout(() => this.copied.set(false), 1800);
  }

  saveNow(): void {
    void this.executeSave();
  }

  async executeSave(): Promise<void> {
    const survey = this.survey();
    if (!survey || this.isSaving()) {
      this.pendingSave = true;
      return;
    }

    this.pendingSave = false;
    this.isSaving.set(true);
    this.saveError.set(null);

    try {
      const savedSurvey = await this.surveyService.saveSurvey(this.normalizeSurvey(survey));
      if (savedSurvey) {
        this.survey.set(savedSurvey);
        this.pulseSavedState();
      }
    } catch (error) {
      console.error('Error saving survey:', error);
      this.saveError.set('No se pudieron guardar los cambios.');
    } finally {
      this.isSaving.set(false);
      if (this.pendingSave) {
        this.pendingSave = false;
        this.queueSave();
      }
    }
  }

  queueSave(): void {
    this.saveSubject.next();
  }

  setCurrentTab(tab: EditorTab): void {
    this.currentTab = tab;
    this.preview.set(tab === 'preview');
  }

  goToAnalytics(): void {
    const survey = this.survey();
    if (survey) {
      void this.router.navigate(['/analytics', survey.id]);
    }
  }

  getShareLink(): string {
    const survey = this.survey();
    return survey ? this.surveyService.getShareLink(survey.id) : '';
  }

  getQuestionCountLabel(): string {
    const count = this.survey()?.questions.length ?? 0;
    return `${count} pregunta${count === 1 ? '' : 's'}`;
  }

  currentQuestion(): Question | null {
    return this.survey()?.questions[this.activeQuestionIndex] ?? null;
  }

  welcomeImages(): DecoratedImage[] {
    return this.survey()?.metadata?.welcomeImages ?? [];
  }

  endImages(): DecoratedImage[] {
    return this.survey()?.metadata?.endImages ?? [];
  }

  endTitle(): string {
    return this.survey()?.metadata?.endTitle || 'Gracias por participar';
  }

  endDescription(): string {
    return this.survey()?.metadata?.endDescription || 'Tu respuesta ha sido registrada exitosamente.';
  }

  brand(): SurveyBrand {
    return this.ensureBrand(this.survey()?.metadata?.brand);
  }

  brandLogoConfig(): { x: number; y: number; width: number; height: number } {
    return this.brand().logoConfig ?? this.defaultLogoConfig();
  }

  isPaletteActive(palette: PalettePreset): boolean {
    const brand = this.brand();
    return brand.primaryColor === palette.primaryColor
      && brand.secondaryColor === palette.secondaryColor
      && brand.backgroundColor === palette.backgroundColor
      && brand.surfaceColor === palette.surfaceColor
      && brand.textColor === palette.textColor;
  }

  buttonRadius(): number {
    return this.brand().buttonRadius ?? 18;
  }

  cardRadius(): number {
    return this.brand().cardRadius ?? 24;
  }

  welcomeCardStyle(): Record<string, string> {
    const brand = this.brand();
    return {
      '--survey-primary': brand.primaryColor ?? '#7c3aed',
      '--survey-secondary': brand.secondaryColor ?? '#a78bfa',
      '--survey-bg': brand.backgroundColor ?? '#f0edf6',
      '--survey-surface': brand.surfaceColor ?? '#ffffff',
      '--survey-text': brand.textColor ?? '#1f2937',
      '--survey-button-radius': `${brand.buttonRadius ?? 18}px`,
      '--survey-card-radius': `${brand.cardRadius ?? 24}px`,
      '--survey-font-title': `'${brand.fontTitle || 'Inter'}', sans-serif`,
      '--survey-font-body': `'${brand.fontBody || 'Inter'}', sans-serif`,
      '--survey-font-button': `'${brand.fontButton || 'Inter'}', sans-serif`,
      '--survey-button-color': brand.buttonColor || brand.primaryColor || '#7c3aed',
      '--survey-button-text': brand.buttonTextColor || '#ffffff'
    };
  }

  responseThemeStyle(): Record<string, string> {
    const brand = this.brand();
    return {
      '--response-primary': brand.primaryColor ?? '#7c3aed',
      '--response-secondary': brand.secondaryColor ?? '#00c4cc',
      '--response-bg': brand.backgroundColor ?? '#16132b',
      '--response-surface': brand.surfaceColor ?? '#ffffff',
      '--response-text': brand.textColor ?? '#f8fafc',
      '--response-button-radius': `${brand.buttonRadius ?? 18}px`,
      '--response-card-radius': `${brand.cardRadius ?? 24}px`
    };
  }

  private ensureAuthenticated(): boolean {
    if (!this.auth.isLoggedIn()) {
      void this.router.navigate(['/']);
      return false;
    }

    return true;
  }

  private updateQuestion(index: number, patch: Partial<Question>): void {
    this.survey.update((survey) => {
      if (!survey) {
        return survey;
      }

      const questions = [...survey.questions];
      questions[index] = { ...questions[index], ...patch };
      return { ...survey, questions };
    });
    this.queueSave();
  }

  private patchBrand(patch: Partial<SurveyBrand>): void {
    this.survey.update((survey) => {
      if (!survey) {
        return survey;
      }

      const metadata = this.ensureMetadata(survey.metadata);
      const brand = this.ensureBrand(metadata.brand);
      return {
        ...survey,
        metadata: {
          ...metadata,
          brand: {
            ...brand,
            ...patch
          }
        }
      };
    });
    this.queueSave();
  }

  private addWelcomeImage(imageUrl: string, width: number, height: number): void {
    this.survey.update((survey) => {
      if (!survey) {
        return survey;
      }

      const metadata = this.ensureMetadata(survey.metadata);
      const welcomeImages = [...(metadata.welcomeImages ?? [])];
      welcomeImages.push({
        id: this.createLocalId('welcome-image'),
        imageUrl,
        config: {
          x: 40 + welcomeImages.length * 18,
          y: 40 + welcomeImages.length * 18,
          width: Math.min(Math.max(width, 80), 220),
          height: Math.min(Math.max(height, 80), 220),
          rotation: 0,
          zIndex: 5 + welcomeImages.length
        }
      });
      return { ...survey, metadata: { ...metadata, welcomeImages } };
    });
    this.queueSave();
  }

  private addEndImage(imageUrl: string, width: number, height: number): void {
    this.survey.update((survey) => {
      if (!survey) {
        return survey;
      }

      const metadata = this.ensureMetadata(survey.metadata);
      const endImages = [...(metadata.endImages ?? [])];
      endImages.push({
        id: this.createLocalId('end-image'),
        imageUrl,
        config: {
          x: 40 + endImages.length * 18,
          y: 40 + endImages.length * 18,
          width: Math.min(Math.max(width, 80), 220),
          height: Math.min(Math.max(height, 80), 220),
          rotation: 0,
          zIndex: 5 + endImages.length
        }
      });
      return { ...survey, metadata: { ...metadata, endImages } };
    });
    this.queueSave();
  }

  private attachQuestionImage(index: number, imageUrl: string, width: number, height: number): void {
    this.survey.update((survey) => {
      if (!survey) {
        return survey;
      }

      const questions = [...survey.questions];
      const question = { ...questions[index] };
      question.imageUrl = imageUrl;
      question.imageConfig = {
        x: 30,
        y: 20,
        width: Math.min(Math.max(width, 70), 200),
        height: Math.min(Math.max(height, 70), 200),
        rotation: 0,
        zIndex: 9
      };
      questions[index] = question;
      return { ...survey, questions };
    });
    this.queueSave();
  }

  private readImageFile(file: File, onLoad: (imageUrl: string, width: number, height: number) => void): void {
    const reader = new FileReader();
    reader.onload = () => {
      const image = new Image();
      image.onload = () => {
        const maxWidth = 1200;
        const scale = image.width > maxWidth ? maxWidth / image.width : 1;
        const width = Math.round(image.width * scale);
        const height = Math.round(image.height * scale);
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext('2d');
        context?.drawImage(image, 0, 0, width, height);
        onLoad(canvas.toDataURL('image/webp', 0.88), Math.min(width, 220), Math.min(height, 220));
      };
      image.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  }

  private ensureMetadata(metadata?: SurveyMetadata): SurveyMetadata {
    return {
      brand: this.ensureBrand(metadata?.brand),
      welcomeImages: metadata?.welcomeImages ?? [],
      endTitle: metadata?.endTitle ?? 'Gracias por participar',
      endDescription: metadata?.endDescription ?? 'Tu respuesta ha sido registrada exitosamente.',
      endImages: metadata?.endImages ?? []
    };
  }

  private ensureBrand(brand?: SurveyBrand): SurveyBrand {
    const logoConfig = {
      ...this.defaultLogoConfig(),
      ...(brand?.logoConfig ?? {})
    };

    return {
      primaryColor: '#7c3aed',
      secondaryColor: '#00c4cc',
      backgroundColor: '#f0edf6',
      surfaceColor: '#ffffff',
      textColor: '#1f2937',
      buttonStyle: 'rounded',
      buttonRadius: 18,
      cardRadius: 24,
      fontTitle: 'Inter',
      fontBody: 'Inter',
      fontButton: 'Inter',
      glassEffect: false,
      shadowPreset: 'soft',
      borderGlow: false,
      entryAnimation: 'none',
      progressBar: { enabled: true, style: 'line' },
      ...brand,
      logoConfig
    };
  }

  private defaultLogoConfig(): { x: number; y: number; width: number; height: number } {
    return { x: 36, y: 24, width: 120, height: 56 };
  }

  private normalizeSurvey(survey: Survey): Survey {
    return {
      ...survey,
      title: survey.title.trim() || 'Nueva Encuesta',
      description: survey.description.trim(),
      metadata: this.ensureMetadata(survey.metadata),
      questions: survey.questions.map((question, index) => ({
        ...question,
        id: question.id || this.createLocalId(`question-${index}`),
        text: question.text.trim(),
        options: question.type === 'multiple-choice'
          ? question.options
            .map((option, optionIndex) => ({
              ...option,
              id: option.id || this.createLocalId(`option-${index}-${optionIndex}`),
              texto: option.texto.trim()
            }))
            .filter((option) => option.texto.length > 0)
          : [],
        min: question.type === 'rating' || question.type === 'scale' ? 1 : undefined,
        max: question.type === 'rating' ? 10 : question.type === 'scale' ? 5 : undefined
      }))
    };
  }

  private validateBeforePublish(survey: Survey): string | null {
    if (!survey.title.trim()) {
      return 'Agrega un titulo antes de publicar.';
    }

    if (survey.questions.length === 0) {
      return 'Agrega al menos una pregunta antes de publicar.';
    }

    for (let index = 0; index < survey.questions.length; index++) {
      const question = survey.questions[index];
      if (!question.text.trim()) {
        return `La pregunta ${index + 1} no tiene enunciado.`;
      }

      if (question.type === 'multiple-choice') {
        const validOptions = question.options.filter((option) => option.texto.trim().length > 0);
        if (validOptions.length < 2) {
          return `La pregunta ${index + 1} necesita al menos dos opciones validas.`;
        }
      }
    }

    return null;
  }

  private pulseSavedState(): void {
    this.saved.set(true);
    setTimeout(() => this.saved.set(false), 2000);
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }

  private createLocalId(prefix: string): string {
    return `${prefix}-${crypto.randomUUID()}`;
  }
}
