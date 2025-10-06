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
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';

import { CampaignService, Campaign, CampaignCreate, CampaignUpdate } from '../../core/services/campaign.service';
import { AssistantService, Assistant } from '../../core/services/assistant.service';
import { PhoneService, PhoneNumber, ApiPhoneNumber } from '../../core/services/phone.service';

export interface CampaignStats {
  total: number;
  active: number;
  completed: number;
  paused: number;
}

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
    MatRadioModule
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
    { id: 'contacts', label: 'Contacts' },
    { id: 'settings', label: 'Settings' }
  ];
  
  // Campaign stats
  campaignStats = {
    totalCalls: 0,
    successRate: 0,
    avgDuration: 0,
    totalCost: 0
  };
  
  // Stats
  stats: CampaignStats = {
    total: 0,
    active: 0,
    completed: 0,
    paused: 0
  };
  
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
          this.calculateStats();
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
   * Calculate campaign statistics
   */
  calculateStats(): void {
    this.stats = {
      total: this.campaigns.length,
      active: this.campaigns.filter(c => c.status === 'ACTIVE').length,
      completed: this.campaigns.filter(c => c.status === 'COMPLETED').length,
      paused: this.campaigns.filter(c => c.status === 'PAUSED').length
    };
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
    event.stopPropagation();
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
    
    // Populate form with campaign data
    this.campaignForm.patchValue({
      name: campaign.name,
      description: campaign.description,
      phone_number_id: campaign.phone_number_id,
      assistant_id: campaign.assistant_id,
      schedule_type: campaign.schedule_type,
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
            this.calculateStats();
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
            this.calculateStats();
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
      scheduled_at: [null],
      max_calls_per_hour: [50],
      retry_failed_calls: [true],
      max_retries: [3],
      retry_delay_minutes: [30]
    });
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
            phone_number: row.phone_number || row.phone || '',
            name: row.name || '',
            email: row.email || '',
            custom_field_1: row.custom_field_1 || '',
            custom_field_2: row.custom_field_2 || '',
            custom_field_3: row.custom_field_3 || '',
            custom_field_4: row.custom_field_4 || '',
            custom_field_5: row.custom_field_5 || ''
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
