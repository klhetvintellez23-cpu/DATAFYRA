import { Component, input, output, EventEmitter } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { CommonModule } from '@angular/common';
import { WavyButtonComponent } from '../ui/wavy-button/wavy-button';

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

  authAction = output<boolean>();

  constructor(public auth: AuthService, private router: Router) {}

  triggerAuth(isLogin: boolean, event: Event) {
    if (this.hijackAuth()) {
      event.preventDefault();
      this.authAction.emit(isLogin);
    }
  }

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/']);
  }
}
