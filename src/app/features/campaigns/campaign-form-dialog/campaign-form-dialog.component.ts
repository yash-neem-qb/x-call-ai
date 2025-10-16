import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatOptionModule } from '@angular/material/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatStepperModule } from '@angular/material/stepper';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatRadioModule } from '@angular/material/radio';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';

import { Campaign, CampaignCreate, CampaignUpdate } from '../../../core/services/campaign.service';
import { Assistant } from '../../../core/services/assistant.service';
import { PhoneNumber, ApiPhoneNumber } from '../../../core/services/phone.service';

export interface CampaignFormData {
  campaign?: Campaign;
  assistants: Assistant[];
  phoneNumbers: ApiPhoneNumber[];
  mode: 'create' | 'edit';
}

@Component({
  selector: 'app-campaign-form-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatInputModule,
    MatSelectModule,
    MatOptionModule,
    MatFormFieldModule,
    MatIconModule,
    MatStepperModule,
    MatCardModule,
    MatDividerModule,
    MatCheckboxModule,
    MatRadioModule,
    MatDatepickerModule,
    MatNativeDateModule
  ],
  templateUrl: './campaign-form-dialog.component.html',
  styleUrls: ['./campaign-form-dialog.component.scss']
})
export class CampaignFormDialogComponent implements OnInit {
  campaignForm: FormGroup;
  isSubmitting = false;
  selectedFile: File | null = null;
  csvData: any[] = [];
  isLinear = true;
  isDragOver = false;
  isCreating = false;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<CampaignFormDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: CampaignFormData
  ) {
    this.campaignForm = this.createForm();
  }

  ngOnInit(): void {
    if (this.data.mode === 'edit' && this.data.campaign) {
      this.populateForm(this.data.campaign);
    } else {
      // Set default values for new campaigns
      this.setDefaultScheduleValues();
    }
  }

  /**
   * Set default values for scheduling
   */
  private setDefaultScheduleValues(): void {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    this.campaignForm.patchValue({
      scheduled_date: tomorrow,
      scheduled_time: '09:00',
      scheduled_timezone: 'UTC'
    });
  }

  /**
   * Create the campaign form
   */
  private createForm(): FormGroup {
    return this.fb.group({
      // Basic Information
      name: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(100)]],
      description: ['', [Validators.maxLength(500)]],
      
      // Configuration
      assistant_id: ['', Validators.required],
      phone_number_id: ['', Validators.required],
      
      // Scheduling
      schedule_type: ['NOW', Validators.required],
      scheduled_date: [null],
      scheduled_time: [null],
      scheduled_timezone: ['UTC'],
      scheduled_at: [null],
      
      // CSV Upload
      csv_file: [null],
      csv_headers: this.fb.group({
        phone_number: ['phone_number'],
        name: ['name'],
        email: ['email']
      })
    });
  }

  /**
   * Populate form with existing campaign data
   */
  private populateForm(campaign: Campaign): void {
    // Parse scheduled_at if it exists
    let scheduled_date = null;
    let scheduled_time = null;
    let scheduled_timezone = 'UTC';
    
    if (campaign.scheduled_at) {
      const date = new Date(campaign.scheduled_at);
      scheduled_date = date;
      scheduled_time = date.toTimeString().slice(0, 5); // HH:MM format
      // For now, default to UTC - in a real app, you'd store timezone in the campaign
      scheduled_timezone = 'UTC';
    }
    
    this.campaignForm.patchValue({
      name: campaign.name,
      description: campaign.description,
      assistant_id: campaign.assistant_id,
      phone_number_id: campaign.phone_number_id,
      schedule_type: campaign.schedule_type || 'NOW',
      scheduled_date: scheduled_date,
      scheduled_time: scheduled_time,
      scheduled_timezone: scheduled_timezone
    });
  }


  /**
   * Download CSV template
   */
  downloadTemplate(): void {
    const template = 'phone_number,name,email\n+1234567890,John Doe,john@example.com\n+0987654321,Jane Smith,jane@example.com';
    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'campaign_template.csv';
    link.click();
    window.URL.revokeObjectURL(url);
  }

  /**
   * Get form data for submission
   */
  private getFormData(): CampaignCreate | CampaignUpdate {
    const formValue = this.campaignForm.value;
    
    // Handle scheduling logic
    let scheduled_at = null;
    if (formValue.schedule_type === 'SCHEDULED' && formValue.scheduled_date && formValue.scheduled_time) {
      // Combine date and time into a proper datetime with timezone
      const date = new Date(formValue.scheduled_date);
      const [hours, minutes] = formValue.scheduled_time.split(':');
      
      // Set the time in the local timezone first
      date.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      
      // Convert to UTC for storage (the backend will handle timezone conversion)
      scheduled_at = date.toISOString();
    }
    
    const baseData = {
      name: formValue.name,
      description: formValue.description,
      assistant_id: formValue.assistant_id,
      phone_number_id: formValue.phone_number_id,
      schedule_type: formValue.schedule_type,
      scheduled_at: scheduled_at
    };

    if (this.data.mode === 'create') {
      return {
        ...baseData,
        status: 'DRAFT'
      } as CampaignCreate;
    } else {
      return baseData as CampaignUpdate;
    }
  }

  /**
   * Submit the form
   */
  onSubmit(): void {
    if (this.campaignForm.valid) {
      this.isSubmitting = true;
      const formData = this.getFormData();
      
      // Add CSV data if available
      if (this.csvData.length > 0) {
        (formData as any).csv_data = this.csvData;
      }
      
      this.dialogRef.close(formData);
    } else {
      this.markFormGroupTouched();
    }
  }

  /**
   * Mark all form fields as touched to show validation errors
   */
  private markFormGroupTouched(): void {
    Object.keys(this.campaignForm.controls).forEach(key => {
      const control = this.campaignForm.get(key);
      control?.markAsTouched();
    });
  }

  /**
   * Cancel and close dialog
   */
  onCancel(): void {
    this.dialogRef.close();
  }

  /**
   * Get error message for form field
   */
  getFieldError(fieldName: string): string {
    const field = this.campaignForm.get(fieldName);
    if (field?.errors && field.touched) {
      if (field.errors['required']) {
        return `${this.getFieldLabel(fieldName)} is required`;
      }
      if (field.errors['minlength']) {
        return `${this.getFieldLabel(fieldName)} must be at least ${field.errors['minlength'].requiredLength} characters`;
      }
      if (field.errors['maxlength']) {
        return `${this.getFieldLabel(fieldName)} must not exceed ${field.errors['maxlength'].requiredLength} characters`;
      }
      if (field.errors['min']) {
        return `${this.getFieldLabel(fieldName)} must be at least ${field.errors['min'].min}`;
      }
      if (field.errors['max']) {
        return `${this.getFieldLabel(fieldName)} must not exceed ${field.errors['max'].max}`;
      }
    }
    return '';
  }

  /**
   * Get field label for error messages
   */
  private getFieldLabel(fieldName: string): string {
    const labels: { [key: string]: string } = {
      name: 'Campaign Name',
      description: 'Description',
      assistant_id: 'Assistant',
      phone_number_id: 'Phone Number',
      max_calls_per_hour: 'Max Calls Per Hour',
      max_retries: 'Max Retries',
      retry_delay_minutes: 'Retry Delay (minutes)'
    };
    return labels[fieldName] || fieldName;
  }

  /**
   * Check if field has error
   */
  hasFieldError(fieldName: string): boolean {
    const field = this.campaignForm.get(fieldName);
    return !!(field?.errors && field.touched);
  }

  /**
   * Get assistant name by ID
   */
  getAssistantName(assistantId: string): string {
    const assistant = this.data.assistants.find(a => a.id === assistantId);
    return assistant ? assistant.name : 'Unknown';
  }

  /**
   * Get phone number by ID
   */
  getPhoneNumber(phoneNumberId: string): string {
    const phoneNumber = this.data.phoneNumbers.find(p => p.id === phoneNumberId);
    return phoneNumber ? phoneNumber.phone_number : 'Unknown';
  }

  /**
   * Get object values for template iteration
   */
  getObjectValues(obj: any): any[] {
    return Object.values(obj);
  }

  /**
   * Get object keys for template iteration
   */
  getObjectKeys(obj: any): string[] {
    return Object.keys(obj);
  }

  /**
   * Go back (placeholder for navigation)
   */
  goBack(): void {
    this.dialogRef.close();
  }

  /**
   * Handle drag over event
   */
  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = true;
  }

  /**
   * Handle drop event
   */
  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.handleFile(files[0]);
    }
  }

  /**
   * Handle file selection
   */
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.handleFile(input.files[0]);
    }
  }

  /**
   * Handle file processing
   */
  private handleFile(file: File): void {
    if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
      // Handle error - not a CSV file
      return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      // Handle error - file too large
      return;
    }

    this.selectedFile = file;
    this.parseCSV(file);
  }

  /**
   * Parse CSV file
   */
  private parseCSV(file: File): void {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n');
      const headers = lines[0].split(',').map(h => h.trim());
      
      this.csvData = lines.slice(1)
        .filter(line => line.trim())
        .map(line => {
          const values = line.split(',').map(v => v.trim());
          const obj: any = {};
          headers.forEach((header, index) => {
            obj[header] = values[index] || '';
          });
          return obj;
        });
    };
    reader.readAsText(file);
  }

  /**
   * Create campaign
   */
  createCampaign(): void {
    if (this.campaignForm.valid) {
      this.isCreating = true;
      
      const formData = this.campaignForm.value;
      const campaignData = {
        ...formData,
        csv_data: this.csvData
      };

      // Here you would call the campaign service to create the campaign
      // For now, just close the dialog
      setTimeout(() => {
        this.isCreating = false;
        this.dialogRef.close(campaignData);
      }, 2000);
    }
  }
}
