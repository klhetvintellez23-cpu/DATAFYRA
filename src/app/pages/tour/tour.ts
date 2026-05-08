import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { NavbarComponent } from '../../components/navbar/navbar';
import { AuthModalService } from '../../services/auth-modal.service';

@Component({
  selector: 'app-tour',
  standalone: true,
  imports: [NavbarComponent],
  templateUrl: './tour.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TourPage {
  authModalService = inject(AuthModalService);

  openAuth(mode: 'login' | 'register', event: Event) {
    event.preventDefault();
    this.authModalService.open(mode);
  }
}
