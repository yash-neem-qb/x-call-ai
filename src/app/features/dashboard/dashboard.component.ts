import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatMenuModule } from '@angular/material/menu';
import { MatTabsModule } from '@angular/material/tabs';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSelectModule } from '@angular/material/select';
import { MatOptionModule } from '@angular/material/core';

import { AuthService, User } from '../../core/services/auth.service';
import { AssistantService, Assistant, DashboardSummary } from '../../core/services/assistant.service';
import { OrganizationService, Organization, OrganizationsResponse } from '../../core/services/organization.service';
import { CallService, Call, MakeCallRequest } from '../../core/services/call.service';
import { AnalyticsService } from '../../core/services/analytics.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule, 
    MatIconModule,
    MatButtonModule,
    MatCardModule,
    MatMenuModule,
    MatTabsModule,
    MatDividerModule,
    MatTooltipModule,
    MatDialogModule,
    MatSelectModule,
    MatOptionModule
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit, OnDestroy {
  currentUser: User | null = null;
  assistants: Assistant[] = [];
  dashboardData: any = null;
  organizations: Organization[] = [];
  selectedOrg: Organization | null = null;
  isLoading = true;
  isLoadingOrgs = true;
  error: string | null = null;
  recentCalls: Call[] = [];
  
  // New properties for the updated dashboard
  selectedAssistant: string = 'all';
  selectedPeriod: string = '30';
  callTrend: number = 0.0;
  costTrend: number = 0.0;
  successTrend: number = 0.0;
  
  // Expose Math to template
  Math = Math;
  
  private destroy$ = new Subject<void>();

  constructor(
    private authService: AuthService,
    private assistantService: AssistantService,
    private organizationService: OrganizationService,
    private callService: CallService,
    private analyticsService: AnalyticsService,
    private dialog: MatDialog,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Get current user
    this.authService.authState$
      .pipe(takeUntil(this.destroy$))
      .subscribe((authState) => {
        this.currentUser = authState.user;
        if (authState.isAuthenticated) {
          this.loadOrganizations();
          this.loadDashboard();
        }
      });
  }
  
  /**
   * Load organization for the current user
   */
  loadOrganizations(): void {
    this.isLoadingOrgs = true;
    
    if (!this.currentUser || !this.currentUser.organization_id) {
      this.isLoadingOrgs = false;
      return;
    }
    
    this.organizationService.getOrganization(this.currentUser.organization_id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (orgData) => {
          // Create organization object from response
          const org: Organization = {
            organization_id: orgData.id || this.currentUser.organization_id,
            organization_name: orgData.name || 'Unknown Organization',
            role: 'owner', // Assuming current user is owner
            is_active: orgData.is_active || true,
            joined_at: orgData.created_at || new Date().toISOString()
          };
          
          this.organizations = [org];
          this.selectedOrg = org;
          this.isLoadingOrgs = false;
        },
        error: (err) => {
          console.error('Error loading organization:', err);
          this.isLoadingOrgs = false;
        }
      });
  }
  
  /**
   * Switch to a different organization
   */
  switchOrganization(org: Organization): void {
    this.organizationService.switchOrganization(org.organization_id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.selectedOrg = org;
          this.loadDashboard();
          // Reload the page to update the context
          window.location.reload();
        },
        error: (err) => {
          console.error('Error switching organization:', err);
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Load dashboard data
   */
  loadDashboard(): void {
    this.isLoading = true;
    this.error = null;
    
    // Load assistants
    this.assistantService.getAssistants()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.assistants = response.items;
        },
        error: (err) => {
          console.error('Error loading assistants:', err);
          this.error = 'Failed to load assistants. Please try again.';
        }
      });
      
    // Load dashboard overview data with filters
    this.analyticsService.getDashboardOverview(
      undefined, // dateFrom
      undefined, // dateTo
      this.selectedAssistant,
      parseInt(this.selectedPeriod)
    )
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.dashboardData = response.overview;
          this.callTrend = response.trends?.call_trend || 0.0;
          this.costTrend = response.trends?.cost_trend || 0.0;
          this.successTrend = response.trends?.success_trend || 0.0;
          this.isLoading = false;
        },
        error: (err) => {
          console.error('Error loading dashboard data:', err);
          this.dashboardData = null;
          this.isLoading = false;
        }
      });
      
    // Load recent calls
    this.callService.getCalls(1, 5)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.recentCalls = response.items;
        },
        error: (err) => {
          console.error('Error loading recent calls:', err);
          this.recentCalls = [];
        }
      });
  }

  /**
   * Create new assistant
   */
  createAssistant(): void {
    this.router.navigate(['/assistants/new']);
  }

  /**
   * View assistant details
   */
  viewAssistant(assistant: Assistant): void {
    this.router.navigate(['/assistants', assistant.id]);
  }
  
  /**
   * Delete assistant
   */
  deleteAssistant(assistant: Assistant): void {
    if (confirm(`Are you sure you want to delete ${assistant.name}?`)) {
      this.assistantService.deleteAssistant(assistant.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.assistants = this.assistants.filter(a => a.id !== assistant.id);
            this.loadDashboard(); // Reload dashboard data
          },
          error: (err) => {
            console.error('Error deleting assistant:', err);
          }
        });
    }
  }
  
  /**
   * Call with assistant
   */
  callAssistant(assistant: Assistant): void {
    const phoneNumber = prompt('Enter phone number to call (E.164 format, e.g. +1234567890):');
    
    if (phoneNumber) {
      const request: MakeCallRequest = {
        assistant_id: assistant.id,
        phone_number: phoneNumber
      };
      
      this.callService.makeCall(request)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            alert(`Call initiated with ${assistant.name}`);
            // Optionally navigate to calls page
            // this.router.navigate(['/calls']);
          },
          error: (err) => {
            console.error('Error making call:', err);
            alert('Failed to initiate call. Please try again.');
          }
        });
    }
  }
  
  /**
   * Format duration in seconds to human-readable format
   */
  formatDuration(seconds: number): string {
    if (seconds === 0) return '0s';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    
    let result = '';
    if (hours > 0) result += `${hours}h `;
    if (minutes > 0) result += `${minutes}m `;
    if (remainingSeconds > 0) result += `${remainingSeconds}s`;
    
    return result.trim();
  }
  
  /**
   * Format ISO date string to human-readable time
   */
  formatTime(isoString: string): string {
    if (!isoString) return '';
    
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffMins < 60) {
      return `${diffMins}m ago`;
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else if (diffDays < 7) {
      return `${diffDays}d ago`;
    } else {
      return date.toLocaleDateString();
    }
  }

  /**
   * Handle filter changes
   */
  onFilterChange(): void {
    this.isLoading = true;
    this.loadDashboard();
  }

  /**
   * View calls
   */
  viewCalls(): void {
    this.router.navigate(['/calls']);
  }

  /**
   * Logout user
   */
  logout(): void {
    this.authService.logout();
  }
}