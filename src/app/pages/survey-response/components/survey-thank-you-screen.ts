import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Survey, SurveyBrand, SurveyElementConfig } from '../../../services/survey.service';

type EndDesignKind = 'end-rule' | 'logo' | 'end-icon' | 'end-title' | 'end-desc' | 'end-summary' | 'end-brand';
type TransformMode = 'move' | 'resize';

@Component({
  selector: 'app-survey-thank-you-screen',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="thanks-shell">
      <div class="thanks-card positioning-root" [class.positioned-layout]="usesPositionedLayout()" [style.min-height.px]="positionedHeight()">
        <div class="design-box" data-design-kind="end-rule" [class.design-active]="designMode" [class.design-selected]="isSelected('end-rule')" [ngStyle]="boxStyle('end-rule')" (mousedown)="selectBox($event, 'end-rule')">
          <button class="move-handle" type="button" aria-label="Mover linea" (mousedown)="beginTransform($event, 'end-rule', 'move')"></button>
          <div class="thanks-rule"></div>
          <button class="resize-handle" type="button" aria-label="Redimensionar linea" (mousedown)="beginTransform($event, 'end-rule', 'resize')"></button>
        </div>

        @if (brand.logoUrl) {
          <div class="design-box" data-design-kind="logo" [class.design-active]="designMode" [class.design-selected]="isSelected('logo')" [ngStyle]="boxStyle('logo')" (mousedown)="selectBox($event, 'logo')">
            <button class="move-handle" type="button" aria-label="Mover logo" (mousedown)="beginTransform($event, 'logo', 'move')"></button>
            <img class="thanks-logo" [src]="brand.logoUrl" alt="Logo de la encuesta" />
            <button class="resize-handle" type="button" aria-label="Redimensionar logo" (mousedown)="beginTransform($event, 'logo', 'resize')"></button>
          </div>
        }

        <div class="design-box" data-design-kind="end-icon" [class.design-active]="designMode" [class.design-selected]="isSelected('end-icon')" [ngStyle]="boxStyle('end-icon')" (mousedown)="selectBox($event, 'end-icon')">
          <button class="move-handle" type="button" aria-label="Mover icono" (mousedown)="beginTransform($event, 'end-icon', 'move')"></button>
          <div class="thanks-icon">✓</div>
          <button class="resize-handle" type="button" aria-label="Redimensionar icono" (mousedown)="beginTransform($event, 'end-icon', 'resize')"></button>
        </div>

        <div class="design-box" data-design-kind="end-title" [class.design-active]="designMode" [class.design-selected]="isSelected('end-title')" [ngStyle]="boxStyle('end-title')" (mousedown)="selectBox($event, 'end-title')">
          <button class="move-handle" type="button" aria-label="Mover titulo final" (mousedown)="beginTransform($event, 'end-title', 'move')"></button>
          <h1
            [attr.contenteditable]="designMode ? 'true' : null"
            [class.design-editable]="designMode"
            (keydown)="designMode && preventEditableEnter($event)"
            (blur)="designMode && emitEditable($event, titleChange)">
            {{ survey.metadata?.endTitle || survey.metadata?.thankYouTitle || 'Gracias por participar' }}
          </h1>
          <button class="resize-handle" type="button" aria-label="Redimensionar titulo final" (mousedown)="beginTransform($event, 'end-title', 'resize')"></button>
        </div>

        <div class="design-box" data-design-kind="end-desc" [class.design-active]="designMode" [class.design-selected]="isSelected('end-desc')" [ngStyle]="boxStyle('end-desc')" (mousedown)="selectBox($event, 'end-desc')">
          <button class="move-handle" type="button" aria-label="Mover descripcion final" (mousedown)="beginTransform($event, 'end-desc', 'move')"></button>
          <p
            [attr.contenteditable]="designMode ? 'true' : null"
            [class.design-editable]="designMode"
            (blur)="designMode && emitEditable($event, descriptionChange)">
            {{ survey.metadata?.endDescription || survey.metadata?.thankYouDescription || 'Tu respuesta ha sido registrada exitosamente.' }}
          </p>
          <button class="resize-handle" type="button" aria-label="Redimensionar descripcion final" (mousedown)="beginTransform($event, 'end-desc', 'resize')"></button>
        </div>

        <div class="design-box" data-design-kind="end-summary" [class.design-active]="designMode" [class.design-selected]="isSelected('end-summary')" [ngStyle]="boxStyle('end-summary')" (mousedown)="selectBox($event, 'end-summary')">
          <button class="move-handle" type="button" aria-label="Mover resumen" (mousedown)="beginTransform($event, 'end-summary', 'move')"></button>
          <div class="thanks-summary">
            <span>Respuesta recibida</span>
            <span>Envio seguro</span>
          </div>
          <button class="resize-handle" type="button" aria-label="Redimensionar resumen" (mousedown)="beginTransform($event, 'end-summary', 'resize')"></button>
        </div>

        <div class="design-box" data-design-kind="end-brand" [class.design-active]="designMode" [class.design-selected]="isSelected('end-brand')" [ngStyle]="boxStyle('end-brand')" (mousedown)="selectBox($event, 'end-brand')">
          <button class="move-handle" type="button" aria-label="Mover marca" (mousedown)="beginTransform($event, 'end-brand', 'move')"></button>
          <div class="thanks-brand">Powered by Datafyra</div>
          <button class="resize-handle" type="button" aria-label="Redimensionar marca" (mousedown)="beginTransform($event, 'end-brand', 'resize')"></button>
        </div>
      </div>
    </section>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
    }

    .thanks-shell {
      min-height: 100svh;
      display: grid;
      place-items: center;
      padding: clamp(24px, 5vw, 72px);
      position: relative;
      z-index: 1;
    }

    .thanks-card {
      width: min(680px, 100%);
      padding: clamp(32px, 6vw, 64px);
      border-radius: var(--response-card-radius, 28px);
      background:
        linear-gradient(180deg, rgba(255,255,255,0.95), rgba(255,255,255,0.88)),
        var(--response-surface, #ffffff);
      border: 1px solid rgba(15, 23, 42, 0.08);
      box-shadow: 0 28px 90px rgba(15, 23, 42, 0.16);
      text-align: center;
      color: var(--response-heading, #111827);
      backdrop-filter: blur(18px);
      overflow: hidden;
    }

    .thanks-card.positioned-layout {
      position: relative;
    }

    .design-box {
      position: relative;
      box-sizing: border-box;
    }

    .positioned-layout > .design-box {
      position: absolute;
      min-width: 44px;
      min-height: 24px;
    }

    .design-active {
      border: 1px solid transparent;
      border-radius: 12px;
      cursor: move;
    }

    .design-active:hover,
    .design-selected {
      border-color: color-mix(in srgb, var(--response-primary, #7c3aed) 62%, white);
      box-shadow: 0 0 0 3px color-mix(in srgb, var(--response-primary, #7c3aed) 12%, transparent);
    }

    .move-handle,
    .resize-handle {
      display: none;
      position: absolute;
      z-index: 20;
      border: 0;
      background: var(--response-primary, #7c3aed);
      box-shadow: 0 8px 18px rgba(15, 23, 42, 0.18);
    }

    .design-selected .move-handle,
    .design-selected .resize-handle {
      display: block;
    }

    .move-handle {
      left: 50%;
      top: -13px;
      width: 28px;
      height: 18px;
      border-radius: 999px;
      transform: translateX(-50%);
      cursor: move;
    }

    .move-handle::before {
      content: "";
      width: 12px;
      height: 2px;
      border-radius: 999px;
      background: #ffffff;
      display: block;
      margin: 8px auto 0;
    }

    .resize-handle {
      right: -7px;
      bottom: -7px;
      width: 14px;
      height: 14px;
      border-radius: 5px;
      cursor: nwse-resize;
    }

    .thanks-rule {
      width: 100%;
      height: 100%;
      margin: 0 auto 34px;
      border-radius: 999px;
      background: linear-gradient(90deg, var(--response-primary, #7c3aed), var(--response-secondary, #06b6d4));
    }

    .thanks-logo {
      width: 100%;
      height: 100%;
      object-fit: contain;
      margin: 0 auto 26px;
      display: block;
    }

    .thanks-icon {
      width: 100%;
      height: 100%;
      display: grid;
      place-items: center;
      margin: 0 auto 24px;
      border-radius: 999px;
      color: var(--response-primary, #7c3aed);
      background: color-mix(in srgb, var(--response-primary, #7c3aed) 12%, white);
      font-weight: 950;
      font-size: 28px;
    }

    h1 {
      margin: 0;
      font-family: var(--response-title-font, Inter, sans-serif);
      font-size: clamp(32px, 5vw, 52px);
      line-height: 1.08;
    }

    p {
      margin: 18px auto 0;
      max-width: 440px;
      color: var(--response-muted, #64748b);
      line-height: 1.65;
      font-size: 17px;
    }

    .thanks-summary {
      display: flex;
      justify-content: center;
      flex-wrap: wrap;
      gap: 10px;
      margin-top: 28px;
    }

    .thanks-summary span {
      padding: 9px 13px;
      border-radius: 999px;
      background: rgba(15, 23, 42, 0.05);
      color: var(--response-muted, #64748b);
      font-size: 13px;
      font-weight: 800;
    }

    .thanks-brand {
      margin-top: 32px;
      padding-top: 20px;
      border-top: 1px solid var(--response-border, #e2e8f0);
      color: var(--response-primary, #7c3aed);
      font-size: 14px;
      font-weight: 850;
    }

    .positioned-layout .thanks-rule,
    .positioned-layout .thanks-logo,
    .positioned-layout .thanks-icon,
    .positioned-layout p,
    .positioned-layout .thanks-summary,
    .positioned-layout .thanks-brand {
      margin: 0 auto;
    }

    .design-editable {
      outline: 2px dashed transparent;
      outline-offset: 6px;
      border-radius: 10px;
      cursor: text;
      transition: outline-color 160ms ease, background 160ms ease;
    }

    .design-editable:hover,
    .design-editable:focus {
      outline-color: color-mix(in srgb, var(--response-primary, #7c3aed) 45%, transparent);
      background: color-mix(in srgb, var(--response-primary, #7c3aed) 7%, transparent);
    }
  `]
})
export class SurveyThankYouScreenComponent {
  @Input({ required: true }) survey!: Survey;
  @Input({ required: true }) brand!: SurveyBrand;
  @Input() designMode = false;
  @Output() titleChange = new EventEmitter<string>();
  @Output() descriptionChange = new EventEmitter<string>();
  @Output() transformStart = new EventEmitter<{ event: MouseEvent; kind: EndDesignKind; mode: TransformMode; frame?: SurveyElementConfig; frames?: Record<string, SurveyElementConfig> }>();
  selectedKind: EndDesignKind | null = null;

  private readonly defaults: Record<EndDesignKind, SurveyElementConfig> = {
    'end-rule': { x: 64, y: 0, width: 420, height: 8 },
    logo: { x: 199, y: 42, width: 150, height: 64 },
    'end-icon': { x: 233, y: 130, width: 82, height: 52 },
    'end-title': { x: 34, y: 212, width: 480, height: 120 },
    'end-desc': { x: 54, y: 356, width: 440, height: 84 },
    'end-summary': { x: 94, y: 468, width: 360, height: 48 },
    'end-brand': { x: 64, y: 548, width: 420, height: 54 }
  };

  emitEditable(event: Event, output: EventEmitter<string>): void {
    output.emit((event.target as HTMLElement).innerText.trim());
  }

  preventEditableEnter(event: KeyboardEvent): void {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    (event.target as HTMLElement).blur();
  }

  beginTransform(event: MouseEvent, kind: EndDesignKind, mode: TransformMode): void {
    if (!this.designMode) return;
    this.selectedKind = kind;
    this.transformStart.emit({ event, kind, mode, frame: this.measureFrame(event), frames: this.measureSiblingFrames(event) });
  }

  selectBox(event: MouseEvent, kind: EndDesignKind): void {
    if (!this.designMode) return;
    event.stopPropagation();
    this.selectedKind = kind;
  }

  isSelected(kind: EndDesignKind): boolean {
    return this.designMode && this.selectedKind === kind;
  }

  boxStyle(kind: EndDesignKind): Record<string, string> {
    const config = this.configFor(kind);
    if (!this.usesPositionedLayout()) return {};
    return {
      position: 'absolute',
      left: `${config.x}px`,
      top: `${config.y}px`,
      width: `${config.width}px`,
      height: `${config.height}px`,
      zIndex: `${config.zIndex ?? 10}`
    };
  }

  usesPositionedLayout(): boolean {
    return this.hasStoredConfig('logo')
      || this.hasStoredConfig('end-rule')
      || this.hasStoredConfig('end-icon')
      || this.hasStoredConfig('end-title')
      || this.hasStoredConfig('end-desc')
      || this.hasStoredConfig('end-summary')
      || this.hasStoredConfig('end-brand');
  }

  positionedHeight(): number | null {
    if (!this.usesPositionedLayout()) return null;
    return this.maxElementBottom([
      this.configFor('end-rule'),
      this.brand.logoUrl ? this.configFor('logo') : undefined,
      this.configFor('end-icon'),
      this.configFor('end-title'),
      this.configFor('end-desc'),
      this.configFor('end-summary'),
      this.configFor('end-brand')
    ], 28);
  }

  private configFor(kind: EndDesignKind): SurveyElementConfig {
    const metadata = this.survey.metadata;
    const stored = kind === 'logo' ? this.brand.logoConfig
      : kind === 'end-rule' ? metadata?.endRuleConfig
      : kind === 'end-icon' ? metadata?.endIconConfig
      : kind === 'end-title' ? metadata?.endTitleConfig
      : kind === 'end-desc' ? metadata?.endDescConfig
      : kind === 'end-summary' ? metadata?.endSummaryConfig
      : metadata?.endBrandConfig;
    return { ...this.defaults[kind], ...(stored ?? {}) };
  }

  private hasStoredConfig(kind: EndDesignKind): boolean {
    const metadata = this.survey.metadata;
    return kind === 'logo' ? this.brand.logoConfig?.positioned === true
      : kind === 'end-rule' ? metadata?.endRuleConfig?.positioned === true
      : kind === 'end-icon' ? metadata?.endIconConfig?.positioned === true
      : kind === 'end-title' ? metadata?.endTitleConfig?.positioned === true
      : kind === 'end-desc' ? metadata?.endDescConfig?.positioned === true
      : kind === 'end-summary' ? metadata?.endSummaryConfig?.positioned === true
      : metadata?.endBrandConfig?.positioned === true;
  }

  private maxElementBottom(configs: Array<SurveyElementConfig | undefined>, padding: number): number {
    const bottom = configs.reduce((max, config) => {
      if (!config) return max;
      return Math.max(max, config.y + config.height);
    }, 0);
    return Math.ceil(bottom + padding);
  }

  private measureFrame(event: MouseEvent): SurveyElementConfig | undefined {
    const box = (event.currentTarget as HTMLElement).closest('.design-box') as HTMLElement | null;
    const root = box?.parentElement as HTMLElement | null;
    if (!box || !root) return undefined;
    const boxRect = box.getBoundingClientRect();
    const rootRect = root.getBoundingClientRect();
    return {
      x: Math.round(boxRect.left - rootRect.left),
      y: Math.round(boxRect.top - rootRect.top),
      width: Math.round(boxRect.width),
      height: Math.round(boxRect.height)
    };
  }

  private measureSiblingFrames(event: MouseEvent): Record<string, SurveyElementConfig> {
    const box = (event.currentTarget as HTMLElement).closest('.design-box') as HTMLElement | null;
    const root = box?.parentElement as HTMLElement | null;
    if (!root) return {};

    const rootRect = root.getBoundingClientRect();
    const frames: Record<string, SurveyElementConfig> = {};
    root.querySelectorAll<HTMLElement>(':scope > .design-box').forEach((item) => {
      const kind = item.dataset['designKind'];
      if (!kind) return;
      const rect = item.getBoundingClientRect();
      frames[kind] = {
        x: Math.round(rect.left - rootRect.left),
        y: Math.round(rect.top - rootRect.top),
        width: Math.round(rect.width),
        height: Math.round(rect.height)
      };
    });
    return frames;
  }

  private isEditableTarget(target: EventTarget | null): boolean {
    const element = target as HTMLElement | null;
    return !!element?.closest('[contenteditable="true"], input, textarea, select, .move-handle, .resize-handle');
  }
}
