import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, Router } from '@angular/router';

import { AuthService } from '../../core/services/auth.service';
import { OrganizationService } from '../../core/services/organization.service';
import { ConfirmationDialogComponent, ConfirmationDialogData } from '../../shared/components/confirmation-dialog/confirmation-dialog.component';

export interface SettingsCategory {
  id: string;
  name: string;
  icon: string;
  section: string;
}

export interface OrganizationSettings {
  organizationName: string;
  organizationEmail: string;
  organizationId: string;
}

export interface OrganizationMember {
  id: string;
  email: string;
  name: string;
  role: 'Admin' | 'Member' | 'Viewer';
  status: 'Active' | 'Pending' | 'Inactive';
  joinedAt: string;
  lastActiveAt?: string;
}

export interface UserProfile {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  timezone: string;
  language: string;
}

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    MatButtonModule,
    MatInputModule,
    MatSelectModule,
    MatFormFieldModule,
    MatTooltipModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss']
})
export class SettingsComponent implements OnInit {
  selectedCategory: string = 'org-settings';
  organizationSettings: OrganizationSettings = {
    organizationName: '',
    organizationEmail: '',
    organizationId: ''
  };

  members: OrganizationMember[] = [];
  isLoadingMembers = false;

  userProfile: UserProfile = {
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    timezone: 'UTC',
    language: 'English'
  };

  newPassword: string = '';
  deleteConfirmationEmail: string = '';
  
  // Organization editing
  isEditingOrgName = false;
  isSavingOrgName = false;
  originalOrgName = '';
  
  // Organization deletion
  deleteConfirmationName = '';
  isDeletingOrganization = false;
  
  // Account deletion
  isDeletingAccount = false;
  accountDataSummary: any = null;

  settingsCategories: SettingsCategory[] = [
    // ORG SETTINGS
    { id: 'org-settings', name: 'Org Settings', icon: 'folder', section: 'ORG SETTINGS' },
    { id: 'members', name: 'Members', icon: 'group', section: 'ORG SETTINGS' },
    
    // ACCOUNT SETTINGS
    { id: 'profile', name: 'Profile', icon: 'person', section: 'ACCOUNT SETTINGS' }
  ];

  constructor(
    private authService: AuthService,
    private organizationService: OrganizationService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadOrganizationSettings();
    this.loadMembers();
    this.loadUserProfile();
    this.loadAccountDataSummary();
    
    // Check for query parameters to set initial category
    this.route.queryParams.subscribe(params => {
      if (params['section']) {
        this.selectedCategory = params['section'];
      }
    });
  }

  /**
   * Load organization settings
   */
  loadOrganizationSettings(): void {
    const currentUser = this.authService.getCurrentUser();
    if (currentUser) {
      this.organizationSettings = {
        ...this.organizationSettings,
        organizationName: currentUser.organization_name || '',
        organizationEmail: currentUser.email || '',
        organizationId: currentUser.organization_id || ''
      };
    }
  }


  /**
   * Select settings category
   */
  selectCategory(categoryId: string): void {
    this.selectedCategory = categoryId;
  }

  /**
   * Get current section for selected category
   */
  getCurrentSection(): string {
    const category = this.settingsCategories.find(cat => cat.id === this.selectedCategory);
    return category?.section || '';
  }

  /**
   * Get categories for current section
   */
  getCategoriesForSection(section: string): SettingsCategory[] {
    return this.settingsCategories.filter(cat => cat.section === section);
  }

  /**
   * Get unique sections
   */
  getSections(): string[] {
    return [...new Set(this.settingsCategories.map(cat => cat.section))];
  }

  /**
   * Copy text to clipboard
   */
  copyToClipboard(text: string, label: string): void {
    navigator.clipboard.writeText(text).then(() => {
      this.snackBar.open(`${label} copied to clipboard`, 'Close', {
        duration: 2000,
        horizontalPosition: 'right',
        verticalPosition: 'top'
      });
    }).catch(err => {
      console.error('Failed to copy text: ', err);
    });
  }


