import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthModalService } from '../../services/auth-modal.service';
import { OtpInputComponent } from '../ui/otp-input/otp-input';

@Component({
  selector: 'app-auth-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, OtpInputComponent],
  templateUrl: './auth-modal.html',
  styles: [`
    .modal-enter {
      animation: modalFadeIn 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards;
    }
    @keyframes modalFadeIn {
      from { opacity: 0; backdrop-filter: blur(0px); }
      to { opacity: 1; backdrop-filter: blur(24px); }
    }
    .modal-content-enter {
      animation: contentSlideIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
    }
    @keyframes contentSlideIn {
      from { opacity: 0; transform: scale(0.95) translateY(20px); }
      to { opacity: 1; transform: scale(1) translateY(0); }
    }
    .modal-scroll-normal::-webkit-scrollbar { width: 10px; }
    .modal-scroll-normal::-webkit-scrollbar-track { background: transparent; }
    .modal-scroll-normal::-webkit-scrollbar-thumb {
      background: rgba(255,255,255,0.2);
      border-radius: 10px;
      border: 2px solid transparent;
      background-clip: padding-box;
    }
    .modal-scroll-normal::-webkit-scrollbar-thumb:hover {
      background: rgba(255,255,255,0.4);
    }
  `]
})
export class AuthModalComponent {
  ms = inject(AuthModalService);
  showPassword = signal(false);

  closeModal() { this.ms.close(); }
  toggleMode() { this.ms.toggleMode(); }
  togglePasswordVisibility() { this.showPassword.update(v => !v); }
  submit() { this.ms.submit(); }
  verifyOtp() { this.ms.verifyOtp(); }
  loginWithGoogle() { this.ms.loginWithGoogle(); }
}
