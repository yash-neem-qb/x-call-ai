import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="reset-password-container content-above-particles">
      <div class="reset-password-card">
        <h2>Reset Password</h2>
        <p>This is a placeholder for the reset password page.</p>
        <button (click)="goToLogin()">Back to Login</button>
      </div>
    </div>
  `,
  styles: [`
    .reset-password-container {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
    }
    .reset-password-card {
      background-color: var(--surface-color);
      border-radius: 8px;
      padding: 2rem;
      width: 100%;
      max-width: 400px;
      text-align: center;
    }
    button {
      background-color: var(--primary-color);
      color: black;
      border: none;
      padding: 10px 20px;
      border-radius: 4px;
      cursor: pointer;
      margin-top: 1rem;
    }
  `]
})
export class ResetPasswordComponent {
  constructor(private router: Router) {}

  goToLogin(): void {
    this.router.navigate(['/auth/login']);
  }
}
