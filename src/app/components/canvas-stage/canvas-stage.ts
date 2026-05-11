import { Component, Input, Output, EventEmitter, ViewChild, OnInit, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgxMoveableModule, NgxMoveableComponent } from 'ngx-moveable';
import { CanvasElementComponent } from '../canvas-element/canvas-element';
import { CanvasScreen, CanvasElement } from '../../services/survey.service';

@Component({
  selector: 'app-canvas-stage',
  standalone: true,
  imports: [CommonModule, NgxMoveableModule, CanvasElementComponent],
  template: `
    <div class="canvas-board" 
         #canvasBoard 
         [ngStyle]="getBackgroundStyle()" 
         [class.readonly-mode]="isReadonly"
         (mousedown)="onBoardClick($event)">
      
      @if (!isReadonly) {
        <div class="canvas-grid-overlay"></div>
      }

      @for (el of screen.elements; track el.id) {
        <div class="moveable-target"
             [id]="el.id"
             [style.left.px]="el.x"
             [style.top.px]="el.y"
             [style.width.px]="el.width"
             [style.height.px]="el.height"
             [style.transform]="'rotate(' + el.rotation + 'deg)'"
             [style.z-index]="el.zIndex"
             (mousedown)="!isReadonly && onElementMouseDown($event, el.id)">
             
          <app-canvas-element 
            [element]="el"
            [selected]="!isReadonly && selectedIds.includes(el.id)"
            [isReadonly]="isReadonly"
            (contentChange)="onContentChange(el.id, $event)">
          </app-canvas-element>
        </div>
      }
      
      @if (!isReadonly) {
        <ngx-moveable
          #moveable
          [target]="moveableTargets"
          [draggable]="true"
          [resizable]="true"
          [rotatable]="true"
          [keepRatio]="false"
          [snappable]="true"
          (drag)="onDrag($event)"
          (dragEnd)="onDragEnd($event)"
          (resize)="onResize($event)"
          (resizeEnd)="onResizeEnd($event)"
          (rotate)="onRotate($event)"
          (rotateEnd)="onRotateEnd($event)"
        ></ngx-moveable>
      }
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 1000px;
      height: 600px;
      margin: 0 auto;
      background: white;
      position: relative;
      z-index: 1;
    }
    .canvas-board {
      width: 100%;
      height: 100%;
      position: relative;
      overflow: hidden;
      border-radius: 12px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.05);
    }
    .canvas-grid-overlay {
      position: absolute;
      top: 0; left: 0; right: 0; bottom: 0;
      background-image: radial-gradient(circle, #e5e7eb 1px, transparent 1px);
      background-size: 20px 20px;
      pointer-events: none;
      opacity: 0.5;
    }
    .moveable-target {
      position: absolute;
      will-change: transform, left, top, width, height;
    }
    .readonly-mode {
      cursor: default;
    }
    :host ::ng-deep .moveable-control-box {
      z-index: 9999 !important;
    }
    :host ::ng-deep .moveable-line {
      background: #3b82f6 !important;
    }
    :host ::ng-deep .moveable-control {
      background: #ffffff !important;
      border: 2px solid #3b82f6 !important;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
  `]
})
export class CanvasStageComponent implements OnInit, OnChanges {
  @Input({ required: true }) screen!: CanvasScreen;
  @Input() selectedIds: string[] = [];
  @Input() isReadonly: boolean = false;
  
  @Output() selectionChange = new EventEmitter<string[]>();
  @Output() elementUpdate = new EventEmitter<{ id: string, changes: Partial<CanvasElement> }>();

  @ViewChild('moveable') moveable!: NgxMoveableComponent;
  
  moveableTargets: Array<HTMLElement | SVGElement> = [];

  ngOnInit() {
    this.updateTargets();
  }

  ngOnChanges() {
    this.updateTargets();
  }

  updateTargets() {
    setTimeout(() => {
      const lockedIds = new Set((this.screen?.elements ?? []).filter((element) => element.locked).map((element) => element.id));
      this.moveableTargets = this.selectedIds
        .filter((id) => !lockedIds.has(id))
        .map(id => document.getElementById(id))
        .filter((el): el is HTMLElement => el !== null);
    });
  }

  getBackgroundStyle() {
    if (!this.screen || !this.screen.background) return {};
    if (this.screen.background.type === 'solid') {
      return { backgroundColor: this.screen.background.value };
    }
    if (this.screen.background.type === 'gradient') {
      return { backgroundImage: this.screen.background.value };
    }
    if (this.screen.background.type === 'image') {
      return { backgroundImage: `url(${this.screen.background.value})`, backgroundSize: 'cover', backgroundPosition: 'center' };
    }
    return {};
  }

  onBoardClick(e: MouseEvent) {
    if (e.target === e.currentTarget) {
      this.selectionChange.emit([]);
    }
  }

  onElementMouseDown(e: MouseEvent, id: string) {
    e.stopPropagation();
    if (!this.selectedIds.includes(id)) {
      if (e.shiftKey) {
        this.selectionChange.emit([...this.selectedIds, id]);
      } else {
        this.selectionChange.emit([id]);
      }
    }
  }

  onContentChange(id: string, content: string) {
    this.elementUpdate.emit({ id, changes: { content } });
  }

  onDrag({ target, left, top }: any) {
    target.style.left = `${left}px`;
    target.style.top = `${top}px`;
  }
  
  onDragEnd({ target }: any) {
    if (this.isElementLocked(target.id)) return;
    const left = parseFloat(target.style.left);
    const top = parseFloat(target.style.top);
    this.elementUpdate.emit({ id: target.id, changes: { x: left, y: top } });
  }

  onResize({ target, width, height, drag }: any) {
    target.style.width = `${width}px`;
    target.style.height = `${height}px`;
    target.style.left = `${drag.left}px`;
    target.style.top = `${drag.top}px`;
  }
  
  onResizeEnd({ target }: any) {
    if (this.isElementLocked(target.id)) return;
    const width = parseFloat(target.style.width);
    const height = parseFloat(target.style.height);
    const left = parseFloat(target.style.left);
    const top = parseFloat(target.style.top);
    this.elementUpdate.emit({ id: target.id, changes: { width, height, x: left, y: top } });
  }

  onRotate({ target, transform }: any) {
    target.style.transform = transform;
  }
  
  onRotateEnd({ target }: any) {
    if (this.isElementLocked(target.id)) return;
    const rotationStr = target.style.transform;
    const match = rotationStr.match(/rotate\(([-\d.]+)deg\)/);
    const rotation = match ? parseFloat(match[1]) : 0;
    this.elementUpdate.emit({ id: target.id, changes: { rotation } });
  }

  private isElementLocked(id: string): boolean {
    return this.screen.elements.some((element) => element.id === id && element.locked);
  }
}
