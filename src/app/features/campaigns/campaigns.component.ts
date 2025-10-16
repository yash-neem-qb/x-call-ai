import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatOptionModule } from '@angular/material/core';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatRadioModule } from '@angular/material/radio';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';

import { CampaignService, Campaign, CampaignCreate, CampaignUpdate } from '../../core/services/campaign.service';
import { AssistantService, Assistant } from '../../core/services/assistant.service';
import { PhoneService, PhoneNumber, ApiPhoneNumber } from '../../core/services/phone.service';


@Component({
  selector: 'app-campaigns',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    MatTooltipModule,
    MatInputModule,
    MatSelectModule,
    MatOptionModule,
    MatSlideToggleModule,
    MatProgressBarModule,
    MatSnackBarModule,
    MatFormFieldModule,
    MatProgressSpinnerModule,
    MatRadioModule,
    MatDatepickerModule,
    MatNativeDateModule
  ],
  templateUrl: './campaigns.component.html',
  styleUrls: ['./campaigns.component.scss']
})
export class CampaignsComponent implements OnInit, OnDestroy {
  // Campaigns data
  campaigns: Campaign[] = [];
  selectedCampaign: Campaign | null = null;
  newCampaign: CampaignCreate | null = null;
  isLoading = true;
  error: string | null = null;
  
  // Assistant and phone number data for dropdowns
  assistants: Assistant[] = [];
  phoneNumbers: ApiPhoneNumber[] = [];
  
  // Search and filter
  searchTerm = '';
  statusFilter = 'all';
  assistantFilter = 'all';
  
