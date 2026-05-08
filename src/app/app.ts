import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthModalComponent } from './components/auth-modal/auth-modal.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, AuthModalComponent],
  template: `
    <router-outlet></router-outlet>
    <app-auth-modal></app-auth-modal>
  `,
  styles: [`:host { display: block; min-height: 100vh; }`]
})
export class App {}
