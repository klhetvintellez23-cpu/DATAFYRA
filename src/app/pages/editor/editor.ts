import { CommonModule } from '@angular/common';
import { Component, HostListener, OnDestroy, OnInit, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subject } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { CanvasStageComponent } from '../../components/canvas-stage/canvas-stage';
import { SurveySimulatorComponent } from '../../components/survey-simulator/survey-simulator';
import {
  ConditionalRule,
  DecoratedImage,
  Question,
  QuestionValidation,
  QuestionType,
  Survey,
  SurveyBrand,
  SurveyMetadata,
  SurveyService
} from '../../services/survey.service';
import type { CanvasElement, CanvasScreen } from '../../services/survey.service';
import { AuthService } from '../../services/auth.service';

type EditorTab = 'design' | 'preview' | 'collect' | 'analyze';
type RightTab = 'content' | 'design';
type AssetKind = 'logo' | 'welcome-image' | 'end-image' | 'question-image' | 'welcome-title' | 'welcome-desc' | 'welcome-cta' | 'welcome-kicker' | 'welcome-meta';
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

interface PublishChecklistItem {
  label: string;
  ok: boolean;
  detail: string;
}

@Component({
  selector: 'app-editor',
  standalone: true,
  imports: [FormsModule, RouterLink, CommonModule, SurveySimulatorComponent, CanvasStageComponent],
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
  publishChecklist = signal<PublishChecklistItem[]>([]);
  showPublishChecklist = signal(false);

  activeSection = signal<'welcome' | 'questions' | 'end'>('welcome');
  activeQuestionIndex = signal(0);
  addQuestionPanel = false;

  // --- CANVAS STATE ---
  selectedElementIds = signal<string[]>([]);

  canvasData = computed(() => {
    return this.survey()?.metadata?.canvas;
  });

  currentScreen = computed(() => {
    const data = this.canvasData();
    if (!data || !data.screens || data.screens.length === 0) return null;

    const section = this.activeSection();
    const qIndex = this.activeQuestionIndex();

    const targetId = section === 'questions' ? `question-${qIndex}` : section;
    const screen = data.screens.find(s => s.id === targetId);

    // Fallback to help with state transitions or missing IDs
    return screen || data.screens[0];
  });

  currentElements = computed(() => {
    return this.currentScreen()?.elements || [];
  });

  selectedCanvasElements = computed(() => {
    const selected = new Set(this.selectedElementIds());
    return this.currentElements().filter((element) => selected.has(element.id));
  });

  layerElements = computed(() => {
    return [...this.currentElements()].sort((a, b) => b.zIndex - a.zIndex);
  });

  canUndo = computed(() => this.historyIndex > 0);
  canRedo = computed(() => this.historyIndex < this.historyStack.length - 1);

  onCanvasSelectionChange(ids: string[]) {
    this.selectedElementIds.set(ids);
  }



  // History Stack for Undo/Redo
  private historyStack: string[] = [];
  private historyIndex = -1;
  private isUndoingRedoing = false;
  private copiedElementStyles: Record<string, any> | null = null;

  // Customization Tabs (Canva Style)
  customTab: 'content' | 'palettes' | 'colors' | 'buttons' | 'typography' | 'effects' | 'media' = 'palettes';
  currentTab: EditorTab = 'design';
  designCanvasMode: 'functional' | 'free' = 'functional';

  previewDevice: 'desktop' | 'tablet' | 'mobile' = 'desktop';
  contextMenuVisible = false;
  contextMenuX = 0;
  contextMenuY = 0;
  collapsedSections: Record<string, boolean> = {};

  sidebarClass = () => this.currentTab === 'design' ? 'editor-sidebar-right custom-nav-active' : 'editor-sidebar-right';

  // Resizable sidebar logic
  isResizing = false;
  rightSidebarWidth = Number(localStorage.getItem('df_sidebar_width')) || 440;

  // Contextual Focus
  focusSettings(tab: 'content' | 'palettes' | 'colors' | 'buttons' | 'typography' | 'effects' | 'media', section?: 'welcome' | 'questions' | 'end', index?: number) {
    this.currentTab = 'design';
    this.customTab = tab;
    if (section) this.activeSection.set(section);
    if (index !== undefined) this.activeQuestionIndex.set(index);
  }


  startResizing(event: MouseEvent) {
    this.isResizing = true;
    event.preventDefault();
  }

  setPreviewDevice(device: 'desktop' | 'tablet' | 'mobile'): void {
    this.previewDevice = device;
  }

  showTemplateModal = false;

  // Floating Format Bar State
  selectionVisible = false;
  selectionPos = { x: 0, y: 0 };

  @HostListener('document:selectionchange')
  onSelectionChange() {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !selection.toString().trim()) {
      this.selectionVisible = false;
      return;
    }

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    // Check if selection is within our editable canvas
    const canvas = document.querySelector('.editor-canvas');
    if (canvas && canvas.contains(range.commonAncestorContainer)) {
      this.selectionPos = {
        x: rect.left + (rect.width / 2) - 100, // Center the 200px wide bar
        y: rect.top - 50 // Position above
      };
      this.selectionVisible = true;
    } else {
      this.selectionVisible = false;
    }
  }

  onFontChange(font: string) {
    if (!font) return;
    this.loadGoogleFont(font);
    document.execCommand('fontName', false, font);
    // Also update the global font if it's the whole element (optional, but keep simple for now)
  }

  execCommand(command: string) {
    document.execCommand(command, false);
  }

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
      icon: 'ph-star',
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
      icon: 'ph-users',
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
      icon: 'ph-ticket',
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
      icon: 'ph-books',
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
      icon: 'ph-first-aid',
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
      icon: 'ph-rocket',
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
      icon: 'ph-fork-knife',
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
      icon: 'ph-house',
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
      const updated = {
        ...survey,
        title: survey.title || tpl.name,
        questions,
        metadata: { ...metadata, brand, endTitle: tpl.endTitle, endDescription: 'Tus respuestas han sido registradas.' }
      };
      return this.normalizeSurvey(updated);
    });

    this.activeSection.set('welcome');
    this.activeQuestionIndex.set(0);
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
    { type: 'text', label: 'Texto corto', description: 'Respuesta breve' },
    { type: 'long-text', label: 'Texto largo', description: 'Respuesta detallada' },
    { type: 'multiple-choice', label: 'Seleccion unica', description: 'Una opcion a elegir' },
    { type: 'multi-select', label: 'Seleccion multiple', description: 'Varias opciones a elegir' },
    { type: 'scale', label: 'Escala 1-10', description: 'Nivel numerico' },
    { type: 'nps', label: 'NPS', description: 'Recomendacion 0 a 10' },
    { type: 'rating', label: 'Estrellas', description: 'Calificacion de 1 a 5' },
    { type: 'email', label: 'Email', description: 'Correo electronico' },
    { type: 'phone', label: 'Telefono', description: 'Numero de contacto' },
    { type: 'date', label: 'Fecha', description: 'Selector de fecha' },
    { type: 'time', label: 'Hora', description: 'Selector de hora' }
  ];

  readonly fontPresets: { family: string; category: string }[] = [
    { family: 'Inter', category: 'Sans' },
    { family: 'Poppins', category: 'Sans' },
    { family: 'Montserrat', category: 'Sans' },
    { family: 'Roboto', category: 'Sans' },
    { family: 'Lato', category: 'Sans' },
    { family: 'Open Sans', category: 'Sans' },
    { family: 'Nunito', category: 'Sans' },
    { family: 'Raleway', category: 'Sans' },
    { family: 'Playfair Display', category: 'Serif' },
    { family: 'Merriweather', category: 'Serif' },
    { family: 'Oswald', category: 'Display' },
    { family: 'Rubik', category: 'Sans' },
    { family: 'Work Sans', category: 'Sans' },
    { family: 'Quicksand', category: 'Sans' },
    { family: 'DM Sans', category: 'Sans' },
    { family: 'Manrope', category: 'Sans' },
    { family: 'Urbanist', category: 'Sans' },
    { family: 'Bebas Neue', category: 'Display' },
    { family: 'Archivo', category: 'Sans' },
    { family: 'Space Grotesk', category: 'Display' },
    { family: 'Plus Jakarta Sans', category: 'Sans' },
    { family: 'Outfit', category: 'Sans' },
    { family: 'Crimson Text', category: 'Serif' },
    { family: 'Lora', category: 'Serif' }
  ];

  readonly fontPairings = [
    { name: 'Moderno', title: 'Plus Jakarta Sans', body: 'Inter', description: 'Limpio y profesional' },
    { name: 'Elegante', title: 'Playfair Display', body: 'Lora', description: 'Refinado y clásico' },
    { name: 'Tech', title: 'Space Grotesk', body: 'Manrope', description: 'Futurista y geométrico' },
    { name: 'Suave', title: 'Outfit', body: 'Quicksand', description: 'Amigable y redondeado' },
    { name: 'Editorial', title: 'Oswald', body: 'Roboto', description: 'Impactante y estructurado' }
  ];

  selectedFontCategory: 'All' | 'Sans' | 'Serif' | 'Display' = 'All';

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
    // Initial history push
    setTimeout(() => this.pushToHistory(), 1000);
  }

  ngOnDestroy(): void {
    this.saveSubject.complete();
  }

  @HostListener('window:mousemove', ['$event'])
  onMouseMove(event: MouseEvent): void {
    if (this.isResizing) {
      const newWidth = window.innerWidth - event.clientX;
      if (newWidth > 300 && newWidth < (window.innerWidth * 0.7)) {
        this.rightSidebarWidth = newWidth;
        localStorage.setItem('df_sidebar_width', String(newWidth));
      }
      return;
    }

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

    if (['welcome-title', 'welcome-desc', 'welcome-cta', 'welcome-kicker', 'welcome-meta'].includes(transform.kind)) {
      this.survey.update((survey) => {
        if (!survey) return survey;
        const metadata = this.ensureMetadata(survey.metadata);

        let configKey: 'welcomeTitleConfig' | 'welcomeDescConfig' | 'welcomeCtaConfig' | 'welcomeKickerConfig' | 'welcomeMetaConfig';
        switch (transform.kind) {
          case 'welcome-title': configKey = 'welcomeTitleConfig'; break;
          case 'welcome-desc': configKey = 'welcomeDescConfig'; break;
          case 'welcome-cta': configKey = 'welcomeCtaConfig'; break;
          case 'welcome-kicker': configKey = 'welcomeKickerConfig'; break;
          case 'welcome-meta': configKey = 'welcomeMetaConfig'; break;
          default: return survey;
        }

        const config = { ...(metadata[configKey] ?? { x: 40, y: 150, width: 400, height: 100 }) };
        if (transform.mode === 'move') {
          config.x = transform.initialX + dx;
          config.y = transform.initialY + dy;
        } else {
          config.width = Math.max(transform.initialWidth + dx, 50);
          config.height = Math.max(transform.initialHeight + dy, 30);
        }

        metadata[configKey] = config;
        return { ...survey, metadata };
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

  @HostListener('window:mouseup')
  onMouseUp(): void {
    if (this.isResizing) {
      this.isResizing = false;
      return;
    }

    if (!this.activeTransform) {
      return;
    }

    this.activeTransform = null;
    this.pushToHistory(); // Save state after transform
    this.queueSave();
  }

  @HostListener('window:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      if (this.addQuestionPanel) {
        this.addQuestionPanel = false;
      }
      return;
    }

    // Undo: Ctrl + Z
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
      event.preventDefault();
      this.undo();
    }
    // Redo: Ctrl + Y or Ctrl + Shift + Z
    if ((event.ctrlKey || event.metaKey) && (event.key.toLowerCase() === 'y' || (event.shiftKey && event.key.toLowerCase() === 'z'))) {
      event.preventDefault();
      this.redo();
    }
    // Save: Ctrl + S
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
      event.preventDefault();
      this.saveNow();
    }
  }

  private pushToHistory() {
    if (this.isUndoingRedoing) return;
    const state = JSON.stringify(this.survey());

    // Only push if different from current head
    if (this.historyIndex >= 0 && this.historyStack[this.historyIndex] === state) return;

    // Remove any forward history if we're making a new change
    this.historyStack = this.historyStack.slice(0, this.historyIndex + 1);
    this.historyStack.push(state);

    // Limit history size to 50
    if (this.historyStack.length > 50) this.historyStack.shift();
    else this.historyIndex++;
  }

  undo() {
    if (this.historyIndex > 0) {
      this.historyIndex--;
      this.applyHistoryState(this.historyStack[this.historyIndex]);
    }
  }

  redo() {
    if (this.historyIndex < this.historyStack.length - 1) {
      this.historyIndex++;
      this.applyHistoryState(this.historyStack[this.historyIndex]);
    }
  }

  private applyHistoryState(stateJson: string) {
    this.isUndoingRedoing = true;
    try {
      const state = JSON.parse(stateJson);
      this.survey.set(state);
      this.queueSave();
    } finally {
      this.isUndoingRedoing = false;
    }
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

      if (this.activeSection() === 'welcome') {
        this.readImageFile(file, (imageUrl, width, height) => {
          this.addWelcomeImage(imageUrl, width, height);
        });
      } else if (this.activeSection() === 'end') {
        this.readImageFile(file, (imageUrl, width, height) => {
          this.addEndImage(imageUrl, width, height);
        });
      } else if (this.activeSection() === 'questions') {
        this.readImageFile(file, (imageUrl, width, height) => {
          this.attachQuestionImage(this.activeQuestionIndex(), imageUrl, width, height);
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
      options: this.isChoiceType(type)
        ? [
            { id: this.createLocalId('option'), texto: 'Opcion 1' },
            { id: this.createLocalId('option'), texto: 'Opcion 2' }
          ]
        : [],
      min: this.isScaleType(type) ? (type === 'nps' ? 0 : 1) : undefined,
      max: this.isScaleType(type) ? (type === 'rating' ? 5 : 10) : undefined
    };

    this.survey.set(this.normalizeSurvey({ ...survey, questions: [...survey.questions, question] }));
    this.activeQuestionIndex.set(survey.questions.length);
    this.activeSection.set('questions');
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

      if (this.isChoiceType(type) && question.options.length === 0) {
        question.options = [
          { id: this.createLocalId('option'), texto: 'Opcion 1' },
          { id: this.createLocalId('option'), texto: 'Opcion 2' }
        ];
      }

      if (!this.isChoiceType(type)) {
        question.options = [];
      }

      if (type === 'rating') {
        question.min = 1;
        question.max = 5;
      } else if (type === 'nps') {
        question.min = 0;
        question.max = 10;
      } else if (type === 'scale') {
        question.min = 1;
        question.max = 10;
      } else {
        delete question.min;
        delete question.max;
      }

      questions[index] = question;
      return this.normalizeSurvey({ ...survey, questions });
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

  updateQuestionValidation(index: number, patch: Partial<QuestionValidation>): void {
    const current = this.survey()?.questions[index]?.validation ?? {};
    const validation = this.cleanValidation({ ...current, ...patch });
    this.updateQuestion(index, { validation });
  }

  toggleRandomizeOptions(index: number): void {
    const question = this.survey()?.questions[index];
    if (!question) return;
    this.updateQuestion(index, { randomizeOptions: !question.randomizeOptions });
  }

  updateQuestionLogic(index: number, patch: Partial<ConditionalRule>): void {
    const question = this.survey()?.questions[index];
    if (!question) return;
    const current = question.logic?.[0] ?? {};
    const next = { ...current, ...patch };
    this.updateQuestion(index, { logic: next.goTo ? [next] : [] });
  }

  clearQuestionLogic(index: number): void {
    this.updateQuestion(index, { logic: [] });
  }

  logicAnswerValue(question: Question): string {
    const rule = question.logic?.[0];
    const value = rule?.answerIncludes ?? rule?.answerEquals;
    return typeof value === 'string' ? value : '';
  }

  logicTargetValue(question: Question): string {
    return question.logic?.[0]?.goTo ?? '';
  }

  logicTargetQuestions(currentIndex: number): Question[] {
    return this.survey()?.questions.filter((_, index) => index > currentIndex) ?? [];
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
    this.survey.update((survey) => survey
      ? this.normalizeSurvey({
        ...survey,
        questions: survey.questions.filter((_, questionIndex) => questionIndex !== index)
      })
      : null);
    this.activeQuestionIndex.update(idx => Math.max(0, idx - (idx >= index ? 1 : 0)));
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
    this.survey.set(this.normalizeSurvey({ ...survey, questions }));
    this.activeQuestionIndex.set(index + 1);
    this.activeSection.set('questions');
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
      this.activeQuestionIndex.set(target);
      return this.normalizeSurvey({ ...survey, questions });
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

  applyFontPairing(pairing: { title: string, body: string }) {
    this.updateFont('fontTitle', pairing.title);
    this.updateFont('fontBody', pairing.body);
    this.updateFont('fontButton', pairing.body);
  }

  filteredFonts() {
    if (this.selectedFontCategory === 'All') return this.fontPresets;
    return this.fontPresets.filter(f => f.category === this.selectedFontCategory);
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
    { value: 'fadeUp', label: 'Aparecer' },
    { value: 'scaleIn', label: 'Escalar' },
    { value: 'slideLeft', label: 'Deslizar' }
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

  paginationMode(): NonNullable<SurveyMetadata['paginationMode']> {
    return this.survey()?.metadata?.paginationMode ?? 'one-by-one';
  }

  questionsPerPage(): number {
    return this.survey()?.metadata?.questionsPerPage ?? 3;
  }

  updatePaginationMode(mode: NonNullable<SurveyMetadata['paginationMode']>): void {
    this.survey.update((survey) => {
      if (!survey) return survey;
      const metadata = this.ensureMetadata(survey.metadata);
      return {
        ...survey,
        metadata: {
          ...metadata,
          paginationMode: mode,
          questionsPerPage: mode === 'paged' ? this.questionsPerPage() : metadata.questionsPerPage
        }
      };
    });
    this.queueSave();
  }

  updateQuestionsPerPage(value: number | string): void {
    const parsed = Number(value);
    const questionsPerPage = Math.max(2, Math.min(50, Number.isFinite(parsed) ? Math.round(parsed) : 3));
    this.survey.update((survey) => {
      if (!survey) return survey;
      const metadata = this.ensureMetadata(survey.metadata);
      return {
        ...survey,
        metadata: {
          ...metadata,
          paginationMode: 'paged',
          questionsPerPage
        }
      };
    });
    this.queueSave();
  }

  progressMode(): NonNullable<SurveyMetadata['progressMode']> {
    return this.survey()?.metadata?.progressMode ?? 'percentage';
  }

  updateProgressMode(mode: NonNullable<SurveyMetadata['progressMode']>): void {
    this.survey.update((survey) => {
      if (!survey) return survey;
      const metadata = this.ensureMetadata(survey.metadata);
      return { ...survey, metadata: { ...metadata, progressMode: mode } };
    });
    this.queueSave();
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
    return Math.round(((this.activeQuestionIndex() + 1) / total) * 100);
  }

  questionNavLabel(): string {
    const total = this.survey()?.questions.length || 1;
    return `${this.activeQuestionIndex() + 1} de ${total}`;
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
      this.attachQuestionImage(this.activeQuestionIndex(), imageUrl, width, height);
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

    const checklist = this.getPublishChecklist(survey);
    this.publishChecklist.set(checklist);

    const validationError = checklist.find((item) => !item.ok)?.detail ?? null;
    if (validationError) {
      this.saveError.set(validationError);
      this.showPublishChecklist.set(true);
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
      this.showPublishChecklist.set(false);
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
    this.pushToHistory();
    this.saveSubject.next();
  }

  setCurrentTab(tab: EditorTab): void {
    this.currentTab = tab;
    this.preview.set(tab === 'preview');
  }

  closePublishChecklist(): void {
    this.showPublishChecklist.set(false);
  }

  setDesignCanvasMode(mode: 'functional' | 'free'): void {
    this.designCanvasMode = mode;
    this.selectedElementIds.set([]);
  }

  applyFunctionalDesignToCurrentFreeScreen(): void {
    this.resetCurrentFreeLayout();
  }

  resetCurrentFreeLayout(): void {
    this.survey.update((survey) => {
      if (!survey) return survey;
      const normalized = this.normalizeSurvey({
        ...survey,
        metadata: {
          ...this.ensureMetadata(survey.metadata),
          canvas: {
            screens: (survey.metadata?.canvas?.screens ?? []).filter((screen) => {
              const target = this.activeSection() === 'questions' ? `question-${this.activeQuestionIndex()}` : this.activeSection();
              return screen.id !== target;
            })
          }
        }
      });
      return normalized;
    });
    this.selectedElementIds.set([]);
    this.queueSave();
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

  currentQuestion = computed(() => {
    const survey = this.survey();
    const index = this.activeQuestionIndex();
    return survey?.questions[index] ?? null;
  });

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

  elementStyle(kind: AssetKind, index?: number): Record<string, string> {
    const survey = this.survey();
    if (!survey) return {};
    const metadata = this.ensureMetadata(survey.metadata);

    let config: { x: number; y: number; width?: number; height?: number } | undefined;

    switch (kind) {
      case 'logo': config = metadata.brand?.logoConfig; break;
      case 'welcome-image': config = metadata.welcomeImages?.[index ?? 0]?.config; break;
      case 'welcome-title': config = metadata.welcomeTitleConfig; break;
      case 'welcome-desc': config = metadata.welcomeDescConfig; break;
      case 'welcome-cta': config = metadata.welcomeCtaConfig; break;
      case 'welcome-kicker': config = metadata.welcomeKickerConfig; break;
      case 'welcome-meta': config = metadata.welcomeMetaConfig; break;
    }

    if (!config) return {};

    return {
      'position': 'absolute',
      'left': `${config.x}px`,
      'top': `${config.y}px`,
      'width': config.width ? `${config.width}px` : 'auto',
      'height': config.height ? `${config.height}px` : 'auto',
      'z-index': kind.includes('image') ? '5' : '10'
    };
  }

  startTransform(event: MouseEvent, kind: AssetKind, mode: TransformMode, index?: number): void {
    event.preventDefault();
    event.stopPropagation();

    const survey = this.survey();
    if (!survey) return;
    const metadata = this.ensureMetadata(survey.metadata);

    let config: { x: number; y: number; width: number; height: number } | undefined;

    switch (kind) {
      case 'logo': config = metadata.brand?.logoConfig ?? this.defaultLogoConfig(); break;
      case 'welcome-image': config = metadata.welcomeImages?.[index ?? 0]?.config; break;
      case 'welcome-title': config = metadata.welcomeTitleConfig ?? { x: 44, y: 180, width: 500, height: 100 }; break;
      case 'welcome-desc': config = metadata.welcomeDescConfig ?? { x: 44, y: 280, width: 450, height: 80 }; break;
      case 'welcome-cta': config = metadata.welcomeCtaConfig ?? { x: 44, y: 400, width: 220, height: 60 }; break;
      case 'welcome-kicker': config = metadata.welcomeKickerConfig ?? { x: 44, y: 140, width: 200, height: 30 }; break;
      case 'welcome-meta': config = metadata.welcomeMetaConfig ?? { x: 44, y: 480, width: 300, height: 40 }; break;
    }

    if (!config) return;

    this.activeTransform = {
      kind,
      index,
      mode,
      startX: event.clientX,
      startY: event.clientY,
      initialX: config.x,
      initialY: config.y,
      initialWidth: config.width,
      initialHeight: config.height
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
      const updatedMetadata = {
        ...metadata,
        brand: { ...brand, ...patch }
      };

      // Recalculate canvas screens with new brand colors
      return this.normalizeSurvey({ ...survey, metadata: updatedMetadata });
    });
    this.queueSave();
  }

  updateCanvasElement(event: { id: string; changes: Partial<CanvasElement> }): void {
    this.survey.update((survey) => {
      if (!survey || !survey.metadata?.canvas) return survey;

      const canvas = { ...survey.metadata.canvas };
      const section = this.activeSection();
      const qIndex = this.activeQuestionIndex();
      const targetId = section === 'questions' ? `question-${qIndex}` : section;

      const screenIndex = canvas.screens.findIndex(s => s.id === targetId);
      if (screenIndex === -1) return survey;

      const screen = { ...canvas.screens[screenIndex] };
      const elements = [...screen.elements];
      const elIndex = elements.findIndex(e => e.id === event.id);

      if (elIndex === -1) return survey;

      const existing = elements[elIndex];
      elements[elIndex] = {
        ...existing,
        ...event.changes,
        styles: {
          ...existing.styles,
          ...(event.changes.styles ?? {}),
          __freeEdited: true
        }
      };
      screen.elements = elements;
      canvas.screens[screenIndex] = screen;

      return {
        ...survey,
        metadata: {
          ...survey.metadata,
          canvas
        }
      };
    });
    this.queueSave();
  }

  selectLayerElement(id: string): void {
    this.selectedElementIds.set([id]);
  }

  alignSelected(direction: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom'): void {
    const elements = this.selectedCanvasElements();
    if (elements.length === 0) return;

    const updates: Record<string, Partial<CanvasElement>> = {};
    for (const element of elements) {
      if (element.locked) continue;
      if (direction === 'left') updates[element.id] = { x: 40 };
      if (direction === 'center') updates[element.id] = { x: Math.round((1000 - element.width) / 2) };
      if (direction === 'right') updates[element.id] = { x: Math.round(1000 - element.width - 40) };
      if (direction === 'top') updates[element.id] = { y: 40 };
      if (direction === 'middle') updates[element.id] = { y: Math.round((600 - element.height) / 2) };
      if (direction === 'bottom') updates[element.id] = { y: Math.round(600 - element.height - 40) };
    }

    this.patchCurrentScreenElements(updates);
  }

  bringSelectedForward(): void {
    this.adjustSelectedZIndex(1);
  }

  sendSelectedBackward(): void {
    this.adjustSelectedZIndex(-1);
  }

  duplicateSelectedElements(): void {
    const selected = this.selectedCanvasElements();
    if (selected.length === 0) return;

    const clones = selected.map((element, index) => ({
      ...element,
      id: this.createLocalId(`${element.id}-copy`),
      x: element.x + 24 + index * 8,
      y: element.y + 24 + index * 8,
      locked: false,
      zIndex: element.zIndex + 10 + index
    }));

    this.survey.update((survey) => this.updateCurrentScreen(survey, (screen) => ({
      ...screen,
      elements: [...screen.elements, ...clones].sort((a, b) => a.zIndex - b.zIndex)
    })));
    this.selectedElementIds.set(clones.map((element) => element.id));
    this.queueSave();
  }

  toggleSelectedLock(): void {
    const selectedIds = this.selectedElementIds();
    if (selectedIds.length === 0) return;
    const selected = this.selectedCanvasElements();
    const shouldLock = selected.some((element) => !element.locked);
    this.patchCurrentScreenElements(Object.fromEntries(selectedIds.map((id) => [id, { locked: shouldLock }])));
  }

  deleteSelectedElements(): void {
    const selectedIds = new Set(this.selectedElementIds());
    if (selectedIds.size === 0) return;

    this.survey.update((survey) => this.updateCurrentScreen(survey, (screen) => ({
      ...screen,
      elements: screen.elements.filter((element) => element.locked || !selectedIds.has(element.id))
    })));
    this.selectedElementIds.set([]);
    this.queueSave();
  }

  copySelectedStyle(): void {
    const element = this.selectedCanvasElements()[0];
    if (!element) return;
    this.copiedElementStyles = { ...element.styles };
    this.infoMessage.set('Estilo copiado.');
  }

  pasteSelectedStyle(): void {
    if (!this.copiedElementStyles) return;
    const updates = Object.fromEntries(
      this.selectedCanvasElements()
        .filter((element) => !element.locked)
        .map((element) => [element.id, { styles: { ...element.styles, ...this.copiedElementStyles } }])
    );
    this.patchCurrentScreenElements(updates);
  }

  private adjustSelectedZIndex(delta: number): void {
    const updates = Object.fromEntries(
      this.selectedCanvasElements()
        .filter((element) => !element.locked)
        .map((element) => [element.id, { zIndex: Math.max(0, element.zIndex + delta) }])
    );
    this.patchCurrentScreenElements(updates);
  }

  private patchCurrentScreenElements(updates: Record<string, Partial<CanvasElement>>): void {
    if (Object.keys(updates).length === 0) return;

    this.survey.update((survey) => this.updateCurrentScreen(survey, (screen) => ({
      ...screen,
      elements: screen.elements
        .map((element) => updates[element.id] ? { ...element, ...updates[element.id] } : element)
        .sort((a, b) => a.zIndex - b.zIndex)
    })));
    this.queueSave();
  }

  private updateCurrentScreen(survey: Survey | null, updater: (screen: CanvasScreen) => CanvasScreen): Survey | null {
    if (!survey || !survey.metadata?.canvas) return survey;

    const section = this.activeSection();
    const qIndex = this.activeQuestionIndex();
    const targetId = section === 'questions' ? `question-${qIndex}` : section;
    const canvas = { ...survey.metadata.canvas };
    const screenIndex = canvas.screens.findIndex((screen) => screen.id === targetId);
    if (screenIndex === -1) return survey;

    const screens = [...canvas.screens];
    screens[screenIndex] = updater({ ...screens[screenIndex], elements: [...screens[screenIndex].elements] });

    return {
      ...survey,
      metadata: {
        ...survey.metadata,
        canvas: {
          ...canvas,
          screens
        }
      }
    };
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
    // If it's a GIF, we preserve it to keep the animation
    if (file.type === 'image/gif') {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => onLoad(reader.result as string, img.width, img.height);
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
      return;
    }

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
      canvas: metadata?.canvas,
      brand: this.ensureBrand(metadata?.brand),
      welcomeImages: metadata?.welcomeImages ?? [],
      endTitle: metadata?.endTitle ?? 'Gracias por participar',
      endDescription: metadata?.endDescription ?? 'Tu respuesta ha sido registrada exitosamente.',
      endImages: metadata?.endImages ?? [],
      welcomeTitleConfig: metadata?.welcomeTitleConfig,
      welcomeDescConfig: metadata?.welcomeDescConfig,
      welcomeCtaConfig: metadata?.welcomeCtaConfig,
      welcomeKickerConfig: metadata?.welcomeKickerConfig,
      welcomeMetaConfig: metadata?.welcomeMetaConfig,
      ctaText: metadata?.ctaText ?? 'Comenzar encuesta',
      paginationMode: metadata?.paginationMode ?? 'one-by-one',
      questionsPerPage: metadata?.questionsPerPage ?? 3,
      progressMode: metadata?.progressMode ?? 'percentage',
      theme: metadata?.theme,
      thankYouTitle: metadata?.thankYouTitle,
      thankYouDescription: metadata?.thankYouDescription
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
    let normalized = {
      ...survey,
      title: survey.title.trim() || 'Nueva Encuesta',
      description: survey.description.trim(),
      questions: survey.questions.map((question, index) => ({
        ...question,
        id: question.id || this.createLocalId(`question-${index}`),
        text: question.text.trim(),
        options: this.isChoiceType(question.type)
          ? question.options
            .map((option, optionIndex) => ({
              ...option,
              id: option.id || this.createLocalId(`option-${index}-${optionIndex}`),
              texto: option.texto.trim()
            }))
            .filter((option) => option.texto.length > 0)
          : [],
        min: this.isScaleType(question.type) ? (question.type === 'nps' ? 0 : 1) : undefined,
        max: this.isScaleType(question.type) ? (question.type === 'rating' ? 5 : 10) : undefined,
        validation: this.cleanValidation(question.validation),
        logic: question.logic?.filter((rule) => rule.goTo) ?? [],
        randomizeOptions: this.isChoiceType(question.type) ? question.randomizeOptions ?? false : false
      }))
    };

    normalized.metadata = this.ensureCanvasScreens(this.ensureMetadata(normalized.metadata), normalized);

    return normalized;
  }

  private isChoiceType(type: QuestionType): boolean {
    return type === 'multiple-choice' || type === 'multi-select';
  }

  private isScaleType(type: QuestionType): boolean {
    return type === 'rating' || type === 'scale' || type === 'nps';
  }

  private ensureCanvasScreens(metadata: SurveyMetadata, survey: Survey): SurveyMetadata {
    if (!metadata.canvas) {
      metadata.canvas = { screens: [] };
    }

    const canvas = metadata.canvas!;
    const freeLayoutVersion = 3;
    if (canvas.layoutVersion !== freeLayoutVersion) {
      canvas.screens = [];
      canvas.layoutVersion = freeLayoutVersion;
    }

    const brand = this.ensureBrand(metadata.brand);
    const primaryColor = brand.primaryColor || '#7c3aed';
    const secondaryColor = brand.secondaryColor || '#06b6d4';
    const textColor = brand.textColor || '#111827';
    const bg = brand.backgroundColor || '#f4f0ff';
    const surfaceColor = brand.surfaceColor || '#ffffff';
    const cardRadius = `${brand.cardRadius ?? 24}px`;
    const shadow = this.canvasShadow(brand.shadowPreset);
    const validQuestionScreenIds = new Set(survey.questions.map((_, index) => `question-${index}`));
    canvas.screens = canvas.screens.filter((screen) => screen.type !== 'question' || validQuestionScreenIds.has(screen.id));

    // Welcome Screen - Sync with brand
    let welcomeScreen = canvas.screens.find(s => s.id === 'welcome');
    if (!welcomeScreen) {
      welcomeScreen = {
        id: 'welcome',
        type: 'welcome',
        background: { type: 'gradient', value: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` },
        elements: []
      };
      canvas.screens.push(welcomeScreen);
    } else {
      // Force sync background with brand for consistency
      welcomeScreen.background = { type: 'gradient', value: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` };
    }

    welcomeScreen.elements = this.mergeCanvasElements(
      welcomeScreen.elements,
      this.createWelcomeCanvasElements(
        survey,
        metadata,
        { primaryColor, secondaryColor, textColor, surfaceColor, cardRadius, shadow }
      )
    );

    if (welcomeScreen.elements.length === 0) {
      welcomeScreen.elements = [
        {
          id: 'welcome-kicker',
          type: 'text',
          content: 'VISTA PREVIA PÚBLICA',
          x: 60, y: 80, width: 300, height: 30,
          rotation: 0, zIndex: 10, locked: false, hidden: false,
          styles: { fontSize: '12px', fontWeight: '800', color: '#ffffff', letterSpacing: '0.1em', opacity: '0.8' }
        },
        {
          id: 'welcome-title',
          type: 'text',
          content: survey.title || 'Nueva Encuesta',
          x: 60, y: 120, width: 880, height: 100,
          rotation: 0, zIndex: 10, locked: false, hidden: false,
          styles: { fontSize: '56px', fontWeight: '850', color: '#ffffff', lineHeight: '1.1' }
        },
        {
          id: 'welcome-desc',
          type: 'text',
          content: survey.description || 'Descripción de tu encuesta',
          x: 60, y: 240, width: 700, height: 60,
          rotation: 0, zIndex: 10, locked: false, hidden: false,
          styles: { fontSize: '20px', fontWeight: '400', color: '#ffffff', opacity: '0.9' }
        },
        {
          id: 'welcome-cta',
          type: 'button',
          content: 'Comenzar encuesta',
          x: 60, y: 340, width: 220, height: 56,
          rotation: 0, zIndex: 10, locked: false, hidden: false,
          styles: { backgroundColor: '#ffffff', color: primaryColor, borderRadius: '18px', fontWeight: '800' }
        }
      ];
    }

    // Question Screens - Sync with brand
    survey.questions.forEach((q, i) => {
      const screenId = `question-${i}`;
      let qScreen = canvas.screens.find(s => s.id === screenId);
      if (!qScreen) {
        qScreen = {
          id: screenId,
          type: 'question',
          background: { type: 'solid', value: bg },
          elements: []
        };
        canvas.screens.push(qScreen);
      } else {
        qScreen.background = { type: 'solid', value: bg };
      }

      qScreen.elements = this.mergeCanvasElements(
        qScreen.elements,
        this.createQuestionCanvasElements(q, i, { primaryColor, secondaryColor, textColor, surfaceColor, bg, cardRadius, shadow })
      );

      // Question Card/Background
      if (!qScreen.elements.find(e => e.id === `q-${i}-card`)) {
        qScreen.elements.unshift({
          id: `q-${i}-card`,
          type: 'shape',
          content: '',
          x: 30, y: 40, width: 940, height: 520,
          rotation: 0, zIndex: 1, locked: true, hidden: false,
          styles: { backgroundColor: surfaceColor, borderRadius: '24px', boxShadow: '0 10px 40px rgba(0,0,0,0.05)' }
        });
      }

      if (qScreen.elements.length <= 1) { // Only card exists
        qScreen.elements.push(
          {
            id: `q-${i}-kicker`,
            type: 'text',
            content: `PREGUNTA ${i + 1}`,
            x: 70, y: 80, width: 200, height: 30,
            rotation: 0, zIndex: 10, locked: false, hidden: false,
            styles: { fontSize: '11px', fontWeight: '800', color: primaryColor, letterSpacing: '0.14em' }
          },
          {
            id: `q-${i}-title`,
            type: 'text',
            content: q.text || 'Pregunta sin título',
            x: 70, y: 110, width: 800, height: 80,
            rotation: 0, zIndex: 10, locked: false, hidden: false,
            styles: { fontSize: '32px', fontWeight: '800', color: textColor, lineHeight: '1.2' }
          },
          {
            id: `q-${i}-options`,
            type: 'text', // Using text for options representation for now
            content: this.getOptionsPlaceholder(q),
            x: 70, y: 220, width: 860, height: 280,
            rotation: 0, zIndex: 10, locked: true, hidden: false,
            styles: { fontSize: '16px', color: textColor, opacity: '0.6' }
          }
        );
      }
    });

    let endScreen = canvas.screens.find(s => s.id === 'end');
    if (!endScreen) {
      endScreen = {
        id: 'end',
        type: 'end',
        background: { type: 'gradient', value: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` },
        elements: []
      };
      canvas.screens.push(endScreen);
    } else {
      endScreen.background = { type: 'gradient', value: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` };
    }

    endScreen.elements = this.mergeCanvasElements(
      endScreen.elements,
      this.createEndCanvasElements(metadata, { primaryColor, secondaryColor, textColor, surfaceColor, cardRadius, shadow })
    );

    return metadata;
  }

  private getOptionsPlaceholder(q: Question): string {
    if (q.type === 'multiple-choice') {
      return q.options.map(o => `○ ${o.texto}`).join('\n\n');
    }
    if (q.type === 'rating' || q.type === 'scale') {
      return Array.from({ length: q.max || 5 }, (_, i) => `[ ${i + 1} ]`).join('  ');
    }
    if (q.type === 'text') {
      return 'Escribe tu respuesta aquí...';
    }
    return 'Opciones de respuesta';
  }

  private mergeCanvasElements(existing: CanvasElement[], defaults: CanvasElement[]): CanvasElement[] {
    const defaultsById = new Map(defaults.map((element) => [element.id, element]));
    const merged = existing
      .filter((element) => !defaultsById.has(element.id) || defaultsById.get(element.id)?.type === element.type)
      .map((element) => {
        const next = defaultsById.get(element.id);
        if (!next) {
          return element;
        }

        const generatedLayout = next.locked
          ? {
            x: next.x,
            y: next.y,
            width: next.width,
            height: next.height,
            rotation: next.rotation,
            zIndex: next.zIndex
          }
          : {};

        const keepFreeStyle = element.styles?.['__freeEdited'] === true;
        return {
          ...element,
          ...generatedLayout,
          content: next.content,
          questionId: next.questionId,
          locked: next.locked,
          hidden: next.hidden,
          styles: keepFreeStyle ? element.styles : next.styles
        };
      });

    for (const element of defaults) {
      if (!merged.some((item) => item.id === element.id)) {
        merged.push(element);
      }
    }

    return merged.sort((a, b) => a.zIndex - b.zIndex);
  }

  private createWelcomeCanvasElements(
    survey: Survey,
    metadata: SurveyMetadata,
    theme: {
      primaryColor: string;
      secondaryColor: string;
      textColor: string;
      surfaceColor: string;
      cardRadius: string;
      shadow: string;
    }
  ): CanvasElement[] {
    const questionCount = survey.questions.length || 1;

    return [
      {
        id: 'welcome-bg-panel',
        type: 'shape',
        content: '',
        x: 0, y: 0, width: 1000, height: 600,
        rotation: 0, zIndex: 0, locked: true, hidden: false,
        styles: {
          background: `radial-gradient(circle at 12% 14%, ${theme.secondaryColor}26 0%, transparent 32%), radial-gradient(circle at 88% 12%, ${theme.primaryColor}26 0%, transparent 30%), linear-gradient(135deg, ${metadata.brand?.backgroundColor || '#f5f3ff'}, #ffffff)`
        }
      },
      {
        id: 'welcome-card',
        type: 'shape',
        content: '',
        x: 70, y: 64, width: 860, height: 472,
        rotation: 0, zIndex: 2, locked: true, hidden: false,
        styles: {
          backgroundColor: '#ffffff',
          borderRadius: theme.cardRadius,
          boxShadow: '0 28px 90px rgba(15,23,42,0.16)',
          border: '1px solid rgba(15,23,42,0.08)'
        }
      },
      {
        id: 'welcome-kicker',
        type: 'text',
        content: 'ENCUESTA PUBLICA',
        x: 128, y: 124, width: 220, height: 30,
        rotation: 0, zIndex: 10, locked: false, hidden: false,
        styles: { fontSize: '12px', fontWeight: '850', color: theme.primaryColor, letterSpacing: '0.12em', textTransform: 'uppercase' }
      },
      {
        id: 'welcome-title',
        type: 'text',
        content: survey.title || 'Bienvenido a nuestra Encuesta',
        x: 128, y: 160, width: 510, height: 112,
        rotation: 0, zIndex: 10, locked: false, hidden: false,
        styles: {
          fontSize: '52px',
          fontWeight: '900',
          color: theme.textColor,
          textAlign: 'left',
          lineHeight: '1.04'
        }
      },
      {
        id: 'welcome-desc',
        type: 'text',
        content: survey.description || 'Tu opinión es muy valiosa para nosotros. Solo te tomará un minuto.',
        x: 128, y: 292, width: 510, height: 86,
        rotation: 0, zIndex: 10, locked: false, hidden: false,
        styles: {
          fontSize: '18px',
          fontWeight: '400',
          lineHeight: '1.55',
          color: theme.textColor,
          textAlign: 'left',
          opacity: '0.7'
        }
      },
      {
        id: 'welcome-cta',
        type: 'button',
        content: metadata.ctaText || 'Comenzar encuesta',
        x: 128, y: 414, width: 248, height: 58,
        rotation: 0, zIndex: 10, locked: false, hidden: false,
        styles: {
          backgroundColor: theme.primaryColor,
          color: '#ffffff',
          borderRadius: '16px',
          fontWeight: '800',
          fontSize: '16px',
          boxShadow: `0 12px 24px ${theme.primaryColor}33`
        }
      },
      {
        id: 'welcome-preview-panel',
        type: 'shape',
        content: '',
        x: 680, y: 138, width: 190, height: 324,
        rotation: 0, zIndex: 6, locked: false, hidden: false,
        styles: { background: `${theme.primaryColor}1f`, border: '1px solid rgba(255,255,255,0.38)', borderRadius: '28px', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.32), 0 24px 60px rgba(15,23,42,0.12)' }
      },
      {
        id: 'welcome-meta',
        type: 'text',
        content: `${questionCount} pregunta${questionCount === 1 ? '' : 's'}  |  1 min`,
        x: 398, y: 432, width: 260, height: 22,
        rotation: 0, zIndex: 10, locked: false, hidden: false,
        styles: { fontSize: '13px', fontWeight: '700', color: theme.textColor, textAlign: 'left', opacity: '0.5' }
      }
    ];
  }

  private createQuestionCanvasElements(
    question: Question,
    index: number,
    theme: {
      primaryColor: string;
      secondaryColor: string;
      textColor: string;
      surfaceColor: string;
      bg: string;
      cardRadius: string;
      shadow: string;
    }
  ): CanvasElement[] {
    const optionHeight = question.type === 'text' ? 150 : question.type === 'scale' ? 96 : 210;
    const optionY = question.type === 'text' ? 300 : 285;

    const baseElements: CanvasElement[] = [
      {
        id: `q-${index}-accent`,
        type: 'shape',
        content: '',
        x: 0, y: 0, width: 1000, height: 600,
        rotation: 0, zIndex: 0, locked: true, hidden: false,
        styles: {
          background: `radial-gradient(circle at 86% 12%, ${theme.secondaryColor}33 0%, transparent 30%), radial-gradient(circle at 8% 90%, ${theme.primaryColor}26 0%, transparent 28%)`
        }
      },
      {
        id: `q-${index}-card`,
        type: 'shape',
        content: '',
        x: 40, y: 44, width: 920, height: 512,
        rotation: 0, zIndex: 1, locked: true, hidden: false,
        styles: {
          backgroundColor: theme.surfaceColor,
          borderRadius: theme.cardRadius,
          boxShadow: theme.shadow,
          border: `1px solid ${theme.primaryColor}1f`
        }
      },
      {
        id: `q-${index}-pill`,
        type: 'shape',
        content: '',
        x: 76, y: 78, width: 148, height: 32,
        rotation: 0, zIndex: 2, locked: true, hidden: false,
        styles: { backgroundColor: `${theme.primaryColor}18`, borderRadius: '999px' }
      },
      {
        id: `q-${index}-kicker`,
        type: 'text',
        content: `PREGUNTA ${index + 1}`,
        x: 96, y: 85, width: 180, height: 22,
        rotation: 0, zIndex: 10, locked: false, hidden: false,
        styles: { fontSize: '11px', fontWeight: '800', color: theme.primaryColor, letterSpacing: '0.12em' }
      },
      {
        id: `q-${index}-title`,
        type: 'text',
        content: question.text || this.defaultQuestionTitle(question.type),
        x: 76, y: 132, width: 760, height: 92,
        rotation: 0, zIndex: 10, locked: false, hidden: false,
        styles: { fontSize: '34px', fontWeight: '850', color: theme.textColor, lineHeight: '1.18' }
      },
      {
        id: `q-${index}-helper`,
        type: 'text',
        content: this.getQuestionHelper(question.type),
        x: 76, y: 230, width: 660, height: 32,
        rotation: 0, zIndex: 10, locked: true, hidden: false,
        styles: { fontSize: '15px', fontWeight: '600', color: theme.textColor, opacity: '0.54' }
      },
      {
        id: `q-${index}-options-bg`,
        type: 'shape',
        content: '',
        x: 76, y: optionY, width: 820, height: optionHeight,
        rotation: 0, zIndex: 2, locked: true, hidden: false,
        styles: {
          backgroundColor: question.type === 'text' ? `${theme.bg}cc` : `${theme.primaryColor}0d`,
          border: question.type === 'text' ? `2px dashed ${theme.primaryColor}55` : `1px solid ${theme.primaryColor}1f`,
          borderRadius: question.type === 'text' ? '22px' : '18px'
        }
      },
      {
        id: `q-${index}-options`,
        type: 'text',
        content: this.getPrettyOptionsPlaceholder(question),
        x: 104, y: optionY + 26, width: 760, height: optionHeight - 44,
        rotation: 0, zIndex: 10, locked: true, hidden: false,
        styles: this.questionOptionsStyle(question, theme)
      }
    ];

    if (question.type === 'rating' || question.type === 'scale') {
      return [
        ...baseElements.map((element) => element.id === `q-${index}-options`
          ? { ...element, hidden: true, content: '' }
          : element),
        ...this.createScaleCanvasButtons(question, index, theme, optionY)
      ];
    }

    return baseElements;
  }

  private createScaleCanvasButtons(
    question: Question,
    index: number,
    theme: { primaryColor: string; secondaryColor: string; textColor: string },
    y: number
  ): CanvasElement[] {
    const min = question.min ?? 1;
    const max = question.max ?? 10;
    const values = Array.from({ length: Math.max(0, max - min + 1) }, (_, valueIndex) => min + valueIndex);
    const isTenPoint = values.length > 5;
    const buttonWidth = isTenPoint ? 68 : 88;
    const gap = isTenPoint ? 10 : 16;
    const startX = isTenPoint ? 104 : 126;
    const top = y + 28;

    return values.map((value, valueIndex) => ({
      id: `q-${index}-scale-btn-${value}`,
      type: 'button',
      content: String(value),
      x: startX + valueIndex * (buttonWidth + gap),
      y: top,
      width: buttonWidth,
      height: 58,
      rotation: 0,
      zIndex: 12,
      locked: true,
      hidden: false,
      styles: {
        background: '#ffffff',
        color: theme.primaryColor,
        border: `2px solid ${theme.primaryColor}33`,
        borderRadius: '16px',
        fontSize: '20px',
        fontWeight: '850',
        boxShadow: '0 10px 24px rgba(15, 23, 42, 0.08)'
      }
    }));
  }

  private createEndCanvasElements(
    metadata: SurveyMetadata,
    theme: {
      primaryColor: string;
      secondaryColor: string;
      textColor: string;
      surfaceColor: string;
      cardRadius: string;
      shadow: string;
    }
  ): CanvasElement[] {
    return [
      {
        id: 'end-bg-panel',
        type: 'shape',
        content: '',
        x: 0, y: 0, width: 1000, height: 600,
        rotation: 0, zIndex: 0, locked: true, hidden: false,
        styles: {
          background: `linear-gradient(135deg, ${theme.primaryColor}, ${theme.secondaryColor})`
        }
      },
      {
        id: 'end-card',
        type: 'shape',
        content: '',
        x: 200, y: 100, width: 600, height: 400,
        rotation: 0, zIndex: 2, locked: true, hidden: false,
        styles: {
          backgroundColor: '#ffffff',
          borderRadius: theme.cardRadius,
          boxShadow: '0 40px 100px rgba(0,0,0,0.15)',
          border: '1px solid rgba(255,255,255,0.2)'
        }
      },
      {
        id: 'end-icon-circle',
        type: 'shape',
        content: '',
        x: 460, y: 140, width: 80, height: 80,
        rotation: 0, zIndex: 10, locked: true, hidden: false,
        styles: {
          backgroundColor: `${theme.primaryColor}15`,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }
      },
      {
        id: 'end-icon-check',
        type: 'text',
        content: '✓',
        x: 460, y: 140, width: 80, height: 80,
        rotation: 0, zIndex: 11, locked: true, hidden: false,
        styles: {
          fontSize: '40px',
          color: theme.primaryColor,
          textAlign: 'center',
          lineHeight: '80px',
          fontWeight: '900'
        }
      },
      {
        id: 'end-title',
        type: 'text',
        content: metadata.thankYouTitle || '¡Muchas gracias!',
        x: 250, y: 240, width: 500, height: 60,
        rotation: 0, zIndex: 10, locked: false, hidden: false,
        styles: {
          fontSize: '36px',
          fontWeight: '900',
          color: theme.textColor,
          textAlign: 'center'
        }
      },
      {
        id: 'end-desc',
        type: 'text',
        content: metadata.thankYouDescription || 'Tus respuestas han sido enviadas con éxito. Apreciamos mucho tu tiempo.',
        x: 250, y: 310, width: 500, height: 60,
        rotation: 0, zIndex: 10, locked: false, hidden: false,
        styles: {
          fontSize: '18px',
          fontWeight: '400',
          color: theme.textColor,
          textAlign: 'center',
          opacity: '0.6'
        }
      }
    ];
  }

  private getPrettyOptionsPlaceholder(question: Question): string {
    if (question.type === 'multiple-choice') {
      const options = question.options.length
        ? question.options
        : [
          { id: 'default-option-1', texto: 'Opcion 1' },
          { id: 'default-option-2', texto: 'Opcion 2' }
        ];
      return options.map((option) => `( )  ${option.texto}`).join('\n');
    }

    if (question.type === 'rating') {
      return Array.from({ length: question.max || 10 }, (_, index) => `${index + 1}`).join('   ');
    }

    if (question.type === 'scale') {
      return Array.from({ length: question.max || 5 }, (_, index) => `${index + 1}`).join('        ');
    }

    return 'Escribe tu respuesta aqui...';
  }

  private questionOptionsStyle(
    question: Question,
    theme: { primaryColor: string; secondaryColor: string; textColor: string }
  ): Record<string, string> {
    if (question.type === 'rating' || question.type === 'scale') {
      return {
        fontSize: question.type === 'rating' ? '22px' : '28px',
        fontWeight: '850',
        color: theme.primaryColor,
        lineHeight: '1.9',
        textAlign: 'center',
        letterSpacing: '0'
      };
    }

    if (question.type === 'text') {
      return {
        fontSize: '18px',
        color: theme.textColor,
        opacity: '0.5',
        lineHeight: '1.6'
      };
    }

    return {
      fontSize: '18px',
      fontWeight: '700',
      color: theme.textColor,
      lineHeight: '2.35'
    };
  }

  private defaultQuestionTitle(type: QuestionType): string {
    if (type === 'multiple-choice') return 'Elige una opcion';
    if (type === 'rating') return 'Como calificarias tu experiencia?';
    if (type === 'scale') return 'Selecciona el nivel que mejor te represente';
    return 'Cuentanos tu respuesta';
  }

  private getQuestionHelper(type: QuestionType): string {
    if (type === 'multiple-choice') return 'Selecciona una de las opciones disponibles.';
    if (type === 'rating') return 'Usa una puntuacion del 1 al 10.';
    if (type === 'scale') return 'Marca un valor de 1 a 10.';
    return 'Respuesta abierta para capturar mas contexto.';
  }

  private canvasShadow(preset?: SurveyBrand['shadowPreset']): string {
    if (preset === 'none') return 'none';
    if (preset === 'medium') return '0 18px 55px rgba(15, 23, 42, 0.12)';
    if (preset === 'strong') return '0 26px 80px rgba(15, 23, 42, 0.18)';
    if (preset === 'float') return '0 34px 90px rgba(15, 23, 42, 0.16)';
    return '0 14px 44px rgba(15, 23, 42, 0.09)';
  }

  private getPublishChecklist(survey: Survey): PublishChecklistItem[] {
    const hasTitle = survey.title.trim().length > 0;
    const hasQuestions = survey.questions.length > 0;
    const completeQuestions = survey.questions.every((question) => question.text.trim().length > 0);
    const completeOptions = survey.questions.every((question) => {
      if (!this.isChoiceType(question.type)) return true;
      return question.options.filter((option) => option.texto.trim().length > 0).length >= 2;
    });
    const validLogic = survey.questions.every((question) => {
      const target = question.logic?.[0]?.goTo;
      return !target || target === 'end' || survey.questions.some((item) => item.id === target);
    });
    const hasBrokenImages = Boolean(survey.metadata?.brand?.logoUrl === '' || survey.questions.some((question) => question.imageUrl === ''));

    return [
      { label: 'Titulo', ok: hasTitle, detail: hasTitle ? 'Listo.' : 'Agrega un titulo antes de publicar.' },
      { label: 'Preguntas', ok: hasQuestions, detail: hasQuestions ? `${survey.questions.length} pregunta(s).` : 'Agrega al menos una pregunta antes de publicar.' },
      { label: 'Enunciados', ok: completeQuestions, detail: completeQuestions ? 'Todas las preguntas tienen texto.' : 'Hay preguntas sin enunciado.' },
      { label: 'Opciones', ok: completeOptions, detail: completeOptions ? 'Las preguntas de seleccion tienen opciones validas.' : 'Cada pregunta de seleccion necesita al menos dos opciones validas.' },
      { label: 'Logica condicional', ok: validLogic, detail: validLogic ? 'Los saltos apuntan a pantallas validas.' : 'Hay una regla condicional con destino invalido.' },
      { label: 'Recursos visuales', ok: !hasBrokenImages, detail: hasBrokenImages ? 'Revisa imagenes o logos faltantes.' : 'Sin recursos rotos detectados.' }
    ];
  }

  private cleanValidation(validation?: QuestionValidation): QuestionValidation | undefined {
    if (!validation) return undefined;
    const next: QuestionValidation = {};
    for (const [key, value] of Object.entries(validation) as Array<[keyof QuestionValidation, any]>) {
      if (value === undefined || value === null || value === '') continue;
      if (typeof value === 'number' && Number.isNaN(value)) continue;
      next[key] = value as never;
    }
    return Object.keys(next).length ? next : undefined;
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
