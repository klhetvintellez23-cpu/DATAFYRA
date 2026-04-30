import { Injectable, signal } from '@angular/core';

export type AuthMode = 'login' | 'register';

@Injectable({
  providedIn: 'root'
})
export class AuthModalService {
  isOpen = signal<boolean>(false);
  mode = signal<AuthMode>('login');

  open(mode: AuthMode = 'login') {
    this.mode.set(mode);
    this.isOpen.set(true);
    // Optional: prevent background scrolling when modal is open
    document.body.style.overflow = 'hidden';
  }

  close() {
    this.isOpen.set(false);
    document.body.style.overflow = 'auto';
  }

  toggleMode() {
    this.mode.set(this.mode() === 'login' ? 'register' : 'login');
  }
}
