import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Subject, takeUntil } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { AssistantService } from '../../core/services/assistant.service';
import { environment } from '../../../environments/environment';

interface CallLog {
  id: string;
  organizationId: string;
  phoneNumberId?: string;
  assistantId?: string;
  fromNumber?: string;
  toNumber?: string;
  direction: 'inbound' | 'outbound' | 'web';
  status: string;
  sessionId?: string;
  startedAt?: string;
  endedAt?: string;
  durationSeconds?: number;
  costUsd?: number;
  createdAt: string;
  updatedAt: string;
  endReason?: string;
  transcriptData?: any[];
  // AI Analysis fields
  call_success?: boolean;
  call_summary?: string;
  sentiment_score?: number;
  analysis_completed?: boolean;
  detailed_analysis?: any;
}

interface Assistant {
  id: string;
  name: string;
  createdAt?: string;
}

interface PhoneNumber {
  id: string;
  phone_number: string;
  friendly_name?: string;
}

interface FilterOption {
  key: string;
  label: string;
}

interface DateFilter {
  operator: string;
  value: string;
}

interface CostFilter {
  operator: string;
  value: number;
}

interface TypeFilter {
  inbound: boolean;
  outbound: boolean;
  web: boolean;
}

interface AssistantFilter {
  selectedId: string;
}

interface TransientFilter {
  value: string;
}

interface PhoneFilter {
  selectedNumber: string;
}

interface CustomerFilter {
  value: string;
}

interface CallIdFilter {
  value: string;
}

interface SuccessFilter {
  value: string;
}

interface ReasonFilter {
  value: string;
}

