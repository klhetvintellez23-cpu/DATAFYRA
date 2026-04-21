import { Component, Input, OnInit, OnDestroy, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';

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
  @Input() text: string = '';
  @Input() speed: number = 40;     // ms per character
  @Input() delay: number = 0;      // initial delay before first typing
  @Input() loopDelay: number = 5000; // wait 5s before re-typing

  displayedText = signal('');
  completed = signal(false);
  private timeoutId?: any;

  ngOnInit() {
    if (this.delay > 0) {
      this.timeoutId = setTimeout(() => this.startTyping(), this.delay);
    } else {
      this.startTyping();
    }
  }

  private startTyping() {
    this.displayedText.set('');
    this.completed.set(false);
    
    let index = 0;
    const type = () => {
      if (index < this.text.length) {
        this.displayedText.update(t => t + this.text[index]);
        index++;
        this.timeoutId = setTimeout(type, this.speed);
      } else {
        this.completed.set(true);
        // Loop logic: wait loopDelay then restart
        this.timeoutId = setTimeout(() => this.startTyping(), this.loopDelay);
      }
    };
    type();
  }

  ngOnDestroy() {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }
  }
}
