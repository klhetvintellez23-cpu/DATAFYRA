import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class AuthValidationService {
  private readonly emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  private readonly passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/;

  isValidEmail(email: string): boolean {
    return this.emailRegex.test(email);
  }

  isPasswordSecure(password: string): boolean {
    return this.passwordRegex.test(password);
  }
}