@Component({
  selector: 'app-calls',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatProgressSpinnerModule],
  templateUrl: './calls.component.html',
  styleUrls: ['./calls.component.scss']
})
export class CallsComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  // Data
  callLogs: CallLog[] = [];
  assistants: Assistant[] = [];
  phoneNumbers: PhoneNumber[] = [];
  
  // Loading state
  isLoading = false;
  
  // Pagination
  currentPage = 1;
  pageSize = 50;
  totalPages = 1;
  totalCalls = 0;
  
  // Statistics
  transferredCalls = 0;
  successfulCalls = 0;
  failedCalls = 0;
  
  // Vapi-style Filters
  activeFilterType: string | null = null;
  quickFilter: string | null = null;
  
  // Filter objects
  dateFilter: DateFilter = { operator: 'is_equal_to', value: '' };
  costFilter: CostFilter = { operator: 'is_equal_to', value: 0 };
  typeFilter: TypeFilter = { inbound: false, outbound: false, web: false };
  assistantFilter: AssistantFilter = { selectedId: '' };
  transientFilter: TransientFilter = { value: '' };
  phoneFilter: PhoneFilter = { selectedNumber: '' };
  customerFilter: CustomerFilter = { value: '' };
  callIdFilter: CallIdFilter = { value: '' };
  successFilter: SuccessFilter = { value: '' };
  reasonFilter: ReasonFilter = { value: '' };
  
  // Filtered data
  filteredCallLogs: CallLog[] = [];
  
  // Search functionality
  searchTerm: string = '';
  
  // Selection properties for bulk operations
  selectedCalls: Set<string> = new Set();
  selectAll: boolean = false;
  
  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private assistantService: AssistantService,
    private router: Router
  ) {}
  
  ngOnInit(): void {
    this.loadCallLogs();
    this.loadAssistants();
    this.loadPhoneNumbers();
  }
  
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
  
  loadCallLogs(): void {
    this.isLoading = true;
    
    // Get organization ID from current user
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser || !currentUser.organization_id) {
      console.error('No organization ID found for current user');
      this.callLogs = [];
      this.applyFilters();
      this.calculateStatistics();
      this.isLoading = false;
      return;
    }
    
    const organizationId = currentUser.organization_id;
    
    // Get auth token
    const token = this.authService.getToken();
    if (!token) {
      console.error('No auth token found');
      this.callLogs = [];
      this.applyFilters();
      this.calculateStatistics();
      this.isLoading = false;
      return;
    }

    // Build query parameters for filters
    const queryParams = new URLSearchParams();
    queryParams.set('page', this.currentPage.toString());
    queryParams.set('per_page', this.pageSize.toString());
    
    // Add filter parameters
    if (this.dateFilter.value) {
      const date = new Date(this.dateFilter.value);
      if (this.dateFilter.operator === 'is_equal_to') {
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);
        queryParams.set('date_from', startOfDay.toISOString());
        queryParams.set('date_to', endOfDay.toISOString());
      } else if (this.dateFilter.operator === 'is_before') {
        queryParams.set('date_to', date.toISOString());
      } else if (this.dateFilter.operator === 'is_after') {
        queryParams.set('date_from', date.toISOString());
      }
    }
    
    if (this.costFilter.value > 0) {
      if (this.costFilter.operator === 'is_equal_to') {
        queryParams.set('cost_min', this.costFilter.value.toString());
        queryParams.set('cost_max', this.costFilter.value.toString());
      } else if (this.costFilter.operator === 'is_greater_than') {
        queryParams.set('cost_min', this.costFilter.value.toString());
      } else if (this.costFilter.operator === 'is_less_than') {
        queryParams.set('cost_max', this.costFilter.value.toString());
      }
    }
    
    if (this.typeFilter.inbound || this.typeFilter.outbound || this.typeFilter.web) {
      if (this.typeFilter.inbound) queryParams.set('direction', 'inbound');
      else if (this.typeFilter.outbound) queryParams.set('direction', 'outbound');
      else if (this.typeFilter.web) queryParams.set('direction', 'web');
    }
    
    if (this.assistantFilter.selectedId) {
      queryParams.set('assistant_id', this.assistantFilter.selectedId);
    }
    
    if (this.phoneFilter.selectedNumber) {
      queryParams.set('phone_number', this.phoneFilter.selectedNumber);
    }
    
    if (this.customerFilter.value) {
      queryParams.set('customer_phone', this.customerFilter.value);
    }
    
    if (this.callIdFilter.value) {
      queryParams.set('call_id', this.callIdFilter.value);
    }
    
    if (this.successFilter.value) {
      queryParams.set('call_success', this.successFilter.value === 'pass' ? 'true' : 'false');
    }
    
    if (this.reasonFilter.value) {
      queryParams.set('end_reason', this.reasonFilter.value);
    }
    
    if (this.transientFilter.value) {
      queryParams.set('search', this.transientFilter.value);
    }
    
    if (this.searchTerm.trim()) {
      queryParams.set('search', this.searchTerm.trim());
    }
    
    // Call real API using the new organization-based endpoint with filters
    const url = `${environment.apiUrl}/organizations/${organizationId}/calls?${queryParams.toString()}`;
    
    this.http.get<any>(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.callLogs = response.calls.map(call => ({
            id: call.id,
            organizationId: call.organization_id,
            phoneNumberId: call.phone_number_id,
            assistantId: call.assistant_id,
            fromNumber: call.from_number,
            toNumber: call.to_number,
            direction: call.direction,
            status: call.status,
            sessionId: call.twilio_call_sid,
            startedAt: call.started_at,
            endedAt: call.ended_at,
            durationSeconds: call.duration_seconds,
            costUsd: call.cost_usd,
            createdAt: call.created_at,
            updatedAt: call.updated_at,
            endReason: call.end_reason,
            transcriptData: call.transcript_data,
            // AI Analysis fields
            call_success: call.call_success,
            call_summary: call.call_summary,
            sentiment_score: call.sentiment_score,
            analysis_completed: call.analysis_completed,
            detailed_analysis: call.detailed_analysis
          }));
          
          // Update pagination info
          this.totalCalls = response.total || 0;
          this.totalPages = response.total_pages || 1;
          
          this.applyFilters();
          this.calculateStatistics();
          this.isLoading = false;
        },
        error: (err) => {
          console.error('Error loading call logs:', err);
          this.callLogs = [];
          this.applyFilters();
          this.calculateStatistics();
          this.isLoading = false;
        }
      });
  }
  
  loadAssistants(): void {
    this.assistantService.getAssistants(1, 100)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.assistants = response.items.map(assistant => ({
            id: assistant.id,
            name: assistant.name,
            createdAt: assistant.createdAt
          }));
        },
        error: (err) => {
          console.error('Error loading assistants:', err);
          this.assistants = [];
        }
      });
  }

  loadPhoneNumbers(): void {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser?.organization_id) {
      return;
    }

    const token = this.authService.getToken();
    if (!token) {
      return;
    }

    const url = `${environment.apiUrl}/organizations/${currentUser.organization_id}/phone-numbers`;
    
    this.http.get<any[]>(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (phoneNumbers) => {
          this.phoneNumbers = phoneNumbers.map(phone => ({
            id: phone.id,
            phone_number: phone.phone_number,
            friendly_name: phone.friendly_name
          }));
        },
        error: (err) => {
          console.error('Error loading phone numbers:', err);
          this.phoneNumbers = [];
        }
      });
  }
  
  generateMockCallLogs(): CallLog[] {
    const mockCalls: CallLog[] = [];
    const directions: ('inbound' | 'outbound' | 'web')[] = ['web', 'inbound', 'outbound'];
    const statuses = ['completed', 'failed', 'initiated'];
    
    for (let i = 0; i < 25; i++) {
      const direction = directions[Math.floor(Math.random() * directions.length)];
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      const duration = Math.floor(Math.random() * 300) + 10; // 10-310 seconds
      const cost = Math.random() * 0.1; // 0-0.1 USD
      
      mockCalls.push({
        id: this.generateCallId(),
        organizationId: 'org-1',
        assistantId: `assistant-${Math.floor(Math.random() * 3) + 1}`,
        fromNumber: direction === 'web' ? undefined : '+1234567890',
        toNumber: direction === 'web' ? undefined : '+0987654321',
        direction,
        status,
        sessionId: direction === 'web' ? `session-${i}` : undefined,
        startedAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
        endedAt: status === 'completed' ? new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000 + duration * 1000).toISOString() : undefined,
        durationSeconds: status === 'completed' ? duration : undefined,
        costUsd: cost,
        createdAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date().toISOString()
      });
    }
    
    return mockCalls.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
  
  generateCallId(): string {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }
  
  calculateStatistics(): void {
    // Calculate statistics based on current call logs
    this.successfulCalls = this.callLogs.filter(call => call.status === 'completed').length;
    this.failedCalls = this.callLogs.filter(call => call.status === 'failed').length;
    this.transferredCalls = 0; // Not implemented yet
  }
  
  getAssistantName(assistantId?: string): string {
    if (!assistantId) return '-';
    const assistant = this.assistants.find(a => a.id === assistantId);
    return assistant ? assistant.name : 'Unknown Assistant';
  }
  
  getEndedReason(call: CallLog): string {
    if (!call.endedAt) return 'Unknown';
    if (call.status === 'failed') return 'Assistant Did Not Receive';
    if (call.status === 'completed') return 'Customer Ended Call';
    return 'Unknown';
  }
  
  formatStartTime(startTime?: string): string {
    if (!startTime) return '-';
    const date = new Date(startTime);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
  
  formatDuration(durationSeconds?: number): string {
    if (!durationSeconds) return '-';
    
    const minutes = Math.floor(durationSeconds / 60);
    const seconds = durationSeconds % 60;
    
    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  }
  
  formatCost(costUsd?: number): string {
    if (!costUsd) return '$0.00';
    return `$${costUsd.toFixed(2)}`;
  }
  
  // Vapi-style filter methods
  toggleFilterDropdown(filterType: string): void {
    if (this.activeFilterType === filterType) {
      this.activeFilterType = null;
    } else {
      this.activeFilterType = filterType;
    }
  }

  getAssistantAge(createdAt?: string): string {
    if (!createdAt) return 'Unknown';
    
    const created = new Date(createdAt);
    const now = new Date();
    const diffInMonths = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24 * 30));
    
    if (diffInMonths < 1) return 'about 1 month ago';
    if (diffInMonths === 1) return '1 month ago';
    return `${diffInMonths} months ago`;
  }

  // Filter application methods
  applyDateFilter(): void {
    this.applyFilters();
    this.activeFilterType = null;
  }

  applyCostFilter(): void {
    this.applyFilters();
    this.activeFilterType = null;
  }

  applyTypeFilter(): void {
    this.applyFilters();
    this.activeFilterType = null;
  }

  applyTransientFilter(): void {
    this.applyFilters();
    this.activeFilterType = null;
  }

  applyCustomerFilter(): void {
    this.applyFilters();
    this.activeFilterType = null;
  }

  applyCallIdFilter(): void {
    this.applyFilters();
    this.activeFilterType = null;
  }

  applyReasonFilter(): void {
    this.applyFilters();
    this.activeFilterType = null;
  }

  applyQuickFilter(filterType: string): void {
    if (this.quickFilter === filterType) {
      // If clicking the same filter, clear it
      this.quickFilter = null;
    } else {
      this.quickFilter = filterType;
    }
    this.applyFilters();
  }

  applyFilters(): void {
    // Since we're now using server-side filtering, we just need to reload the data
    // The filtering logic is handled in the loadCallLogs method
    this.currentPage = 1; // Reset to first page when applying filters
    this.loadCallLogs();
  }

  onSearchChange(searchTerm: string): void {
    this.searchTerm = searchTerm;
    this.applyFilters();
  }
  
  refreshCallLogs(): void {
    this.loadCallLogs();
  }
  
  exportCallLogs(): void {
    // Implement CSV export
    console.log('Exporting call logs to CSV...');
  }
  
  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.loadCallLogs();
    }
  }
  
  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.loadCallLogs();
    }
  }
  
  trackByCallId(index: number, call: CallLog): string {
    return call.id;
  }

  viewCallDetails(callId: string): void {
    this.router.navigate(['/call-logs', callId]);
  }

  // Selection methods
  toggleSelectAll(): void {
    this.selectAll = !this.selectAll;
    if (this.selectAll) {
      this.selectedCalls = new Set(this.callLogs.map(call => call.id));
    } else {
      this.selectedCalls.clear();
    }
  }

  toggleCallSelection(callId: string): void {
    if (this.selectedCalls.has(callId)) {
      this.selectedCalls.delete(callId);
    } else {
      this.selectedCalls.add(callId);
    }
    this.selectAll = this.selectedCalls.size === this.callLogs.length;
  }

  isCallSelected(callId: string): boolean {
    return this.selectedCalls.has(callId);
  }

  get selectedCallsCount(): number {
    return this.selectedCalls.size;
  }

  // Bulk delete method
  deleteSelectedCalls(): void {
    if (this.selectedCalls.size === 0) {
      return;
    }

    const callIds = Array.from(this.selectedCalls);
    const confirmMessage = `Are you sure you want to delete ${callIds.length} call log(s)? This action cannot be undone.`;
    
    if (confirm(confirmMessage)) {
      this.isLoading = true;
      
      const currentUser = this.authService.getCurrentUser();
      const token = this.authService.getToken();
      
      if (!currentUser?.organization_id || !token) {
        console.error('Authentication required');
        this.isLoading = false;
        return;
      }

      const url = `${environment.apiUrl}/call-logs/bulk`;
      
      this.http.delete(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: callIds
      }).subscribe({
        next: (response: any) => {
          console.log('Bulk delete response:', response);
          this.selectedCalls.clear();
          this.selectAll = false;
          this.loadCallLogs(); // Reload the list
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error deleting calls:', error);
          this.isLoading = false;
        }
      });
    }
  }
}
