import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';

import { OrganizationService, CreateOrganizationRequest } from '../../../core/services/organization.service';

@Component({
  selector: 'app-create-organization-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatIconModule,
    MatButtonModule,
    MatInputModule,
    MatFormFieldModule,
    MatSelectModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './create-organization-dialog.component.html',
  styleUrls: ['./create-organization-dialog.component.scss']
})
export class CreateOrganizationDialogComponent implements OnInit {
  createForm: FormGroup;
  isLoading = false;

  constructor(
    private dialogRef: MatDialogRef<CreateOrganizationDialogComponent>,
    private organizationService: OrganizationService,
    private snackBar: MatSnackBar,
    private fb: FormBuilder
  ) {
    this.createForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(255)]],
      description: ['', [Validators.maxLength(500)]]
    });
  }

  ngOnInit(): void {
    // Focus on the name input when dialog opens
    setTimeout(() => {
      const nameInput = document.querySelector('input[formControlName="name"]') as HTMLInputElement;
      if (nameInput) {
        nameInput.focus();
      }
    }, 100);
  }

  /**
   * Handle form submission
   */
  onSubmit(): void {
    if (this.createForm.valid && !this.isLoading) {
      this.isLoading = true;
      
      const formData: CreateOrganizationRequest = {
        name: this.createForm.value.name.trim(),
        description: this.createForm.value.description?.trim() || undefined
      };

      this.organizationService.createOrganization(formData).subscribe({
        next: (response) => {
          this.isLoading = false;
          this.snackBar.open('Organization created successfully!', 'Close', {
            duration: 3000,
            panelClass: ['success-snackbar']
          });
          
          // Close dialog and return the created organization
          this.dialogRef.close({
            success: true,
            organization: response
          });
        },
        error: (error) => {
          this.isLoading = false;
          console.error('Error creating organization:', error);
          
          let errorMessage = 'Failed to create organization. Please try again.';
          
          if (error.error?.detail) {
            errorMessage = error.error.detail;
          } else if (error.error?.message) {
            errorMessage = error.error.message;
          } else if (error.status === 400) {
            errorMessage = 'Invalid organization data. Please check your input.';
          } else if (error.status === 409) {
            errorMessage = 'An organization with this name already exists.';
          }
          
          this.snackBar.open(errorMessage, 'Close', {
            duration: 5000,
            panelClass: ['error-snackbar']
          });
        }
      });
    }
  }

  /**
   * Cancel and close dialog
   */
  onCancel(): void {
    this.dialogRef.close({ success: false });
  }

  /**
   * Get error message for form field
   */
  getFieldError(fieldName: string): string {
    const field = this.createForm.get(fieldName);
    if (field?.errors && field.touched) {
      if (field.errors['required']) {
        return `${this.getFieldLabel(fieldName)} is required`;
      }
      if (field.errors['minlength']) {
        return `${this.getFieldLabel(fieldName)} must be at least ${field.errors['minlength'].requiredLength} characters`;
      }
      if (field.errors['maxlength']) {
        return `${this.getFieldLabel(fieldName)} must be no more than ${field.errors['maxlength'].requiredLength} characters`;
      }
    }
    return '';
  }

  /**
   * Get field label for error messages
   */
  private getFieldLabel(fieldName: string): string {
    const labels: { [key: string]: string } = {
      name: 'Organization name',
      description: 'Description'
    };
    return labels[fieldName] || fieldName;
  }

  /**
   * Check if field has error
   */
  hasFieldError(fieldName: string): boolean {
    const field = this.createForm.get(fieldName);
    return !!(field?.errors && field.touched);
  }
}
