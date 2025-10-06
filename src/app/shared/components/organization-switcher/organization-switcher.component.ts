import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatDialogRef } from '@angular/material/dialog';

import { OrganizationService, Organization } from '../../../core/services/organization.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-organization-switcher',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    MatButtonModule,
    MatInputModule
  ],
  templateUrl: './organization-switcher.component.html',
  styleUrls: ['./organization-switcher.component.scss']
})
export class OrganizationSwitcherComponent implements OnInit, OnDestroy {
  organizations: Organization[] = [];
  filteredOrganizations: Organization[] = [];
  searchQuery = '';
  isLoading = false;
  currentOrganizationId: string | null = null;

  constructor(
    private dialogRef: MatDialogRef<OrganizationSwitcherComponent>,
    private organizationService: OrganizationService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.loadOrganizations();
    this.setCurrentOrganization();
  }

  ngOnDestroy(): void {
    // Cleanup if needed
  }

  /**
   * Load user's organizations
   */
  loadOrganizations(): void {
    this.isLoading = true;
    this.organizationService.getOrganizations().subscribe({
      next: (response) => {
        this.organizations = this.organizationService.extractOrganizations(response);
        this.filteredOrganizations = [...this.organizations];
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading organizations:', error);
        this.isLoading = false;
      }
    });
  }

  /**
   * Set current organization ID
   */
  setCurrentOrganization(): void {
    const currentUser = this.authService.getCurrentUser();
    this.currentOrganizationId = currentUser?.organization_id || null;
  }

  /**
   * Filter organizations based on search query
   */
  filterOrganizations(): void {
    if (!this.searchQuery.trim()) {
      this.filteredOrganizations = [...this.organizations];
    } else {
      const query = this.searchQuery.toLowerCase();
      this.filteredOrganizations = this.organizations.filter(org =>
        org.organization_name.toLowerCase().includes(query)
      );
    }
  }

  /**
   * Handle search input
   */
  onSearchChange(): void {
    this.filterOrganizations();
  }

  /**
   * Clear search
   */
  clearSearch(): void {
    this.searchQuery = '';
    this.filterOrganizations();
  }

  /**
   * Switch to selected organization
   */
  switchToOrganization(organization: Organization): void {
    if (organization.organization_id === this.currentOrganizationId) {
      this.closeModal();
      return;
    }

    this.organizationService.switchOrganization(organization.organization_id).subscribe({
      next: (response) => {
        // Update auth service with new organization
        this.authService.updateUserInfo({
          ...this.authService.getCurrentUser()!,
          organization_id: organization.organization_id,
          organization_name: organization.organization_name
        });
        
        this.closeModal();
        // Reload the page to refresh all organization-specific data
        window.location.reload();
      },
      error: (error) => {
        console.error('Error switching organization:', error);
      }
    });
  }

  /**
   * Create new organization
   */
  createNewOrganization(): void {
    // TODO: Implement create new organization functionality
    console.log('Create new organization');
  }

  /**
   * Toggle star for organization
   */
  toggleStar(organization: Organization): void {
    // TODO: Implement star/unstar functionality
    console.log('Toggle star for organization:', organization.organization_name);
  }

  /**
   * Close modal
   */
  closeModal(): void {
    this.dialogRef.close();
  }

  /**
   * Handle keyboard shortcuts
   */
  @HostListener('document:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.closeModal();
    } else if (event.key === 'n' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      this.createNewOrganization();
    } else if (event.key === 's' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      // Toggle star for first organization (example)
      if (this.filteredOrganizations.length > 0) {
        this.toggleStar(this.filteredOrganizations[0]);
      }
    }
  }

  /**
   * Check if organization is current
   */
  isCurrentOrganization(organization: Organization): boolean {
    return organization.organization_id === this.currentOrganizationId;
  }

  /**
   * Get organization display name
   */
  getOrganizationDisplayName(organization: Organization): string {
    return organization.organization_name;
  }

  /**
   * Get organization role
   */
  getOrganizationRole(organization: Organization): string {
    return organization.role;
  }
}
