const fs = require('fs');
const path = 'c:/Users/klhet/dataencuesta/src/app/pages/editor/editor.html';
let html = fs.readFileSync(path, 'utf8');

// 1. Replace the header section
const headerStartStr = '@if (selectedAnalyticsQuestionId() !== null) {';
const headerEndStr = '          </div>\r\n          }'; // Find the closing div of inline-card-head
const headerStartIndex = html.indexOf(headerStartStr);
const headerEndIndex = html.indexOf(headerEndStr, headerStartIndex) + headerEndStr.length;

if (headerStartIndex !== -1 && headerEndIndex !== -1) {
  const newHeader = `@if (selectedAnalyticsQuestions().length > 0) {
          <div class="inline-card-head">
            <div>
              <span class="collect-label">Análisis de respuestas</span>
              <h3 class="truncate-title">{{ selectedAnalyticsQuestions().includes('all') ? 'Todas las preguntas' : (selectedAnalyticsQuestions().length + ' preguntas seleccionadas') }}</h3>
            </div>

            <div class="inline-section-controls" style="display: flex; align-items: center; gap: 12px;">
              <button class="selector-btn" (click)="openAnalyticsModal($event)" style="display: flex; align-items: center; gap: 6px; background: white; border: 1px solid #cbd5e1; padding: 6px 12px; border-radius: 6px; font-weight: 500; color: #475569; cursor: pointer; font-size: 14px;">
                <span class="material-symbols-outlined" style="font-size: 18px;">filter_list</span> Seleccionar preguntas
              </button>
            </div>
          </div>
          }`;
  html = html.substring(0, headerStartIndex) + newHeader + html.substring(headerEndIndex);
}

// 2. Replace the feed section
const feedStartStr = '@if (selectedAnalyticsQuestionId() === null) {';
const feedStartIndex = html.indexOf(feedStartStr);
const feedEndStr = '        </section>\r\n        <section class="inline-responses-table">';
const feedEndIndex = html.indexOf(feedEndStr);

if (feedStartIndex !== -1 && feedEndIndex !== -1) {
  // Extract up to the end of the section
  const newFeed = `@if (selectedAnalyticsQuestions().length === 0) {
          <div class="inline-empty-analytics single-focus-card" style="text-align: center; padding: 80px 20px; border-style: dashed; border-width: 2px; border-color: #e2e8f0;">
            <div style="background: #f1f5f9; width: 64px; height: 64px; border-radius: 50%; display: grid; place-items: center; margin: 0 auto 20px;">
              <span class="material-symbols-outlined" style="font-size: 32px; color: #6d28d9;">query_stats</span>
            </div>
            <h2 style="font-size: 20px; font-weight: 600; color: #1e293b; margin-bottom: 8px;">Vamos a analizar tu encuesta</h2>
            <p style="color: #64748b; font-size: 15px; margin-bottom: 24px; max-width: 400px; margin-left: auto; margin-right: auto;">
              Haz clic en el botón de abajo para seleccionar una o varias preguntas y comenzar a visualizar los datos de tus respuestas.
            </p>
            <button (click)="openAnalyticsModal($event)" style="background: #440789; color: white; border: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; cursor: pointer; transition: all 0.2s;">
              Comenzar a Analizar
            </button>
          </div>
          } @else {
          <div class="analytics-feed analytics-feed-grid">
            @for (item of getSelectedQuestionsAnalytics(); track item.question.id) {
              <div class="inline-distribution-card single-focus-card">
                <h4>{{ item.question.text || 'Pregunta sin título' }}</h4>
                
                @if (item.isText) {
                  @if (item.textResponses.length > 0) {
                  <div class="inline-text-responses">
                    <div class="inline-text-head">
                      <p>{{ item.textResponses.length }} respuestas de texto</p>
                    </div>
                    <div style="max-height: 250px; overflow-y: auto;">
                      @for (text of item.textResponses; track $index) {
                      <article>{{ text }}</article>
                      }
                    </div>
                  </div>
                  } @else {
                  <div class="inline-empty-analytics">
                    <span class="material-symbols-outlined">insights</span>
                    <strong>Sin datos</strong>
                  </div>
                  }
                } @else {
                  @if (item.distribution.length > 0) {
                  <div class="panel-recharts-view">
                    <div class="recharts-bars">
                      @for (dist of item.distribution; track dist.label; let i = $index) {
                        <div class="recharts-row">
                          <div class="recharts-y-axis">
                            <span [title]="dist.label">{{ dist.label }}</span>
                          </div>
                          <div class="recharts-bar-area">
                            <div class="recharts-row-highlight"></div>
                            <div class="recharts-bar-fill color-{{ i % 6 }}" [style.width.%]="(dist.count / (item.maxDist || 1)) * 100">
                              <div class="recharts-tooltip">
                                <strong>{{ dist.count }} respuesta(s)</strong>
                                <span>{{ dist.percentage }}%</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      }
                    </div>
                  </div>
                  } @else {
                  <div class="inline-empty-analytics">
                    <span class="material-symbols-outlined">insights</span>
                    <strong>Sin datos</strong>
                  </div>
                  }
                }
              </div>
            }
          </div>
          }
`;
  html = html.substring(0, feedStartIndex) + newFeed + html.substring(feedEndIndex);
}

