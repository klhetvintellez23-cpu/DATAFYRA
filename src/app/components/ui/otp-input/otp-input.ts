import { Component, output, signal, viewChildren, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-otp-input',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="otp-container">
      @for (slot of slots; track $index) {
        <input
          #otpInput
          type="text"
          inputmode="numeric"
          maxlength="1"
          class="otp-slot"
          [value]="values()[$index] || ''"
          (input)="handleInput($event, $index)"
          (keydown)="handleKeyDown($event, $index)"
          (paste)="handlePaste($event)"
          placeholder="○"
        />
      }
    </div>
  `,
  styles: [`
    .otp-container {
      display: flex;
      gap: 0.75rem;
      justify-content: center;
      margin: 1.5rem 0;
    }

    .otp-slot {
      width: 45px;
      height: 55px;
      text-align: center;
      font-size: 1.5rem;
      font-weight: 700;
      color: #1F2937;
      background: rgba(255, 255, 255, 0.7);
      backdrop-filter: blur(8px);
      border: 2px solid rgba(229, 231, 235, 0.8);
      border-radius: 12px;
      outline: none;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
    }

    .otp-slot:focus {
      border-color: #7C3AED;
      box-shadow: 0 0 0 4px rgba(124, 58, 237, 0.1);
      transform: translateY(-2px);
      background: white;
    }

    .otp-slot::placeholder {
      color: #D1D5DB;
      font-size: 1rem;
    }

    @media (max-width: 480px) {
      .otp-slot {
        width: 38px;
        height: 48px;
        font-size: 1.25rem;
      }
      .otp-container {
        gap: 0.5rem;
      }
    }
  `]
})
export class OtpInputComponent {
  slots = new Array(6);
  values = signal<string[]>([]);
  codeChange = output<string>();

  inputs = viewChildren<ElementRef<HTMLInputElement>>('otpInput');

  handleInput(event: Event, index: number): void {
    const input = event.target as HTMLInputElement;
    const val = input.value.replace(/[^0-9]/g, ''); // Solo números
    
    const currentValues = [...this.values()];
    currentValues[index] = val.slice(-1);
    this.values.set(currentValues);

    this.emitChange();

    if (val && index < this.slots.length - 1) {
      this.inputs()[index + 1].nativeElement.focus();
    }
  }

  handleKeyDown(event: KeyboardEvent, index: number): void {
    if (event.key === 'Backspace' && !this.values()[index] && index > 0) {
      this.inputs()[index - 1].nativeElement.focus();
    }
  }

  handlePaste(event: ClipboardEvent): void {
    event.preventDefault();
    const pasteData = event.clipboardData?.getData('text').slice(0, 6).replace(/[^0-9]/g, '') || '';
    const newValues = pasteData.split('');
    this.values.set(newValues);
    this.emitChange();
    
    // Enfocar el último llenado o el siguiente disponible
    const nextIndex = Math.min(newValues.length, this.slots.length - 1);
    this.inputs()[nextIndex].nativeElement.focus();
  }

  private emitChange(): void {
    this.codeChange.emit(this.values().join(''));
  }
}
