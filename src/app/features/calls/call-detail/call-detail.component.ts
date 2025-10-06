import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTabsModule } from '@angular/material/tabs';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';

import { AuthService } from '../../../core/services/auth.service';
import { OrganizationService } from '../../../core/services/organization.service';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

export interface CallDetail {
  id: string;
  twilio_call_sid?: string;
  twilio_account_sid?: string;
  organization_id: string;
  phone_number_id?: string;
  assistant_id?: string;
  from_number?: string;
  to_number?: string;
  direction: string;
  status: string;
  duration_seconds?: number;
  recording_url?: string;
  transcription?: string;
  end_reason?: string;
  transcript_data: TranscriptMessage[];
  cost_usd?: number;
  cost_currency?: string;
  quality_score?: number;
  sentiment_score?: number;
  satisfaction_rating?: number;
  call_success?: boolean;
  call_summary?: string;
  analysis_completed?: boolean;
  detailed_analysis?: DetailedAnalysis;
  call_data: any;
  created_by?: string;
  started_at?: string;
  ended_at?: string;
  created_at: string;
  updated_at: string;
}

export interface DetailedAnalysis {
  sentiment_breakdown: {
    customer_sentiment: string;
    assistant_performance: string;
    overall_tone: string;
    emotional_indicators: string[];
  };
  conversation_metrics: {
    resolution_quality: string;
    response_time: string;
    communication_effectiveness: string;
    customer_satisfaction_indicators: string[];
  };
  key_topics: string[];
  action_items: string[];
  improvement_suggestions: string[];
}

export interface TranscriptMessage {
  speaker: 'user' | 'assistant' | 'system';
  message: string;
  timestamp: string;
  confidence?: number;
  is_final?: boolean;
  language?: string;
  sentiment?: string;
}

@Component({
  selector: 'app-call-detail',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    MatButtonModule,
    MatTabsModule,
    MatProgressBarModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './call-detail.component.html',
  styleUrls: ['./call-detail.component.scss']
})
export class CallDetailComponent implements OnInit, OnDestroy {
  callId: string = '';
  call: CallDetail | null = null;
  isLoading = true;
  error: string | null = null;
  activeTab = 0; // Default to Transcripts tab
  
