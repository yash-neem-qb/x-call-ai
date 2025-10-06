import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute } from '@angular/router';

import { AuthService } from '../../core/services/auth.service';
import { OrganizationService } from '../../core/services/organization.service';

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
    MatTooltipModule
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
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.loadOrganizationSettings();
    this.loadMembers();
    this.loadUserProfile();
    
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
   * Delete organization
   */
  deleteOrganization(): void {
    // TODO: Implement organization deletion
    console.log('Delete organization');
    this.snackBar.open('Organization deletion not implemented yet', 'Close', {
      duration: 3000,
      horizontalPosition: 'right',
      verticalPosition: 'top'
    });
  }

  /**
   * Get organization display name
   */
  getOrganizationDisplayName(): string {
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
        // Fallback to mock data for now
        this.members = [
          {
            id: '1',
            email: 'ashishmishra8120@gmail.com',
            name: '',
            role: 'Admin',
            status: 'Active',
            joinedAt: '2024-01-15T10:30:00Z',
            lastActiveAt: '2024-01-20T14:22:00Z'
          }
        ];
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
        timezone: 'UTC', // Default timezone
        language: 'English' // Default language
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
   * Delete account
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

    // TODO: Implement account deletion functionality
    console.log('Delete account confirmed');
    this.snackBar.open('Account deletion not implemented yet', 'Close', {
      duration: 3000,
      horizontalPosition: 'right',
      verticalPosition: 'top'
    });
  }
}