  /**
   * Toggle organization name editing
   */
  toggleOrgNameEdit(): void {
    this.isEditingOrgName = true;
    this.originalOrgName = this.organizationSettings.organizationName;
  }

  /**
   * Cancel organization name editing
   */
  cancelOrgNameEdit(): void {
    this.isEditingOrgName = false;
    this.organizationSettings.organizationName = this.originalOrgName;
  }

  /**
   * Save organization name
   */
  saveOrgName(): void {
    if (!this.organizationSettings.organizationName.trim()) {
      this.snackBar.open('Organization name cannot be empty', 'Close', {
        duration: 3000,
        horizontalPosition: 'right',
        verticalPosition: 'top'
      });
      return;
    }

    this.isSavingOrgName = true;
    const user = this.authService.getCurrentUser();
    
    if (!user?.organization_id) {
      this.snackBar.open('Organization ID not found', 'Close', {
        duration: 3000,
        horizontalPosition: 'right',
        verticalPosition: 'top'
      });
      this.isSavingOrgName = false;
      return;
    }

    this.organizationService.updateOrganization(user.organization_id, {
      name: this.organizationSettings.organizationName.trim()
    }).subscribe({
      next: (response) => {
        this.isSavingOrgName = false;
        this.isEditingOrgName = false;
        this.originalOrgName = this.organizationSettings.organizationName;
        
        // Update user info with new organization name
        this.authService.updateUserInfo({
          ...user,
          organization_name: this.organizationSettings.organizationName
        });
        
        this.snackBar.open('Organization name updated successfully', 'Close', {
          duration: 3000,
          horizontalPosition: 'right',
          verticalPosition: 'top'
        });
      },
      error: (error) => {
        this.isSavingOrgName = false;
        console.error('Error updating organization name:', error);
        
        let errorMessage = 'Failed to update organization name. Please try again.';
        if (error.error?.detail) {
          errorMessage = error.error.detail;
        } else if (error.error?.message) {
          errorMessage = error.error.message;
        }
        
        this.snackBar.open(errorMessage, 'Close', {
          duration: 5000,
          horizontalPosition: 'right',
          verticalPosition: 'top'
        });
      }
    });
  }

  /**
   * Check if organization can be deleted
   */
  canDeleteOrganization(): boolean {
    return this.deleteConfirmationName.trim() === this.getOrganizationDisplayName();
  }

