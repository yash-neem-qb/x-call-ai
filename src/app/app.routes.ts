import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/guards/auth.guard';
import { AppLayoutComponent } from './layout/app-layout/app-layout.component';

export const routes: Routes = [
  // Redirect root to assistants page by default
  {
    path: '',
    redirectTo: '/assistants',
    pathMatch: 'full'
  },
  
  // Auth routes (guest only)
  {
    path: 'auth',
    canActivate: [guestGuard],
    children: [
      {
        path: 'login',
        loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent)
      },
      {
        path: 'signup',
        loadComponent: () => import('./features/auth/signup/signup.component').then(m => m.SignupComponent)
      },
      {
        path: 'forgot-password',
        loadComponent: () => import('./features/auth/forgot-password/forgot-password.component').then(m => m.ForgotPasswordComponent)
      },
      {
        path: 'reset-password',
        loadComponent: () => import('./features/auth/reset-password/reset-password.component').then(m => m.ResetPasswordComponent)
      }
    ]
  },
  
  // App routes with layout (authenticated only)
  {
    path: '',
    component: AppLayoutComponent,
    canActivate: [authGuard],
    children: [
      // Dashboard route
      {
        path: 'dashboard',
        loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent)
      },
      
      // Voice assistants routes
      {
        path: 'assistants',
        loadComponent: () => import('./features/assistants/assistants.component').then(m => m.AssistantsComponent)
      },
      
      // Campaigns routes
      {
        path: 'campaigns',
        loadComponent: () => import('./features/campaigns/campaigns.component').then(m => m.CampaignsComponent)
      },
      
      // Call logs routes
      {
        path: 'call-logs',
        loadComponent: () => import('./features/calls/calls.component').then(m => m.CallsComponent)
      },
      
      // Call detail route
      {
        path: 'call-logs/:id',
        loadComponent: () => import('./features/calls/call-detail/call-detail.component').then(m => m.CallDetailComponent)
      },
      
      // Phone numbers routes
      {
        path: 'phone-numbers',
        loadComponent: () => import('./features/phone-numbers/phone-numbers.component').then(m => m.PhoneNumbersComponent)
      },
      
      // Knowledge base routes
      {
        path: 'knowledge-base',
        loadComponent: () => import('./features/knowledge-base/knowledge-base.component').then(m => m.KnowledgeBaseComponent)
      },
      
      // Analytics routes
      {
        path: 'analytics',
        loadComponent: () => import('./features/analytics/analytics.component').then(m => m.AnalyticsComponent)
      },
      
      
      // Settings routes
      {
        path: 'settings',
        loadComponent: () => import('./features/settings/settings.component').then(m => m.SettingsComponent)
      },
      
      // Profile routes
      {
        path: 'profile',
        loadComponent: () => import('./features/profile/profile.component').then(m => m.ProfileComponent)
      }
    ]
  },
  
  // Wildcard route - must be last
  {
    path: '**',
    loadComponent: () => import('./shared/components/not-found/not-found.component').then(m => m.NotFoundComponent)
  }
];