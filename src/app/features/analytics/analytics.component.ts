import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-analytics',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="analytics-container content-above-particles">
      <h1>Analytics</h1>
      <p>This is a placeholder for the analytics page.</p>
    </div>
  `,
  styles: [`
    .analytics-container {
      padding: 2rem;
    }
  `]
})
export class AnalyticsComponent {}
