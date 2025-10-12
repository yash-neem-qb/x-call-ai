import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

export interface CallMetrics {
  total_calls: number;
  total_duration: number;
  success_rate: number;
  average_call_length: number;
}

export interface CallsByDay {
  date: string;
  count: number;
}

export interface HourlyDistribution {
  days: number;
  distribution: {
    hour: number;
    count: number;
  }[];
}

export interface AnalyticsDashboardSummary {
  total_assistants: number;
  total_calls: number;
  total_duration: number;
  success_rate: number;
}

export interface AssistantAnalytics {
  assistant: {
    id: string;
    name: string;
  };
  analytics: {
    total_calls: number;
    total_duration: number;
    success_rate: number;
    average_call_length: number;
    calls_by_day: number[];
  };
}

export interface AssistantsAnalytics {
  assistants: {
    id: string;
    name: string;
    total_calls: number;
    success_rate: number;
    average_call_length: number;
  }[];
}

@Injectable({
  providedIn: 'root'
})
export class AnalyticsService {
  private readonly API_URL = environment.apiUrl;

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  /**
   * Get organization ID from current user
   */
  private getOrganizationId(): string {
    const user = this.authService.getCurrentUser();
    if (!user || !user.organization_id) {
      throw new Error('Organization ID not available');
    }
    return user.organization_id;
  }

  /**
   * Get dashboard summary
   */
  getDashboardSummary(): Observable<AnalyticsDashboardSummary> {
    const organizationId = this.getOrganizationId();
    return this.http.get<AnalyticsDashboardSummary>(
      `${this.API_URL}/organizations/${organizationId}/dashboard/summary`
    );
  }

  /**
   * Get dashboard overview with detailed metrics and filters
   */
  getDashboardOverview(
    dateFrom?: string, 
    dateTo?: string, 
    assistantId?: string, 
    periodDays?: number
  ): Observable<any> {
    const organizationId = this.getOrganizationId();
    let url = `${this.API_URL}/organizations/${organizationId}/dashboard/overview`;
    
    const params = new URLSearchParams();
    if (dateFrom) params.append('date_from', dateFrom);
    if (dateTo) params.append('date_to', dateTo);
    if (assistantId && assistantId !== 'all') params.append('assistant_id', assistantId);
    if (periodDays) params.append('period_days', periodDays.toString());
    
    if (params.toString()) {
      url += `?${params.toString()}`;
    }
    
    return this.http.get<any>(url);
  }

  /**
   * Get call trends
   */
  getCallTrends(period: string = 'day', days: number = 30): Observable<any> {
    const organizationId = this.getOrganizationId();
    return this.http.get<any>(
      `${this.API_URL}/organizations/${organizationId}/dashboard/trends?period=${period}&days=${days}`
    );
  }

  /**
   * Get hourly call distribution
   */
  getHourlyDistribution(days: number = 7): Observable<HourlyDistribution> {
    const organizationId = this.getOrganizationId();
    return this.http.get<HourlyDistribution>(
      `${this.API_URL}/organizations/${organizationId}/dashboard/hourly-distribution?days=${days}`
    );
  }

  /**
   * Get assistant analytics
   */
  getAssistantAnalytics(assistantId?: string): Observable<AssistantAnalytics | AssistantsAnalytics> {
    const organizationId = this.getOrganizationId();
    let url = `${this.API_URL}/organizations/${organizationId}/dashboard/assistants`;
    if (assistantId) {
      url += `?assistant_id=${assistantId}`;
    }
    return this.http.get<AssistantAnalytics | AssistantsAnalytics>(url);
  }

  /**
   * Get call metrics
   */
  getCallMetrics(days: number = 30): Observable<CallMetrics> {
    const organizationId = this.getOrganizationId();
    return this.http.get<CallMetrics>(
      `${this.API_URL}/organizations/${organizationId}/calls/metrics?days=${days}`
    );
  }

  /**
   * Get calls by day
   */
  getCallsByDay(days: number = 30): Observable<CallsByDay[]> {
    const organizationId = this.getOrganizationId();
    return this.http.get<CallsByDay[]>(
      `${this.API_URL}/organizations/${organizationId}/calls/by-day?days=${days}`
    );
  }
}
