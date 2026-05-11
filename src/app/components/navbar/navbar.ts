import { Component, inject, input, output, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { CommonModule } from '@angular/common';
import { WavyButtonComponent } from '../ui/wavy-button/wavy-button';
import { AuthModalService } from '../../services/auth-modal.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, WavyButtonComponent],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css'
})
export class NavbarComponent {
  transparent = input(false);
  hijackAuth = input(false);
  isOverlayOpen = input(false);
  authModal = inject(AuthModalService);
  mobileMenuOpen = signal(false);

  authAction = output<boolean>();

  constructor(public auth: AuthService, public router: Router) {}

  get isInternalRoute(): boolean {
    const url = this.router.url;
    return url.startsWith('/dashboard') || url.startsWith('/editor') || url.startsWith('/analytics');
  }

  triggerAuth(isLogin: boolean, event?: Event) {
    if (event) event.preventDefault();
    this.mobileMenuOpen.set(false);
    if (this.hijackAuth()) {
      this.authAction.emit(isLogin);
    } else {
      this.authModal.open(isLogin ? 'login' : 'register');
    }
  }

  async logout(): Promise<void> {
    this.mobileMenuOpen.set(false);
    await this.auth.logout();
    this.router.navigate(['/']);
  }

  toggleMobileMenu(): void {
    this.mobileMenuOpen.update((open) => !open);
  }

  closeMobileMenu(): void {
    this.mobileMenuOpen.set(false);
  }
}