// 3. Replace the modal section
const modalStartStr = '@if (showAnalyticsModal()) {';
const modalStartIndex = html.indexOf(modalStartStr);
const modalEndStr = '  }'; // Wait, let's find it better
// We know modal is right before @if (showTemplateModal)
const templateModalStartStr = '@if (showTemplateModal) {';
const templateModalStartIndex = html.indexOf(templateModalStartStr);

if (modalStartIndex !== -1 && templateModalStartIndex !== -1) {
  const newModal = `@if (showAnalyticsModal()) {
  <div class="shadcn-dialog-overlay" (click)="closeAnalyticsModal($event)">
    <div class="shadcn-dialog-content" style="max-width: 900px;" (click)="$event.stopPropagation()">
      <div class="shadcn-dialog-header">
        <h2>¿Qué deseas analizar?</h2>
        <p>Selecciona una o varias preguntas para mostrar en tu análisis.</p>
        <button class="shadcn-dialog-close" (click)="closeAnalyticsModal($event)">
          <span class="material-symbols-outlined">close</span>
        </button>
      </div>
      
      <div class="shadcn-dialog-body">
        <button class="shadcn-menu-item primary" [class.active]="selectedAnalyticsQuestions().includes('all')" (click)="toggleAnalyticsQuestion('all')">
          <span class="material-symbols-outlined">view_stream</span>
          <div>
            <strong>Todas las preguntas</strong>
            <small>Vista de feed continuo</small>
          </div>
          <span class="checklist-indicator material-symbols-outlined" *ngIf="selectedAnalyticsQuestions().includes('all')">check_circle</span>
        </button>

        <div class="shadcn-dialog-separator"></div>

        <div class="analytics-selection-grid">
          @for (q of survey()?.questions || []; track q.id; let i = $index) {
          <button class="shadcn-menu-item" [class.active]="selectedAnalyticsQuestions().includes(q.id) && !selectedAnalyticsQuestions().includes('all')" (click)="toggleAnalyticsQuestion(q.id)" [disabled]="selectedAnalyticsQuestions().includes('all')">
            <span class="material-symbols-outlined">{{ q.type === 'text' || q.type === 'long-text' ? 'short_text' : 'pie_chart' }}</span>
            <div>
              <strong>{{ i + 1 }}. {{ q.text || 'Pregunta sin título' }}</strong>
              <small>{{ q.type === 'text' || q.type === 'long-text' ? 'Respuestas de texto' : 'Opción múltiple' }}</small>
            </div>
            @if (selectedAnalyticsQuestions().includes(q.id) && !selectedAnalyticsQuestions().includes('all')) {
            <span class="checklist-indicator material-symbols-outlined" style="margin-left: auto; color: #6d28d9;">check_circle</span>
            }
          </button>
          }
        </div>
      </div>
      
      <div class="shadcn-dialog-footer" style="padding: 16px 24px; border-top: 1px solid #e2e8f0; display: flex; justify-content: flex-end; gap: 12px; background: #f8fafc; border-bottom-left-radius: 12px; border-bottom-right-radius: 12px;">
        <button (click)="closeAnalyticsModal($event)" style="background: white; border: 1px solid #cbd5e1; padding: 10px 20px; border-radius: 6px; font-weight: 500; cursor: pointer; color: #475569;">Cancelar</button>
        <button (click)="closeAnalyticsModal($event)" style="background: #440789; color: white; border: none; padding: 10px 20px; border-radius: 6px; font-weight: 600; cursor: pointer;">Confirmar Selección</button>
      </div>
    </div>
  </div>
  }
  
`;
  html = html.substring(0, modalStartIndex) + newModal + html.substring(templateModalStartIndex);
}

fs.writeFileSync(path, html);
console.log('Update completed');
