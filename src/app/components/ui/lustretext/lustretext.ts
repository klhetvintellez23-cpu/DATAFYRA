import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-lustre-text',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span class="lustre-text" 
          [class.disabled]="disabled"
          [style.--speed]="speed + 's'"
          [style.--text-color]="textColor">
      {{ text }}
    </span>
  `,
  styleUrl: './lustretext.css'
})
export class LustreTextComponent {
  @Input() text: string = '';
  @Input() speed: number = 3;
  @Input() disabled: boolean = false;
  @Input() textColor: string = '#1F2937'; // Default text color from landing
}
