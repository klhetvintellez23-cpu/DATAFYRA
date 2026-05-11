import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { QuestionOption } from '../../../services/survey.service';

@Component({
  selector: 'app-survey-option-input',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="option-list" [class.multi]="multiple">
      @for (option of options; track option.id) {
        <button
          class="option-button"
          type="button"
          [class.selected]="isSelected(option.texto)"
          (click)="toggle(option.texto)"
          [attr.aria-pressed]="isSelected(option.texto)">
          <span class="option-marker">
            @if (multiple && isSelected(option.texto)) {
              <span class="option-check">✓</span>
            }
          </span>
          <span class="option-text">{{ option.texto }}</span>
        </button>
      }
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }

    .option-list {
      display: grid;
      gap: 12px;
      width: 100%;
    }

    .option-button {
      width: 100%;
      display: grid;
      grid-template-columns: 24px 1fr;
      align-items: center;
      gap: 14px;
      border: 1px solid var(--response-border, #e2e8f0);
      border-radius: var(--response-button-radius, 16px);
      padding: 18px 20px;
      background: var(--response-answer-bg, #ffffff);
      color: var(--response-heading, #111827);
      font: inherit;
      font-weight: 720;
      text-align: left;
      cursor: pointer;
      box-shadow: 0 8px 22px rgba(15, 23, 42, 0.05);
      transition: transform 160ms ease, border-color 160ms ease, background 160ms ease, box-shadow 160ms ease;
      min-width: 0;
    }

    .option-button:hover {
      transform: translateY(-1px);
      border-color: color-mix(in srgb, var(--response-primary, #7c3aed) 42%, white);
      box-shadow: 0 12px 28px rgba(15, 23, 42, 0.08);
    }

    .option-button.selected {
      background: color-mix(in srgb, var(--response-primary, #7c3aed) 10%, white);
      border-color: var(--response-primary, #7c3aed);
      box-shadow: 0 14px 30px color-mix(in srgb, var(--response-primary, #7c3aed) 18%, transparent);
    }

    .option-marker {
      width: 22px;
      height: 22px;
      display: grid;
      place-items: center;
      border: 2px solid color-mix(in srgb, var(--response-muted, #64748b) 55%, white);
      border-radius: 999px;
      background: #ffffff;
      box-shadow: inset 0 0 0 4px #ffffff;
      color: #ffffff;
      font-size: 14px;
      font-weight: 900;
    }

    .multi .option-marker {
      border-radius: 7px;
    }

    .option-button.selected .option-marker {
      border-color: var(--response-primary, #7c3aed);
      background: var(--response-primary, #7c3aed);
    }

    .option-list:not(.multi) .option-button.selected .option-marker {
      box-shadow: inset 0 0 0 5px #ffffff;
    }

    .option-check {
      line-height: 1;
      transform: translateY(-1px);
    }

    .option-text {
      min-width: 0;
      overflow-wrap: anywhere;
      line-height: 1.35;
    }

    @media (max-width: 520px) {
      .option-button {
        grid-template-columns: 22px 1fr;
        gap: 12px;
        padding: 15px;
      }
    }
  `]
})
export class SurveyOptionInputComponent {
  @Input() options: QuestionOption[] = [];
  @Input() selected: string | string[] | undefined;
  @Input() multiple = false;
  @Output() valueChange = new EventEmitter<string | string[]>();

  isSelected(value: string): boolean {
    return Array.isArray(this.selected) ? this.selected.includes(value) : this.selected === value;
  }

  toggle(value: string): void {
    if (!this.multiple) {
      this.valueChange.emit(value);
      return;
    }

    const current = Array.isArray(this.selected) ? this.selected : [];
    this.valueChange.emit(
      current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value]
    );
  }
}