  // Messages tab properties
  messageSearchTerm: string = '';
  filteredMessages: TranscriptMessage[] = [];
  
  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService,
    private organizationService: OrganizationService,
    private http: HttpClient,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.route.params.pipe(takeUntil(this.destroy$)).subscribe(params => {
      this.callId = params['id'];
      if (this.callId) {
        this.loadCallDetails();
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadCallDetails(): void {
    this.isLoading = true;
    this.error = null;

    const currentUser = this.authService.getCurrentUser();
    if (!currentUser?.organization_id) {
      this.error = 'Organization not found';
      this.isLoading = false;
      return;
    }

    // Get auth token
    const token = this.authService.getToken();
    if (!token) {
      this.error = 'Authentication required';
      this.isLoading = false;
      return;
    }

    // Make API call to get call details
    const url = `${environment.apiUrl}/call-logs/${this.callId}`;
    
    this.http.get<CallDetail>(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }).subscribe({
      next: (callData) => {
        this.call = callData;
        // Initialize filtered messages
        this.filteredMessages = this.call.transcript_data || [];
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading call details:', error);
        this.error = error.error?.detail || 'Failed to load call details';
        this.isLoading = false;
        
        // Show error notification
        this.snackBar.open(this.error, 'Close', {
          duration: 5000,
          horizontalPosition: 'right',
          verticalPosition: 'top'
        });
      }
    });
  }

  copyCallId(): void {
    if (this.call?.id) {
      navigator.clipboard.writeText(this.call.id).then(() => {
        this.snackBar.open('Call ID copied to clipboard', 'Close', {
          duration: 2000,
          horizontalPosition: 'right',
          verticalPosition: 'top'
        });
      }).catch(err => {
        console.error('Failed to copy call ID: ', err);
      });
    }
  }

  goBack(): void {
    this.router.navigate(['/call-logs']);
  }

  formatDuration(seconds?: number): string {
    if (!seconds) return '00:00';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  formatTimestamp(timestamp: string): string {
    try {
      const date = new Date(timestamp);
      // Check if the date is valid
      if (isNaN(date.getTime())) {
        return 'Invalid time';
      }
      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      });
    } catch (error) {
      console.error('Error formatting timestamp:', timestamp, error);
      return 'Invalid time';
    }
  }

  getRelativeTime(timestamp: string, messageIndex?: number): string {
    if (!this.call?.started_at) return '00:00';
    
    try {
      // Parse timestamps as UTC to avoid timezone issues
      const startTimeStr = this.call.started_at.endsWith('Z') ? this.call.started_at : this.call.started_at + 'Z';
      const messageTimeStr = timestamp.endsWith('Z') ? timestamp : timestamp + 'Z';
      const startTime = new Date(startTimeStr);
      const messageTime = new Date(messageTimeStr);
      
      // Check if dates are valid
      if (isNaN(startTime.getTime()) || isNaN(messageTime.getTime())) {
        console.warn('Invalid timestamp format:', { startTime: this.call.started_at, messageTime: timestamp });
        return this.getEstimatedTime(messageIndex);
      }
      
      const diffMs = messageTime.getTime() - startTime.getTime();
      
      // Debug logging to see what's happening
      console.log('Time calculation debug:', {
        startTime: this.call.started_at,
        messageTime: timestamp,
        startTimeParsed: startTime,
        messageTimeParsed: messageTime,
        diffMs: diffMs,
        diffSeconds: Math.floor(diffMs / 1000),
        messageIndex: messageIndex
      });
      
      // If the calculated time is 0 or negative, use estimated time based on message order
      if (diffMs <= 0) {
        console.warn('Message timestamp is before or same as call start time, using estimated time');
        return this.getEstimatedTime(messageIndex);
      }
      
      // Convert to seconds
      const totalSeconds = Math.floor(diffMs / 1000);
      
      // Calculate minutes and seconds
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;
      
      // Format as MM:SS (clean format like "00:05" or "01:23")
      return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    } catch (error) {
      console.error('Error calculating relative time:', error);
      return this.getEstimatedTime(messageIndex);
    }
  }

  private getEstimatedTime(messageIndex?: number): string {
    if (messageIndex === undefined) return '00:00';
    
    // Estimate time based on message order (assuming ~3-5 seconds between messages)
    const estimatedSeconds = messageIndex * 4; // 4 seconds per message as a reasonable estimate
    const minutes = Math.floor(estimatedSeconds / 60);
    const seconds = estimatedSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  getEndReasonText(): string {
    if (!this.call?.end_reason) return '';
    
    const endReasonMap: { [key: string]: string } = {
      'user_hangup': 'Customer ended the call',
      'assistant_hangup': 'Assistant ended the call',
      'system_error': 'System error occurred',
      'timeout': 'Call timed out',
      'network_error': 'Network error occurred',
      'call_completed': 'Call completed successfully',
      'user_cancelled': 'Customer cancelled the call',
      'assistant_cancelled': 'Assistant cancelled the call'
    };
    
    return endReasonMap[this.call.end_reason] || 'Call ended';
  }

  getEndTime(): string {
    if (!this.call?.ended_at) return '';
    return this.formatTimestamp(this.call.ended_at);
  }

  setActiveTab(tab: number): void {
    this.activeTab = tab;
  }

  // Messages tab methods
  filterMessages(): void {
    if (!this.call?.transcript_data) {
      this.filteredMessages = [];
      return;
    }

    if (!this.messageSearchTerm.trim()) {
      this.filteredMessages = this.call.transcript_data;
      return;
    }

    const searchTerm = this.messageSearchTerm.toLowerCase();
    this.filteredMessages = this.call.transcript_data.filter(message =>
      message.message.toLowerCase().includes(searchTerm) ||
      message.speaker.toLowerCase().includes(searchTerm)
    );
  }

  copyMessage(message: TranscriptMessage): void {
    const messageJson = this.formatMessageAsJson(message);
    navigator.clipboard.writeText(messageJson).then(() => {
      this.snackBar.open('Message copied to clipboard', 'Close', {
        duration: 2000,
        horizontalPosition: 'right',
        verticalPosition: 'top'
      });
    }).catch(err => {
      console.error('Failed to copy message: ', err);
    });
  }

  formatMessageAsJson(message: TranscriptMessage): string {
    const messageData = {
      role: message.speaker === 'assistant' ? 'bot' : message.speaker,
      time: message.timestamp, // Use original timestamp format instead of converting to Unix milliseconds
      message: message.message,
      ...(message.confidence && { confidence: message.confidence }),
      ...(message.speaker === 'assistant' && { 
        source: ''
      })
    };

    return JSON.stringify(messageData, null, 2);
  }


  trackByMessageIndex(index: number, message: TranscriptMessage): string {
    return `${message.timestamp}-${index}`;
  }

  // Analysis tab methods
  getSentimentPercentage(score?: number): number {
    if (!score) return 0;
    return Math.round(score * 100);
  }

  getSentimentColor(score?: number): string {
    if (!score) return 'linear-gradient(135deg, #666 0%, #999 100%)';
    
    const percentage = score * 100;
    if (percentage >= 70) {
      return 'linear-gradient(135deg, #4CAF50 0%, #66BB6A 100%)'; // Green
    } else if (percentage >= 40) {
      return 'linear-gradient(135deg, #FF9800 0%, #FFB74D 100%)'; // Orange
    } else {
      return 'linear-gradient(135deg, #F44336 0%, #EF5350 100%)'; // Red
    }
  }

  getSentimentLabel(score?: number): string {
    if (!score) return 'Neutral';
    
    const percentage = score * 100;
    if (percentage >= 70) {
      return 'Positive';
    } else if (percentage >= 40) {
      return 'Neutral';
    } else {
      return 'Negative';
    }
  }
}