  /**
   * Delete organization
   */
  deleteOrganization(): void {
    if (!this.canDeleteOrganization()) {
      this.snackBar.open('Please enter the correct organization name to confirm deletion', 'Close', {
        duration: 3000,
        horizontalPosition: 'right',
        verticalPosition: 'top'
      });
      return;
    }

    // Show confirmation dialog
    const dialogData: ConfirmationDialogData = {
      title: 'Delete Organization',
      message: `Are you sure you want to delete the organization "${this.getOrganizationDisplayName()}"?\n\nThis action cannot be undone and will permanently delete all organization data.`,
      confirmText: 'Delete Organization',
      cancelText: 'Cancel',
      isDestructive: true,
      showDataSummary: false
    };

    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      width: '500px',
      maxWidth: '90vw',
      disableClose: true,
      data: dialogData
    });

    dialogRef.afterClosed().subscribe(confirmed => {
      if (confirmed) {
        this.performOrganizationDeletion();
      }
    });
  }

  /**
   * Perform the actual organization deletion
   */
  private performOrganizationDeletion(): void {
    this.isDeletingOrganization = true;
    const user = this.authService.getCurrentUser();
    
    if (!user?.organization_id) {
      this.snackBar.open('Organization ID not found', 'Close', {
        duration: 3000,
        horizontalPosition: 'right',
        verticalPosition: 'top'
      });
      this.isDeletingOrganization = false;
      return;
    }

    this.organizationService.deleteOrganization(user.organization_id).subscribe({
      next: (response) => {
        this.isDeletingOrganization = false;
        this.snackBar.open('Organization deleted successfully. Redirecting to dashboard...', 'Close', {
          duration: 3000,
          horizontalPosition: 'right',
          verticalPosition: 'top'
        });
        
        // Redirect to dashboard/overview page
        setTimeout(() => {
          this.router.navigate(['/dashboard']);
        }, 2000);
      },
      error: (error) => {
        this.isDeletingOrganization = false;
        console.error('Error deleting organization:', error);
        
        let errorMessage = 'Failed to delete organization. Please try again.';
        if (error.error?.detail) {
          errorMessage = error.error.detail;
        } else if (error.error?.message) {
          errorMessage = error.error.message;
        } else if (error.status === 403) {
          errorMessage = 'You do not have permission to delete this organization.';
        } else if (error.status === 400) {
          errorMessage = 'Cannot delete organization. It may be your default organization or have active members.';
        }
        
        this.snackBar.open(errorMessage, 'Close', {
          duration: 5000,
          horizontalPosition: 'right',
          verticalPosition: 'top'
        });
      }
    });
  }

  /**
   * Get organization display name
   */
  getOrganizationDisplayName(): string {
    const user = this.authService.getCurrentUser();
    if (!user?.organization_name) {
      console.error('No organization name found');
      return 'No Organization';
    }
    return user.organization_name;
  }

  /**
   * Get user email
   */
  getUserEmail(): string {
    const user = this.authService.getCurrentUser();
    if (!user?.email) {
      console.error('No user email found');
      return 'No Email';
    }
    return user.email;
  }

  /**
   * Get settings category name
   */
  getSettingsCategoryName(): string {
    const category = this.settingsCategories.find(cat => cat.id === this.selectedCategory);
    return category?.name || 'Settings';
  }

  /**
   * Load organization members
   */
  loadMembers(): void {
    this.isLoadingMembers = true;
    
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser?.organization_id) {
      this.isLoadingMembers = false;
      return;
    }

    this.organizationService.getOrganizationMembers(currentUser.organization_id).subscribe({
      next: (response) => {
        this.members = response.members || [];
        this.isLoadingMembers = false;
      },
      error: (error) => {
        console.error('Error loading members:', error);
        this.isLoadingMembers = false;
        this.snackBar.open('Error loading organization members. Please try again.', 'Close', { duration: 5000 });
        this.members = [];
      }
    });
  }

  /**
   * Invite new member
   */
  inviteMember(): void {
    // TODO: Implement invite member functionality
    console.log('Invite new member');
    this.snackBar.open('Invite member functionality coming soon', 'Close', {
      duration: 2000,
      horizontalPosition: 'right',
      verticalPosition: 'top'
    });
  }

  /**
   * Remove member
   */
  removeMember(member: OrganizationMember): void {
    // TODO: Implement remove member functionality
    console.log('Remove member:', member.email);
    this.snackBar.open('Remove member functionality coming soon', 'Close', {
      duration: 2000,
      horizontalPosition: 'right',
      verticalPosition: 'top'
    });
  }

  /**
   * Update member role
   */
  updateMemberRole(member: OrganizationMember, newRole: string): void {
    // TODO: Implement update member role functionality
    console.log('Update member role:', member.email, 'to', newRole);
    this.snackBar.open('Update role functionality coming soon', 'Close', {
      duration: 2000,
      horizontalPosition: 'right',
      verticalPosition: 'top'
    });
  }

  /**
   * Load user profile
   */
  loadUserProfile(): void {
    const currentUser = this.authService.getCurrentUser();
    if (currentUser) {
      this.userProfile = {
        firstName: currentUser.first_name || '',
        lastName: currentUser.last_name || '',
        email: currentUser.email || '',
        phoneNumber: '', // Phone number not available in current User interface
        timezone: '',
        language: ''
      };
    }
  }

  /**
   * Save user profile
   */
  saveProfile(): void {
    // TODO: Implement save profile functionality
    console.log('Save profile:', this.userProfile);
    this.snackBar.open('Profile saved successfully', 'Close', {
      duration: 2000,
      horizontalPosition: 'right',
      verticalPosition: 'top'
    });
  }

  /**
   * Get timezone options
   */
  getTimezoneOptions(): string[] {
    return [
      'UTC',
      'America/New_York',
      'America/Chicago',
      'America/Denver',
      'America/Los_Angeles',
      'Europe/London',
      'Europe/Paris',
      'Asia/Tokyo',
      'Asia/Shanghai',
      'Australia/Sydney'
    ];
  }

  /**
   * Get language options
   */
  getLanguageOptions(): string[] {
    return [
      'English',
      'Spanish',
      'French',
      'German',
      'Italian',
      'Portuguese',
      'Chinese',
      'Japanese',
      'Korean'
    ];
  }

  /**
   * Update password
   */
  updatePassword(): void {
    if (!this.newPassword) {
      this.snackBar.open('Please enter a new password', 'Close', {
        duration: 2000,
        horizontalPosition: 'right',
        verticalPosition: 'top'
      });
      return;
    }

    // TODO: Implement password update functionality
    console.log('Update password:', this.newPassword);
    this.snackBar.open('Password updated successfully', 'Close', {
      duration: 2000,
      horizontalPosition: 'right',
      verticalPosition: 'top'
    });
    
    this.newPassword = '';
  }

  /**
   * Load account data summary for deletion confirmation
   */
  loadAccountDataSummary(): void {
    this.authService.getAccountDataSummary().subscribe({
      next: (data) => {
        this.accountDataSummary = data;
      },
      error: (error) => {
        console.error('Error loading account data summary:', error);
      }
    });
  }

  /**
   * Delete user account
   */
  deleteAccount(): void {
    if (this.deleteConfirmationEmail !== this.userProfile.email) {
      this.snackBar.open('Email confirmation does not match', 'Close', {
        duration: 2000,
        horizontalPosition: 'right',
        verticalPosition: 'top'
      });
      return;
    }

    // Show confirmation dialog
    const dialogData: ConfirmationDialogData = {
      title: 'Delete Account',
      message: `Are you absolutely sure you want to delete your account "${this.userProfile.email}"?\n\nThis action cannot be undone.`,
      confirmText: 'Delete Account',
      cancelText: 'Cancel',
      isDestructive: true,
      showDataSummary: true,
      dataSummary: this.accountDataSummary
    };

    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      width: '500px',
      maxWidth: '90vw',
      disableClose: true,
      data: dialogData
    });

    dialogRef.afterClosed().subscribe(confirmed => {
      if (confirmed) {
        this.performAccountDeletion();
      }
    });
  }

  /**
   * Perform the actual account deletion
   */
  private performAccountDeletion(): void {
    this.isDeletingAccount = true;

    this.authService.deleteAccount().subscribe({
      next: (response) => {
        this.isDeletingAccount = false;
        this.snackBar.open('Account deleted successfully. Redirecting to login...', 'Close', {
          duration: 3000,
          horizontalPosition: 'right',
          verticalPosition: 'top'
        });
        
        // Clear user session and redirect to login page
        this.authService.logout();
        setTimeout(() => {
          this.router.navigate(['/auth/login']);
        }, 2000);
      },
      error: (error) => {
        this.isDeletingAccount = false;
        console.error('Error deleting account:', error);
        
        let errorMessage = 'Failed to delete account. Please try again.';
        if (error.error?.detail) {
          errorMessage = error.error.detail;
        } else if (error.error?.message) {
          errorMessage = error.error.message;
        }
        
        this.snackBar.open(errorMessage, 'Close', {
          duration: 5000,
          horizontalPosition: 'right',
          verticalPosition: 'top'
        });
      }
    });
  }
}