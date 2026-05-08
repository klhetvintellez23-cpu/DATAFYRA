import { CommonModule } from '@angular/common';
import { Component, Input, OnDestroy, OnInit, signal } from '@angular/core';

@Component({
  selector: 'app-typing-text',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span class="typing-container">
      {{ displayedText() }}
    </span>
  `,
  styleUrl: './typing-text.css'
})
export class TypingTextComponent implements OnInit, OnDestroy {
  @Input() text = '';
  @Input() speed = 40;
  @Input() delay = 0;
  @Input() loopDelay = 5000;
  @Input() repeat = false;

  displayedText = signal('');
  completed = signal(false);
  private timeoutId?: ReturnType<typeof setTimeout>;

  ngOnInit(): void {
    if (this.delay > 0) {
      this.timeoutId = setTimeout(() => this.startTyping(), this.delay);
      return;
    }

    this.startTyping();
  }

  private startTyping(): void {
    this.displayedText.set('');
    this.completed.set(false);

    let index = 0;
    const type = () => {
      if (index < this.text.length) {
        this.displayedText.update((value) => value + this.text[index]);
        index++;
        this.timeoutId = setTimeout(type, this.speed);
        return;
      }

      this.completed.set(true);
      if (this.repeat) {
        this.timeoutId = setTimeout(() => this.startTyping(), this.loopDelay);
      }
    };

    type();
  }

  ngOnDestroy(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }
  }
}
