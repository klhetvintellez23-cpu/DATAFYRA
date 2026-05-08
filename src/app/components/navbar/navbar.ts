import { Component, input, output, EventEmitter, inject } from '@angular/core';
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

  authAction = output<boolean>();

  constructor(public auth: AuthService, private router: Router) {}

  triggerAuth(isLogin: boolean, event?: Event) {
    if (event) event.preventDefault();
    if (this.hijackAuth()) {
      this.authAction.emit(isLogin);
    } else {
      this.authModal.open(isLogin ? 'login' : 'register');
    }
  }

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/']);
  }
}