  // Configuration panel
  activeTab = 'overview';
  configTabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'contacts', label: 'Contacts' }
  ];
  
  
  private destroy$ = new Subject<void>();

  // Form properties
  isCreatingCampaign = false;
  editingCampaign: Campaign | null = null;
  campaignForm: FormGroup;
  isDragOver = false;
  isCreating = false;
  csvData: any[] = [];

  constructor(
    private campaignService: CampaignService,
    private assistantService: AssistantService,
    private phoneService: PhoneService,
    private router: Router,
    private snackBar: MatSnackBar,
    private fb: FormBuilder
  ) {}

  ngOnInit(): void {
    this.initializeForm();
    this.loadCampaigns();
    this.loadAssistants();
    this.loadPhoneNumbers();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Load campaigns from the service
   */
  loadCampaigns(): void {
    this.isLoading = true;
    this.error = null;
    
    this.campaignService.getCampaigns()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.campaigns = response.items;
          this.isLoading = false;
        },
        error: (err) => {
          console.error('Error loading campaigns:', err);
          this.error = 'Failed to load campaigns. Please try again.';
          this.isLoading = false;
        }
      });
  }

  /**
   * Load assistants for dropdown
   */
  loadAssistants(): void {
    this.assistantService.getAssistants()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.assistants = response.items;
        },
        error: (err) => {
          console.error('Error loading assistants:', err);
        }
      });
  }

  /**
   * Load phone numbers for dropdown
   */
  loadPhoneNumbers(): void {
    this.phoneService.getPhoneNumbers()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.phoneNumbers = response;
        },
        error: (err) => {
          console.error('Error loading phone numbers:', err);
        }
      });
  }


  /**
   * Set active tab in configuration panel
   */
  setActiveTab(tabId: string): void {
    this.activeTab = tabId;
  }

  /**
   * Get assistant name by ID
   */
  getAssistantName(assistantId: string): string {
    const assistant = this.assistants.find(a => a.id === assistantId);
    return assistant ? assistant.name : 'Unknown Assistant';
  }

  /**
   * Get phone number name by ID
   */
  getPhoneNumberName(phoneNumberId: string): string {
    const phoneNumber = this.phoneNumbers.find(p => p.id === phoneNumberId);
    return phoneNumber ? phoneNumber.phone_number : 'Unknown Number';
  }

  /**
   * Select a campaign to view details
   */
  selectCampaign(campaign: Campaign): void {
    this.selectedCampaign = campaign;
    this.activeTab = 'overview'; // Reset to overview tab when selecting a campaign
    
    // Load contacts for the selected campaign
    this.loadCampaignContacts(campaign.id);
  }

  /**
   * Load contacts for the selected campaign
   */
  loadCampaignContacts(campaignId: string): void {
    this.campaignService.getCampaignContacts(campaignId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (contacts) => {
          if (this.selectedCampaign) {
            this.selectedCampaign.contacts = contacts;
          }
        },
        error: (err) => {
          console.error('Error loading campaign contacts:', err);
          // Don't show error to user as this is not critical
        }
      });
  }

  /**
   * Open campaign menu
   */
  openCampaignMenu(campaign: Campaign, event: Event): void {
    this.selectedCampaign = campaign;
    // Menu will be triggered by template
  }

  /**
   * Upload contacts for selected campaign
   */
  uploadContacts(): void {
    if (this.selectedCampaign) {
      // TODO: Implement contact upload functionality
      this.snackBar.open('Contact upload functionality coming soon', 'Close', { duration: 3000 });
    }
  }

  /**
   * Handle search change
   */
  onSearchChange(): void {
    // Search is handled by the filteredCampaigns getter
  }


  /**
   * Get filtered campaigns based on search and filters
   */
  get filteredCampaigns(): Campaign[] {
    let filtered = this.campaigns;

    // Apply search filter
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(campaign =>
        campaign.name.toLowerCase().includes(term) ||
        campaign.description?.toLowerCase().includes(term)
      );
    }

    // Apply status filter
    if (this.statusFilter !== 'all') {
      filtered = filtered.filter(campaign => campaign.status === this.statusFilter);
    }

    // Apply assistant filter
    if (this.assistantFilter !== 'all') {
      filtered = filtered.filter(campaign => campaign.assistant_id === this.statusFilter);
    }

    return filtered;
  }



  /**
   * Edit campaign - open inline form
   */
  editCampaign(campaign: Campaign): void {
    this.editingCampaign = campaign;
    this.isCreatingCampaign = true;
    
    // Parse scheduled_at if it exists
    let scheduleDate = null;
    let scheduleTime = '';
    let scheduleTimezone = 'Asia/Calcutta';
    
    if (campaign.scheduled_at) {
      const scheduledDate = new Date(campaign.scheduled_at);
      scheduleDate = scheduledDate;
      scheduleTime = scheduledDate.toTimeString().slice(0, 5); // HH:MM format
      // You might want to detect timezone from the date or use a default
    }
    
    // Populate form with campaign data
    this.campaignForm.patchValue({
      name: campaign.name,
      description: campaign.description,
      phone_number_id: campaign.phone_number_id,
      assistant_id: campaign.assistant_id,
      schedule_type: campaign.schedule_type,
      schedule_date: scheduleDate,
      schedule_time: scheduleTime,
      schedule_timezone: scheduleTimezone,
      scheduled_at: campaign.scheduled_at
    });
  }

  /**
   * Delete campaign
   */
  deleteCampaign(campaign: Campaign): void {
    if (confirm(`Are you sure you want to delete "${campaign.name}"?`)) {
      this.campaignService.deleteCampaign(campaign.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.campaigns = this.campaigns.filter(c => c.id !== campaign.id);
            this.snackBar.open('Campaign deleted successfully', 'Close', { duration: 3000 });
          },
          error: (err) => {
            console.error('Error deleting campaign:', err);
            this.snackBar.open('Failed to delete campaign', 'Close', { duration: 3000 });
          }
        });
    }
  }

  /**
   * Toggle campaign status
   */
  toggleCampaignStatus(campaign: Campaign): void {
    const newStatus = campaign.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
    const updateData: CampaignUpdate = { status: newStatus };

    this.campaignService.updateCampaign(campaign.id, updateData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updatedCampaign) => {
          const index = this.campaigns.findIndex(c => c.id === campaign.id);
          if (index !== -1) {
            this.campaigns[index] = updatedCampaign;
            this.snackBar.open(`Campaign ${newStatus} successfully`, 'Close', { duration: 3000 });
          }
        },
        error: (err) => {
          console.error('Error updating campaign status:', err);
          this.snackBar.open('Failed to update campaign status', 'Close', { duration: 3000 });
        }
      });
  }

  /**
   * Get status color for campaign
   */
  getStatusColor(status: string): string {
    switch (status) {
      case 'ACTIVE': return 'green';
      case 'PAUSED': return 'orange';
      case 'COMPLETED': return 'blue';
      case 'DRAFT': return 'gray';
      case 'CANCELLED': return 'red';
      default: return 'gray';
    }
  }

  /**
   * Get phone number by ID
   */
  getPhoneNumber(phoneNumberId: string): string {
    const phoneNumber = this.phoneNumbers.find(p => p.id === phoneNumberId);
    return phoneNumber ? phoneNumber.phone_number : 'Unknown';
  }

  /**
   * Format date for display
   */
  formatDate(date: string | Date): string {
    return new Date(date).toLocaleDateString();
  }

  /**
   * Clear search
   */
  clearSearch(): void {
    this.searchTerm = '';
  }

  /**
   * Clear filters
   */
  clearFilters(): void {
    this.statusFilter = 'all';
    this.assistantFilter = 'all';
  }

  /**
   * Initialize the campaign form
   */
  initializeForm(): void {
    this.campaignForm = this.fb.group({
      name: ['', Validators.required],
      description: [''],
      phone_number_id: ['', Validators.required],
      assistant_id: ['', Validators.required],
      schedule_type: ['NOW'],
      schedule_date: [null],
      schedule_time: [''],
      schedule_timezone: ['Asia/Calcutta'],
      scheduled_at: [null],
      max_calls_per_hour: [50],
      retry_failed_calls: [true],
      max_retries: [3],
      retry_delay_minutes: [30]
    });

    // Add conditional validation for scheduled fields
    this.campaignForm.get('schedule_type')?.valueChanges.subscribe(value => {
      const scheduleDateControl = this.campaignForm.get('schedule_date');
      const scheduleTimeControl = this.campaignForm.get('schedule_time');
      
      if (value === 'SCHEDULED') {
        scheduleDateControl?.setValidators([Validators.required]);
        scheduleTimeControl?.setValidators([Validators.required]);
      } else {
        scheduleDateControl?.clearValidators();
        scheduleTimeControl?.clearValidators();
        scheduleDateControl?.setValue(null);
        scheduleTimeControl?.setValue('');
      }
      scheduleDateControl?.updateValueAndValidity();
      scheduleTimeControl?.updateValueAndValidity();
    });

    // Combine date and time when either changes
    this.campaignForm.get('schedule_date')?.valueChanges.subscribe(() => {
      this.updateScheduledAt();
    });

    this.campaignForm.get('schedule_time')?.valueChanges.subscribe(() => {
      this.updateScheduledAt();
    });

    this.campaignForm.get('schedule_timezone')?.valueChanges.subscribe(() => {
      this.updateScheduledAt();
    });
  }

  /**
   * Update scheduled_at field by combining date, time, and timezone
   */
  private updateScheduledAt(): void {
    const date = this.campaignForm.get('schedule_date')?.value;
    const time = this.campaignForm.get('schedule_time')?.value;
    const timezone = this.campaignForm.get('schedule_timezone')?.value;

    if (date && time && timezone) {
      // Create a date string in the format expected by the backend
      const dateTimeString = `${date.toISOString().split('T')[0]}T${time}`;
      const scheduledAt = new Date(dateTimeString);
      this.campaignForm.get('scheduled_at')?.setValue(scheduledAt);
    } else {
      this.campaignForm.get('scheduled_at')?.setValue(null);
    }
  }

  /**
   * Open campaign creation form
   */
  createCampaign(): void {
    this.isCreatingCampaign = true;
    this.editingCampaign = null;
    this.selectedCampaign = null;
    this.initializeForm();
  }

  /**
   * Cancel campaign form
   */
  cancelCampaignForm(): void {
    this.isCreatingCampaign = false;
    this.editingCampaign = null;
    this.csvData = [];
    this.isDragOver = false;
    this.initializeForm(); // Reset form to default values
  }

  /**
   * Handle drag over event
   */
  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver = true;
  }

  /**
   * Handle drag leave event
   */
  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver = false;
  }

  /**
   * Handle drop event
   */
  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver = false;
    
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.handleFile(files[0]);
    }
  }

  /**
   * Handle file selection
   */
  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.handleFile(file);
    }
  }

  /**
   * Handle file processing
   */
  handleFile(file: File): void {
    if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
      this.snackBar.open('Please select a CSV file', 'Close', { duration: 3000 });
      return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      this.snackBar.open('File size must be less than 5MB', 'Close', { duration: 3000 });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const csv = e.target?.result as string;
      this.parseCSV(csv);
    };
    reader.readAsText(file);
  }

  /**
   * Parse CSV data
   */
  parseCSV(csv: string): void {
    const lines = csv.split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    const data = [];

    for (let i = 1; i < lines.length; i++) {
      if (lines[i].trim()) {
        const values = lines[i].split(',').map(v => v.trim());
        const row: any = {};
        headers.forEach((header, index) => {
          row[header] = values[index] || '';
        });
        data.push(row);
      }
    }

    this.csvData = data;
    this.snackBar.open(`Loaded ${data.length} contacts from CSV`, 'Close', { duration: 3000 });
  }

  /**
   * Download CSV template
   */
  downloadTemplate(): void {
    const templateData = `phone_number,name,email
+919876543210,Rajesh Kumar,rajesh.kumar@email.com
+919876543211,Priya Sharma,priya.sharma@email.com
+919876543212,Amit Patel,amit.patel@email.com
+919876543213,Sunita Singh,sunita.singh@email.com
+919876543214,Vikram Gupta,vikram.gupta@email.com`;

    const blob = new Blob([templateData], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'campaign-template.csv';
    link.click();
    window.URL.revokeObjectURL(url);
  }

  /**
   * Submit campaign form
   */
  submitCampaign(): void {
    if (this.campaignForm.valid) {
      this.isCreating = true;
      
      if (this.editingCampaign) {
        // Update existing campaign
        const updateData: CampaignUpdate = {
          ...this.campaignForm.value
        };

        this.campaignService.updateCampaign(this.editingCampaign.id, updateData)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: (campaign) => {
              this.snackBar.open('Campaign updated successfully', 'Close', { duration: 3000 });
              this.cancelCampaignForm();
              this.loadCampaigns();
            },
            error: (error) => {
              this.snackBar.open('Error updating campaign', 'Close', { duration: 3000 });
              console.error('Error updating campaign:', error);
            },
            complete: () => {
              this.isCreating = false;
            }
          });
      } else {
        // Create new campaign
        const campaignData: CampaignCreate = {
          ...this.campaignForm.value,
          contacts: this.csvData.map(row => ({
            phone_number: row.phone_number || '',
            name: row.name || '',
            email: row.email || ''
          }))
        };

        this.campaignService.createCampaign(campaignData)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: (campaign) => {
              this.snackBar.open('Campaign created successfully', 'Close', { duration: 3000 });
              this.cancelCampaignForm();
              this.loadCampaigns();
            },
            error: (error) => {
              this.snackBar.open('Error creating campaign', 'Close', { duration: 3000 });
              console.error('Error creating campaign:', error);
            },
            complete: () => {
              this.isCreating = false;
            }
          });
      }
    }
  }

  /**
   * Helper methods for template
   */
  getObjectKeys(obj: any): string[] {
    return Object.keys(obj);
  }

  getObjectValues(obj: any): any[] {
    return Object.values(obj);
  }
}
