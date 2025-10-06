import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { MatDialog } from '@angular/material/dialog';

import { AuthService } from '../../core/services/auth.service';
import { OrganizationService, Organization } from '../../core/services/organization.service';
import { OrganizationSwitcherComponent } from '../../shared/components/organization-switcher/organization-switcher.component';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    MatDividerModule
  ],
  templateUrl: './app-layout.component.html',
  styleUrls: ['./app-layout.component.scss']
})
export class AppLayoutComponent implements OnInit {
  organizations: Organization[] = [];
  currentOrganization: Organization | null = null;
  isLoadingOrganizations = false;

  constructor(
    private authService: AuthService,
    private organizationService: OrganizationService,
    private router: Router,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.loadOrganizations();
  }

  /**
   * Load user's organizations
   */
  loadOrganizations(): void {
    this.isLoadingOrganizations = true;
    this.organizationService.getOrganizations().subscribe({
      next: (response) => {
        this.organizations = this.organizationService.extractOrganizations(response);
        // Set current organization from auth service
        const currentUser = this.authService.getCurrentUser();
        if (currentUser?.organization_id) {
          this.currentOrganization = this.organizations.find(
            org => org.organization_id === currentUser.organization_id
          ) || this.organizations[0] || null;
        }
        this.isLoadingOrganizations = false;
      },
      error: (error) => {
        console.error('Error loading organizations:', error);
        this.isLoadingOrganizations = false;
      }
    });
  }

  /**
   * Switch to a different organization
   */
  switchOrganization(organization: Organization): void {
    if (organization.organization_id === this.currentOrganization?.organization_id) {
      return; // Already selected
    }

    this.organizationService.switchOrganization(organization.organization_id).subscribe({
      next: (response) => {
        // Update current organization
        this.currentOrganization = organization;
        
        // Update auth service with new organization
        this.authService.updateUserInfo({
          ...this.authService.getCurrentUser()!,
          organization_id: organization.organization_id,
          organization_name: organization.organization_name
        });
        
        // Reload the page to refresh all organization-specific data
        window.location.reload();
      },
      error: (error) => {
        console.error('Error switching organization:', error);
      }
    });
  }

  /**
   * Get organization display name
   */
  getOrganizationDisplayName(): string {
    if (this.currentOrganization) {
      return this.currentOrganization.organization_name;
    }
    const user = this.authService.getCurrentUser();
    return user?.organization_name || 'My Organization';
  }

  /**
   * Get user email
   */
  getUserEmail(): string {
    const user = this.authService.getCurrentUser();
    return user?.email || 'user@example.com';
  }

  /**
   * Get user initial for avatar
   */
  getUserInitial(): string {
    const user = this.authService.getCurrentUser();
    const email = user?.email || 'user@example.com';
    return email.charAt(0).toUpperCase();
  }

  /**
   * Open organization switcher modal
   */
  navigateToSwitchOrg(): void {
    const dialogRef = this.dialog.open(OrganizationSwitcherComponent, {
      width: '480px',
      maxWidth: '90vw',
      maxHeight: '80vh',
      panelClass: 'organization-switcher-dialog',
      disableClose: false,
      autoFocus: true
    });

    dialogRef.afterClosed().subscribe(result => {
      // Handle modal close if needed
      console.log('Organization switcher modal closed');
    });
  }

  /**
   * Navigate to settings page
   */
  navigateToSettings(): void {
    this.router.navigate(['/settings']);
  }

  /**
   * Navigate to account settings (Profile page)
   */
  navigateToAccountSettings(): void {
    this.router.navigate(['/settings'], { queryParams: { section: 'profile' } });
  }

  logout(): void {
    this.authService.logout();
  }
}
