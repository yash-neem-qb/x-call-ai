import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="profile-container content-above-particles">
      <h1>User Profile</h1>
      <p>This is a placeholder for the user profile page.</p>
    </div>
  `,
  styles: [`
    .profile-container {
      padding: 2rem;
    }
  `]
})
export class ProfileComponent {}
