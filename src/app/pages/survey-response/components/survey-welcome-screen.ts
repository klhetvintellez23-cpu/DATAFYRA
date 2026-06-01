import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, HostListener } from '@angular/core';
import { Survey, SurveyBrand, SurveyElementConfig } from '../../../services/survey.service';

type WelcomeDesignKind = 'logo' | 'welcome-title' | 'welcome-desc' | 'welcome-cta' | 'welcome-kicker' | 'welcome-meta' | 'welcome-preview' | string;
type TransformMode = 'move' | 'resize' | 'stretch';

@Component({
  selector: 'app-survey-welcome-screen',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section
      class="welcome-shell"
      [class.layout-split]="welcomeLayout() === 'split'"
      [class.layout-centered]="welcomeLayout() === 'centered'"
      [class.layout-poster]="welcomeLayout() === 'poster'"
      [class.layout-minimal]="welcomeLayout() === 'minimal'"
      [class.layout-editorial]="welcomeLayout() === 'editorial'"
      [class.layout-orbit]="welcomeLayout() === 'orbit'"
      [class.layout-showcase]="welcomeLayout() === 'showcase'"
      [class.layout-diagonal]="welcomeLayout() === 'diagonal'">
      <div class="welcome-card">
        <div class="welcome-content positioning-root" [class.positioned-layout]="usesPositionedLayout()" [style.min-height.px]="positionedContentHeight()">
          @if (brand.logoUrl) {
            <div class="design-box" data-design-kind="logo" [class.design-active]="designMode" [class.design-selected]="isSelected('logo')" [ngStyle]="boxStyle('logo')" (mousedown)="selectBox($event, 'logo')">
              <button class="move-handle" type="button" aria-label="Mover logo" (mousedown)="beginTransform($event, 'logo', 'move')"></button>
              <img class="welcome-logo" [src]="brand.logoUrl" alt="Logo de la encuesta" />
              <button class="resize-handle" type="button" aria-label="Redimensionar logo" (mousedown)="beginTransform($event, 'logo', 'resize')"></button>
            </div>
          }

          @if (!isHidden('welcome-kicker')) {
            <div class="design-box" data-design-kind="welcome-kicker" [class.design-active]="designMode" [class.design-selected]="isSelected('welcome-kicker')" [ngStyle]="boxStyle('welcome-kicker')" (mousedown)="selectBox($event, 'welcome-kicker')">
              <button class="move-handle" type="button" aria-label="Mover etiqueta" (mousedown)="beginTransform($event, 'welcome-kicker', 'move')"></button>
              <div class="welcome-kicker">Encuesta publica</div>
              <button class="resize-handle" type="button" aria-label="Redimensionar etiqueta" (mousedown)="beginTransform($event, 'welcome-kicker', 'resize')"></button>
              <button class="stretch-handle" type="button" aria-label="Estirar etiqueta" (mousedown)="beginTransform($event, 'welcome-kicker', 'stretch')"></button>
            </div>
          }

          @if (!isHidden('welcome-title')) {
            <div class="design-box" data-design-kind="welcome-title" [class.design-active]="designMode" [class.design-selected]="isSelected('welcome-title')" [ngStyle]="boxStyle('welcome-title')" (mousedown)="selectBox($event, 'welcome-title')">
              <button class="move-handle" type="button" aria-label="Mover titulo" (mousedown)="beginTransform($event, 'welcome-title', 'move')"></button>
              <h1
                [style.font-size.px]="fontSize('welcome-title')"
                [attr.contenteditable]="designMode ? 'true' : null"
                [class.design-editable]="designMode"
                (keydown)="designMode && preventEditableEnter($event)"
                (blur)="designMode && emitEditable($event, titleChange)">
                {{ survey.title || 'Nueva encuesta' }}
              </h1>
              <button class="resize-handle" type="button" aria-label="Redimensionar titulo" (mousedown)="beginTransform($event, 'welcome-title', 'resize')"></button>
              <button class="stretch-handle" type="button" aria-label="Estirar titulo" (mousedown)="beginTransform($event, 'welcome-title', 'stretch')"></button>
            </div>
          }

          @if (!isHidden('welcome-desc')) {
            <div class="design-box" data-design-kind="welcome-desc" [class.design-active]="designMode" [class.design-selected]="isSelected('welcome-desc')" [ngStyle]="boxStyle('welcome-desc')" (mousedown)="selectBox($event, 'welcome-desc')">
              <button class="move-handle" type="button" aria-label="Mover descripcion" (mousedown)="beginTransform($event, 'welcome-desc', 'move')"></button>
              <p
                [style.font-size.px]="fontSize('welcome-desc')"
                [attr.contenteditable]="designMode ? 'true' : null"
                [class.design-editable]="designMode"
                (blur)="designMode && emitEditable($event, descriptionChange)">
                {{ survey.description || 'Tu opinion nos ayuda a mejorar. Completar esta encuesta tomara solo unos minutos.' }}
              </p>
              <button class="resize-handle" type="button" aria-label="Redimensionar descripcion" (mousedown)="beginTransform($event, 'welcome-desc', 'resize')"></button>
              <button class="stretch-handle" type="button" aria-label="Estirar descripcion" (mousedown)="beginTransform($event, 'welcome-desc', 'stretch')"></button>
            </div>
          }

          @for (extra of survey.metadata?.welcomeExtraTexts; track extra.id) {
            @if (!isHidden(extra.id)) {
              <div class="welcome-extra-text design-box"
                   [ngStyle]="boxStyle(extra.id)"
                   [class.design-active]="designMode"
                   [class.design-selected]="isSelected(extra.id)"
                   [attr.data-design-kind]="extra.id"
                   (mousedown)="selectBox($event, extra.id)">
                <button class="move-handle" type="button" aria-label="Mover texto extra" (mousedown)="beginTransform($event, extra.id, 'move')"></button>
                <p
                  [style.font-size.px]="fontSize(extra.id)"
                  [attr.contenteditable]="designMode ? 'true' : null"
                  [class.design-editable]="designMode"
                  (blur)="designMode && emitExtraTextChange($event, extra.id)">
                  {{ extra.text || 'Nuevo texto' }}
                </p>
                <button class="resize-handle" type="button" aria-label="Redimensionar texto extra" (mousedown)="beginTransform($event, extra.id, 'resize')"></button>
                <button class="stretch-handle" type="button" aria-label="Estirar texto extra" (mousedown)="beginTransform($event, extra.id, 'stretch')"></button>
                @if (isSelected(extra.id)) {
                  <button class="delete-element-btn" type="button" title="Borrar elemento" (click)="deleteRequest.emit(extra.id)">
                    <span class="material-symbols-outlined" style="font-size: 16px;">delete</span>
                  </button>
                }
              </div>
            }
          }

          @if (!isHidden('welcome-meta')) {
            <div class="design-box" data-design-kind="welcome-meta" [class.design-active]="designMode" [class.design-selected]="isSelected('welcome-meta')" [ngStyle]="boxStyle('welcome-meta')" (mousedown)="selectBox($event, 'welcome-meta')">
              <button class="move-handle" type="button" aria-label="Mover datos" (mousedown)="beginTransform($event, 'welcome-meta', 'move')"></button>
              <div class="welcome-meta">
                <span>{{ questionCount }} pregunta{{ questionCount === 1 ? '' : 's' }}</span>
                <span>Respuesta segura</span>
              </div>
              <button class="resize-handle" type="button" aria-label="Redimensionar datos" (mousedown)="beginTransform($event, 'welcome-meta', 'resize')"></button>
              <button class="stretch-handle" type="button" aria-label="Estirar datos" (mousedown)="beginTransform($event, 'welcome-meta', 'stretch')"></button>
            </div>
          }

          @if (!isHidden('welcome-cta')) {
            <div class="design-box" data-design-kind="welcome-cta" [class.design-active]="designMode" [class.design-selected]="isSelected('welcome-cta')" [ngStyle]="boxStyle('welcome-cta')" (mousedown)="selectBox($event, 'welcome-cta')">
              <button class="move-handle" type="button" aria-label="Mover boton" (mousedown)="beginTransform($event, 'welcome-cta', 'move')"></button>
              <button class="welcome-button" type="button" (click)="!designMode && start.emit()">
                @if (designMode) {
                  <span
                    contenteditable="true"
                    class="button-editable"
                    [style.font-size.px]="fontSize('welcome-cta')"
                    (click)="$event.stopPropagation()"
                    (mousedown)="$event.stopPropagation()"
                    (keydown)="preventEditableEnter($event)"
                    (blur)="emitEditable($event, ctaTextChange)">
                    {{ survey.metadata?.ctaText || 'Iniciar Encuesta Ahora' }}
                  </span>
                } @else {
                  <span [style.font-size.px]="fontSize('welcome-cta')">{{ survey.metadata?.ctaText || 'Iniciar Encuesta Ahora' }}</span>
                }
              </button>
              <button class="resize-handle" type="button" aria-label="Redimensionar boton" (mousedown)="beginTransform($event, 'welcome-cta', 'resize')"></button>
              <button class="stretch-handle" type="button" aria-label="Estirar boton" (mousedown)="beginTransform($event, 'welcome-cta', 'stretch')"></button>
            </div>
          }
        </div>

        <div class="preview-zone positioning-root" [class.positioned-layout]="usesPreviewPositioning()" [style.min-height.px]="positionedPreviewHeight()">
          <div class="design-box" data-design-kind="welcome-preview" [class.design-active]="designMode" [class.design-selected]="isSelected('welcome-preview')" [ngStyle]="boxStyle('welcome-preview')" (mousedown)="selectBox($event, 'welcome-preview')">
            <button class="move-handle" type="button" aria-label="Mover vista previa" (mousedown)="beginTransform($event, 'welcome-preview', 'move')"></button>
            <aside class="welcome-preview" aria-hidden="true">
              <div class="preview-topline"></div>
              <div class="preview-title"></div>
              <div class="preview-line wide"></div>
              <div class="preview-line"></div>
              <div class="preview-options">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </aside>
            <button class="resize-handle" type="button" aria-label="Redimensionar vista previa" (mousedown)="beginTransform($event, 'welcome-preview', 'resize')"></button>
            <button class="stretch-handle" type="button" aria-label="Estirar vista previa" (mousedown)="beginTransform($event, 'welcome-preview', 'stretch')"></button>
          </div>
        </div>
      </div>
    </section>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
    }

    .welcome-shell {
      min-height: 100svh;
      display: grid;
      place-items: center;
      padding: clamp(24px, 5vw, 72px);
      position: relative;
      z-index: 1;
    }

    .welcome-card {
      position: relative;
      width: min(980px, 100%);
      padding: clamp(32px, 6vw, 72px);
      border-radius: var(--response-card-radius, 28px);
      background:
        linear-gradient(180deg, rgba(255, 255, 255, 0.92), rgba(255, 255, 255, 0.84)),
        var(--response-surface, #ffffff);
      border: 1px solid rgba(15, 23, 42, 0.08);
      box-shadow: 0 28px 90px rgba(15, 23, 42, 0.16);
      color: var(--response-text, #111827);
      display: grid;
      grid-template-columns: minmax(0, 1fr) 280px;
      gap: clamp(28px, 5vw, 56px);
      align-items: center;
      backdrop-filter: blur(18px);
      min-height: min(720px, calc(100svh - 48px));
    }

    .welcome-content {
      text-align: left;
    }

    .welcome-content.positioned-layout,
    .preview-zone.positioned-layout {
      position: relative;
    }

    .preview-zone {
      min-width: 0;
    }

    .design-box {
      position: relative;
      box-sizing: border-box;
      width: fit-content;
      max-width: 100%;
    }

    .positioned-layout > .design-box {
      position: absolute;
      min-width: 40px;
      min-height: 26px;
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
    .resize-handle,
    .stretch-handle {
      display: none;
      position: absolute;
      z-index: 20;
      border: 0;
      background: var(--response-primary, #7c3aed);
      box-shadow: 0 8px 18px rgba(15, 23, 42, 0.18);
    }

    .design-selected .move-handle,
    .design-selected .resize-handle,
    .design-selected .stretch-handle {
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

    .delete-element-btn {
      position: absolute;
      top: -12px;
      right: -12px;
      width: 28px;
      height: 28px;
      border-radius: 999px;
      background: #ef4444;
      color: white;
      border: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      z-index: 30;
      box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4);
      transition: transform 0.2s ease, background 0.2s ease;
    }

    .delete-element-btn:hover {
      background: #dc2626;
      transform: scale(1.1);
    }

    .resize-handle {
      right: -7px;
      bottom: -7px;
      width: 14px;
      height: 14px;
      border-radius: 5px;
      cursor: nwse-resize;
    }

    .stretch-handle {
      right: -5px;
      top: 50%;
      width: 8px;
      height: 24px;
      border-radius: 999px;
      transform: translateY(-50%);
      cursor: ew-resize;
    }

    .welcome-logo {
      width: 100%;
      height: 100%;
      object-fit: contain;
      margin: 0 0 28px;
      display: block;
    }

    .welcome-kicker {
      width: fit-content;
      margin: 0 0 16px;
      padding: 8px 14px;
      border-radius: 999px;
      background: color-mix(in srgb, var(--response-primary, #7c3aed) 12%, white);
      color: var(--response-primary, #7c3aed);
      font-size: 12px;
      font-weight: 850;
      letter-spacing: 0.12em;
      text-transform: uppercase;
    }

    h1 {
      margin: 0;
      font-family: var(--response-title-font, Inter, sans-serif);
      font-size: clamp(36px, 6vw, 68px);
      line-height: 1.02;
      letter-spacing: 0;
      color: var(--response-heading, #111827);
    }

    p {
      max-width: 620px;
      margin: 22px 0 0;
      color: var(--response-muted, #64748b);
      font-size: clamp(16px, 2vw, 20px);
      line-height: 1.65;
    }

    .welcome-meta {
      display: flex;
      justify-content: flex-start;
      flex-wrap: wrap;
      gap: 10px;
      margin-top: 28px;
      color: var(--response-muted, #64748b);
      font-size: 13px;
      font-weight: 700;
    }

    .welcome-meta span {
      padding: 8px 12px;
      border-radius: 999px;
      background: rgba(15, 23, 42, 0.05);
    }

    .welcome-button {
      margin-top: 36px;
      min-width: min(100%, 280px);
      border: 0;
      border-radius: var(--response-button-radius, 18px);
      padding: 18px 32px;
      color: var(--response-button-text, #ffffff);
      background: linear-gradient(135deg, var(--response-button, #7c3aed), var(--response-secondary, #06b6d4));
      box-shadow: 0 18px 42px color-mix(in srgb, var(--response-primary, #7c3aed) 30%, transparent);
      font: inherit;
      font-weight: 850;
      font-size: 17px;
      cursor: pointer;
      transition: transform 180ms ease, box-shadow 180ms ease, filter 180ms ease;
    }

    .welcome-enter-hint {
      margin-left: 14px;
      border-radius: 999px;
      padding: 4px 8px;
      background: rgba(255, 255, 255, 0.22);
      color: inherit;
      font-size: 11px;
      font-weight: 900;
      letter-spacing: 0;
    }

    .welcome-security-note {
      margin-top: 12px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      color: var(--response-muted, #64748b);
      font-size: 12px;
      font-weight: 850;
    }

    .welcome-security-note span {
      font-family: "Material Symbols Outlined";
      font-size: 16px;
      line-height: 1;
    }

    .welcome-preview {
      min-height: 360px;
      height: 100%;
      border-radius: 28px;
      padding: 28px;
      background:
        linear-gradient(180deg, rgba(255,255,255,0.28), rgba(255,255,255,0.12)),
        color-mix(in srgb, var(--response-primary, #7c3aed) 14%, transparent);
      border: 1px solid rgba(255,255,255,0.38);
      box-shadow: inset 0 1px 0 rgba(255,255,255,0.32), 0 24px 60px rgba(15,23,42,0.12);
    }

    .preview-topline,
    .preview-title,
    .preview-line,
    .preview-options span {
      display: block;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.72);
    }

    .preview-topline {
      width: 76px;
      height: 12px;
      margin-bottom: 42px;
      background: color-mix(in srgb, var(--response-primary, #7c3aed) 32%, white);
    }

    .preview-title {
      width: 88%;
      height: 22px;
      margin-bottom: 18px;
    }

    .preview-line {
      width: 64%;
      height: 12px;
      margin-bottom: 12px;
      opacity: 0.68;
    }

    .preview-line.wide {
      width: 100%;
    }

    .preview-options {
      display: grid;
      gap: 12px;
      margin-top: 46px;
    }

    .preview-options span {
      height: 46px;
      border-radius: 16px;
      background: rgba(255, 255, 255, 0.55);
    }

    .positioned-layout .welcome-logo,
    .positioned-layout .welcome-kicker,
    .positioned-layout p,
    .positioned-layout .welcome-meta,
    .positioned-layout .welcome-button {
      margin: 0;
    }

    .welcome-button:hover {
      transform: translateY(-2px);
      filter: brightness(1.04);
      box-shadow: 0 24px 54px color-mix(in srgb, var(--response-primary, #7c3aed) 36%, transparent);
    }

    .welcome-button:active {
      transform: translateY(0);
    }

    .layout-centered .welcome-card {
      width: min(760px, 100%);
      grid-template-columns: 1fr;
      justify-items: center;
      text-align: center;
      min-height: auto;
    }

    .layout-centered .welcome-content {
      text-align: center;
    }

    .layout-centered .design-box {
      margin-inline: auto;
    }

    .layout-centered .welcome-kicker,
    .layout-centered .welcome-logo {
      margin-left: auto;
      margin-right: auto;
    }

    .layout-centered p {
      margin-left: auto;
      margin-right: auto;
    }

    .layout-centered .welcome-meta {
      justify-content: center;
    }

    .layout-centered .preview-zone {
      width: min(420px, 100%);
    }

    .layout-centered .welcome-preview {
      min-height: 180px;
      padding: 18px;
    }

    .layout-centered .preview-options {
      grid-template-columns: repeat(3, 1fr);
      margin-top: 24px;
    }

    .layout-centered .preview-options span {
      height: 34px;
    }

    .welcome-shell.layout-poster {
      place-items: stretch;
    }

    .layout-poster .welcome-card {
      width: min(1120px, 100%);
      min-height: min(760px, calc(100svh - 48px));
      grid-template-columns: minmax(0, 0.72fr) minmax(360px, 1.28fr);
      padding: clamp(26px, 4vw, 48px);
      background:
        linear-gradient(90deg, rgba(255,255,255,0.96) 0%, rgba(255,255,255,0.88) 42%, rgba(255,255,255,0.18) 100%),
        var(--response-background-image),
        linear-gradient(135deg, var(--response-primary, #7c3aed), var(--response-secondary, #06b6d4));
      background-size: cover;
      background-position: center;
      overflow: hidden;
    }

    .layout-poster .preview-zone {
      min-height: 100%;
      order: 2;
    }

    .layout-poster .welcome-preview {
      min-height: 520px;
      border-radius: 32px;
      background: rgba(15, 23, 42, 0.22);
      border-color: rgba(255, 255, 255, 0.32);
      box-shadow: inset 0 1px 0 rgba(255,255,255,0.24), 0 34px 80px rgba(15,23,42,0.22);
    }

    .welcome-shell.layout-minimal {
      place-items: start center;
    }

    .layout-minimal .welcome-card {
      width: min(820px, 100%);
      min-height: auto;
      grid-template-columns: 1fr;
      padding: clamp(28px, 7vw, 78px) 0;
      background: transparent;
      border: 0;
      border-radius: 0;
      box-shadow: none;
      backdrop-filter: none;
    }

    .layout-minimal .welcome-kicker,
    .layout-minimal .welcome-meta,
    .layout-minimal .preview-zone {
      display: none;
    }

    .layout-minimal h1 {
      max-width: 760px;
      font-size: clamp(40px, 8vw, 82px);
    }

    .layout-minimal p {
      max-width: 680px;
      font-size: clamp(17px, 2.2vw, 22px);
    }

    .layout-minimal .welcome-button {
      min-width: 0;
      border-radius: 0;
      padding-inline: 0;
      color: var(--response-primary, #7c3aed);
      background: transparent;
      box-shadow: inset 0 -2px 0 currentColor;
    }

    .layout-editorial .welcome-card {
      width: min(1080px, 100%);
      grid-template-columns: minmax(0, 0.78fr) minmax(280px, 0.72fr);
      align-items: stretch;
      padding: 0;
      overflow: hidden;
      background: #ffffff;
      border-radius: 10px;
      box-shadow: 0 34px 90px rgba(15, 23, 42, 0.14);
    }

    .layout-editorial .welcome-content {
      padding: clamp(34px, 6vw, 76px);
      border-right: 1px solid var(--response-border, rgba(15,23,42,0.12));
    }

    .layout-editorial .welcome-kicker {
      border-radius: 0;
      padding-left: 0;
      background: transparent;
      box-shadow: inset 0 -2px 0 currentColor;
    }

    .layout-editorial h1 {
      max-width: 700px;
      font-size: clamp(44px, 7vw, 86px);
      line-height: 0.96;
    }

    .layout-editorial .preview-zone {
      display: grid;
      align-items: stretch;
      padding: clamp(24px, 4vw, 44px);
      background:
        linear-gradient(180deg, color-mix(in srgb, var(--response-primary, #7c3aed) 12%, #ffffff), #ffffff);
    }

    .layout-editorial .welcome-preview {
      min-height: 100%;
      border-radius: 0;
      background: transparent;
      border: 0;
      box-shadow: none;
    }

    .layout-orbit .welcome-card {
      width: min(1060px, 100%);
      grid-template-columns: minmax(0, 1fr) 340px;
      background:
        radial-gradient(circle at 78% 24%, color-mix(in srgb, var(--response-secondary, #06b6d4) 28%, transparent), transparent 28%),
        radial-gradient(circle at 24% 88%, color-mix(in srgb, var(--response-primary, #7c3aed) 24%, transparent), transparent 34%),
        color-mix(in srgb, var(--response-bg, #f5f3ff) 76%, #ffffff);
      overflow: hidden;
    }

    .layout-orbit .welcome-card::before,
    .layout-orbit .welcome-card::after {
      content: "";
      position: absolute;
      border-radius: 50%;
      pointer-events: none;
    }

    .layout-orbit .welcome-card::before {
      width: 420px;
      height: 420px;
      right: -130px;
      top: -120px;
      border: 1px solid color-mix(in srgb, var(--response-primary, #7c3aed) 24%, transparent);
    }

    .layout-orbit .welcome-card::after {
      width: 220px;
      height: 220px;
      right: 120px;
      bottom: 48px;
      border: 1px solid color-mix(in srgb, var(--response-secondary, #06b6d4) 34%, transparent);
    }

    .layout-orbit .welcome-preview {
      transform: rotate(3deg);
      min-height: 420px;
      border-radius: 34px;
      background: rgba(255, 255, 255, 0.32);
      backdrop-filter: blur(20px);
    }

    .layout-showcase .welcome-card {
      width: min(1120px, 100%);
      grid-template-columns: minmax(340px, 0.9fr) minmax(0, 1fr);
      padding: clamp(24px, 4vw, 44px);
      background:
        linear-gradient(110deg, rgba(255,255,255,0.94) 0 46%, rgba(255,255,255,0.26) 46% 100%),
        var(--response-background-image),
        linear-gradient(135deg, var(--response-bg, #f5f3ff), var(--response-secondary, #06b6d4));
      background-size: cover;
      background-position: center;
    }

    .layout-showcase .welcome-content {
      order: 2;
      align-self: end;
      padding: clamp(20px, 4vw, 46px);
      border-radius: 28px;
      background: rgba(255, 255, 255, 0.78);
      backdrop-filter: blur(18px);
    }

    .layout-showcase .preview-zone {
      order: 1;
      align-self: stretch;
    }

    .layout-showcase .welcome-preview {
      min-height: 520px;
      background: rgba(15, 23, 42, 0.18);
    }

    .layout-diagonal .welcome-card {
      width: min(1040px, 100%);
      grid-template-columns: minmax(0, 1fr) 320px;
      padding: clamp(30px, 5vw, 64px);
      background:
        linear-gradient(124deg, #ffffff 0 57%, color-mix(in srgb, var(--response-primary, #7c3aed) 14%, #ffffff) 57% 100%);
      overflow: hidden;
    }

    .layout-diagonal .welcome-content {
      transform: translateY(10px);
    }

    .layout-diagonal .welcome-kicker {
      border-radius: 8px;
      transform: skewX(-10deg);
    }

    .layout-diagonal .welcome-preview {
      min-height: 420px;
      transform: skewY(-5deg);
      border-radius: 18px;
    }

    .design-editable,
    .button-editable {
      outline: none;
      border-radius: 8px;
      cursor: text;
      transition: background 160ms ease;
    }

    .design-editable {
      width: fit-content;
      display: inline-block;
      max-width: 100%;
    }

    .design-editable:hover,
    .design-editable:focus,
    .button-editable:hover,
    .button-editable:focus {
      background: color-mix(in srgb, var(--response-primary, #7c3aed) 7%, transparent);
    }

    .button-editable {
      display: inline-block;
      min-width: 6ch;
    }

    @media (max-width: 640px) {
      .welcome-shell {
        align-items: stretch;
        padding: 18px;
      }

      .welcome-card {
        display: flex;
        min-height: calc(100svh - 36px);
        flex-direction: column;
        justify-content: center;
        padding: 28px;
      }

      .welcome-content {
        text-align: center;
      }

      .welcome-content.positioned-layout,
      .preview-zone.positioned-layout {
        min-height: 520px;
      }

      .welcome-kicker,
      .welcome-logo {
        margin-left: auto;
        margin-right: auto;
      }

      .welcome-meta {
        justify-content: center;
      }

      .welcome-preview {
        display: none;
      }

      .welcome-button {
        width: 100%;
      }

      .layout-editorial .welcome-card,
      .layout-orbit .welcome-card,
      .layout-showcase .welcome-card,
      .layout-diagonal .welcome-card {
        grid-template-columns: 1fr;
        padding: 28px;
      }

      .layout-editorial .welcome-content,
      .layout-showcase .welcome-content {
        padding: 0;
        border-right: 0;
        background: transparent;
      }

      .layout-showcase .welcome-content,
      .layout-showcase .preview-zone {
        order: initial;
      }

      .layout-orbit .welcome-preview,
      .layout-showcase .welcome-preview,
      .layout-diagonal .welcome-preview {
        display: none;
      }
    }
  `]
})
export class SurveyWelcomeScreenComponent {
  @Input({ required: true }) survey!: Survey;
  @Input({ required: true }) brand!: SurveyBrand;
  @Input() questionCount = 0;
  @Input() designMode = false;
  @Output() start = new EventEmitter<void>();
  @Output() titleChange = new EventEmitter<string>();
  @Output() descriptionChange = new EventEmitter<string>();
  @Output() ctaTextChange = new EventEmitter<string>();
  @Output() extraTextChange = new EventEmitter<{id: string, text: string}>();
  @Output() deleteRequest = new EventEmitter<WelcomeDesignKind>();
  @Output() transformStart = new EventEmitter<{ event: MouseEvent; kind: WelcomeDesignKind; mode: TransformMode; frame?: SurveyElementConfig; frames?: Record<string, SurveyElementConfig> }>();
  selectedKind: WelcomeDesignKind | null = null;

  welcomeLayout(): NonNullable<Survey['metadata']>['welcomeLayout'] {
    return this.survey.metadata?.welcomeLayout ?? 'split';
  }

  fontSize(kind: WelcomeDesignKind): number | null {
    return this.configFor(kind).fontSize ?? null;
  }

  private readonly defaults: Record<WelcomeDesignKind, SurveyElementConfig> = {
    logo: { x: 0, y: 0, width: 160, height: 72 },
    'welcome-kicker': { x: 0, y: 102, width: 196, height: 38 },
    'welcome-title': { x: 0, y: 158, width: 560, height: 150 },
    'welcome-desc': { x: 0, y: 330, width: 560, height: 108 },
    'welcome-meta': { x: 0, y: 468, width: 360, height: 44 },
    'welcome-cta': { x: 0, y: 548, width: 280, height: 64 },
    'welcome-preview': { x: 0, y: 0, width: 280, height: 360 }
  };

  emitEditable(event: Event, output: EventEmitter<string>): void {
    const value = (event.target as HTMLElement).innerText.trim();
    output.emit(value);
  }

  preventEditableEnter(event: KeyboardEvent): void {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    (event.target as HTMLElement).blur();
  }

  beginTransform(event: MouseEvent, kind: WelcomeDesignKind, mode: TransformMode): void {
    if (!this.designMode) return;
    this.selectedKind = kind;
    this.transformStart.emit({ event, kind, mode, frame: this.measureFrame(event), frames: this.measureSiblingFrames(event) });
  }

  selectBox(event: MouseEvent, kind: WelcomeDesignKind): void {
    if (!this.designMode) return;
    event.stopPropagation();
    this.selectedKind = kind;
  }

  isSelected(kind: WelcomeDesignKind): boolean {
    return this.designMode && this.selectedKind === kind;
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyDown(event: KeyboardEvent) {
    if (!this.designMode || !this.selectedKind) return;
    if (event.key === 'Delete' || event.key === 'Backspace') {
      const activeElement = document.activeElement;
      const isInput = activeElement?.tagName === 'INPUT' || 
                      activeElement?.tagName === 'TEXTAREA' || 
                      activeElement?.hasAttribute('contenteditable') || 
                      activeElement?.getAttribute('contenteditable') === 'true' || 
                      (activeElement as HTMLElement)?.isContentEditable === true;
      if (!isInput) {
        this.deleteRequest.emit(this.selectedKind);
        this.selectedKind = null;
      }
    }
  }

  isHidden(kind: WelcomeDesignKind): boolean {
    return this.configFor(kind).hidden === true;
  }

  boxStyle(kind: WelcomeDesignKind): Record<string, string> {
    const config = this.configFor(kind);
    if (!this.shouldUsePositionedStyle(kind)) return {};
    return {
      position: 'absolute',
      left: `${config.x}px`,
      top: `${config.y}px`,
      width: `${config.width}px`,
      height: `${config.height}px`,
      zIndex: `${config.zIndex ?? (kind === 'welcome-preview' ? 4 : 10)}`
    };
  }

  usesPositionedLayout(): boolean {
    return this.hasStoredConfig('logo')
      || this.hasStoredConfig('welcome-kicker')
      || this.hasStoredConfig('welcome-title')
      || this.hasStoredConfig('welcome-desc')
      || this.hasStoredConfig('welcome-meta')
      || this.hasStoredConfig('welcome-cta');
  }

  usesPreviewPositioning(): boolean {
    return this.hasStoredConfig('welcome-preview');
  }

  positionedContentHeight(): number | null {
    if (!this.usesPositionedLayout()) return null;
    return this.maxElementBottom([
      this.brand.logoUrl ? this.configFor('logo') : undefined,
      this.configFor('welcome-kicker'),
      this.configFor('welcome-title'),
      this.configFor('welcome-desc'),
      this.configFor('welcome-meta'),
      this.configFor('welcome-cta')
    ], 24);
  }

  positionedPreviewHeight(): number | null {
    if (!this.usesPreviewPositioning()) return null;
    return this.maxElementBottom([this.configFor('welcome-preview')], 0);
  }

  emitExtraTextChange(event: Event, id: string): void {
    const el = event.target as HTMLElement;
    this.extraTextChange.emit({ id, text: el.innerText.trim() });
  }

  shouldUsePositionedStyle(kind: WelcomeDesignKind): boolean {
    return kind === 'welcome-preview'
      ? this.usesPreviewPositioning()
      : this.usesPositionedLayout();
  }

  private configFor(kind: WelcomeDesignKind): SurveyElementConfig {
    const metadata = this.survey.metadata;
    if (kind.startsWith('extra-text-')) {
      const extra = metadata?.welcomeExtraTexts?.find(t => t.id === kind);
      return extra?.config ?? { x: 50, y: 350, width: 300, height: 40 };
    }
    const stored = kind === 'logo' ? this.brand.logoConfig
      : kind === 'welcome-kicker' ? metadata?.welcomeKickerConfig
      : kind === 'welcome-title' ? metadata?.welcomeTitleConfig
      : kind === 'welcome-desc' ? metadata?.welcomeDescConfig
      : kind === 'welcome-meta' ? metadata?.welcomeMetaConfig
      : kind === 'welcome-cta' ? metadata?.welcomeCtaConfig
      : metadata?.welcomePreviewConfig;
    return { ...this.defaults[kind], ...(stored ?? {}) };
  }

  private hasStoredConfig(kind: WelcomeDesignKind): boolean {
    const metadata = this.survey.metadata;
    if (kind.startsWith('extra-text-')) {
      return true; // Extra texts are always positioned in the canvas
    }
    return kind === 'logo' ? this.brand.logoConfig?.positioned === true
      : kind === 'welcome-kicker' ? metadata?.welcomeKickerConfig?.positioned === true
      : kind === 'welcome-title' ? metadata?.welcomeTitleConfig?.positioned === true
      : kind === 'welcome-desc' ? metadata?.welcomeDescConfig?.positioned === true
      : kind === 'welcome-meta' ? metadata?.welcomeMetaConfig?.positioned === true
      : kind === 'welcome-cta' ? metadata?.welcomeCtaConfig?.positioned === true
      : metadata?.welcomePreviewConfig?.positioned === true;
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
    return !!element?.closest('[contenteditable="true"], input, textarea, select, .move-handle, .resize-handle, .stretch-handle');
  }
}
