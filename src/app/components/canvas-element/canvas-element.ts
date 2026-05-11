import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CanvasElement } from '../../services/survey.service';

@Component({
  selector: 'app-canvas-element',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="element-wrapper"
         [class.is-selected]="selected"
         [class.is-locked]="element.locked"
         [class.is-hidden]="element.hidden"
         [style.width.px]="element.width"
         [style.height.px]="element.height"
         (click)="handleClick($event)">
         
      @if (element.type === 'text') {
        <div class="element-text" 
             [ngStyle]="element.styles" 
             [attr.contenteditable]="!isReadonly" 
             (blur)="onContentChange($event)">
          {{ element.content }}
        </div>
      }
      
      @if (element.type === 'button') {
        <button class="element-button" [ngStyle]="element.styles">
          {{ element.content }}
        </button>
      }
      
      @if (element.type === 'image') {
        <img class="element-image" [src]="element.content" [ngStyle]="element.styles" alt="Canvas image">
      }
      
      @if (element.type === 'shape') {
        <div class="element-shape" [ngStyle]="element.styles"></div>
      }
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
      height: 100%;
      pointer-events: auto;
    }
    .element-wrapper {
      width: 100%;
      height: 100%;
      position: relative;
    }
    .element-text {
      width: 100%;
      height: 100%;
      outline: none;
      word-wrap: break-word;
      white-space: pre-line;
    }
    .element-button {
      width: 100%;
      height: 100%;
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .element-image {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .element-shape {
      width: 100%;
      height: 100%;
    }
    .is-hidden {
      display: none !important;
    }
  `]
})
export class CanvasElementComponent {
  @Input({ required: true }) element!: CanvasElement;
  @Input() selected = false;
  @Input() isReadonly = false;
  
  @Output() elementClick = new EventEmitter<MouseEvent>();
  @Output() contentChange = new EventEmitter<string>();

  handleClick(event: MouseEvent) {
    if (this.isReadonly) return;
    if (!this.element.locked) {
      this.elementClick.emit(event);
    }
  }

  onContentChange(event: Event) {
    if (this.isReadonly) return;
    const target = event.target as HTMLElement;
    this.contentChange.emit(target.innerText);
  }
}
