import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

export interface Call {
  id: string;
  assistant_id: string;
  assistant_name: string;
  phone_number: string;
  caller_number: string;
  start_time: string;
  end_time?: string;
  duration: number;
  status: 'in_progress' | 'completed' | 'failed';
  success: boolean;
  cost: number;
  transcript?: string;
  recording_url?: string;
  created_at: string;
  updated_at: string;
}

export interface CallList {
  items: Call[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface CallFilters {
  assistant_id?: string;
  status?: 'in_progress' | 'completed' | 'failed';
  success?: boolean;
  start_date?: string;
  end_date?: string;
}

export interface MakeCallRequest {
  assistant_id: string;
  phone_number: string;
  initial_message?: string;
}

export interface MakeCallResponse {
  call_id: string;
  status: string;
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class CallService {
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
   * Get list of calls
   * According to swagger, the parameters are page, per_page, status, and direction
   */
  getCalls(page: number = 1, per_page: number = 10, filters?: CallFilters): Observable<CallList> {
    const organizationId = this.getOrganizationId();
    
    let queryParams = `page=${page}&per_page=${per_page}`;
    
    if (filters) {
      if (filters.status) {
        queryParams += `&status=${filters.status}`;
      }
      // Note: The API doesn't support filtering by assistant_id, success, start_date, or end_date
      // according to the swagger documentation
    }
    
    return this.http.get<CallList>(
      `${this.API_URL}/organizations/${organizationId}/calls?${queryParams}`
    );
  }

  /**
   * Make a new call
   * According to swagger, the endpoint is /api/v1/create-call
   */
  makeCall(request: MakeCallRequest): Observable<MakeCallResponse> {
    // Note: According to the swagger, we use a different endpoint for creating calls
    return this.http.post<MakeCallResponse>(
      `${this.API_URL}/create-call`,
      {
        phone_number: request.phone_number,
        assistant_id: request.assistant_id
      }
    );
  }
  
  // Note: According to the swagger documentation, the following endpoints are not available:
  // - GET /api/v1/organizations/{organization_id}/calls/{call_id}
  // - POST /api/v1/organizations/{organization_id}/calls/{call_id}/end
  // - GET /api/v1/organizations/{organization_id}/calls/{call_id}/transcript
  // - GET /api/v1/organizations/{organization_id}/calls/{call_id}/recording
  //
  // These methods are kept for backward compatibility but will likely fail
  // when called against the actual API
  
  /**
   * Get call by ID - NOT IN API DOCUMENTATION
   */
  getCall(callId: string): Observable<Call> {
    console.warn('getCall endpoint not found in API documentation');
    const organizationId = this.getOrganizationId();
    return this.http.get<Call>(
      `${this.API_URL}/organizations/${organizationId}/calls/${callId}`
    );
  }

  /**
   * End an active call - NOT IN API DOCUMENTATION
   */
  endCall(callId: string): Observable<Call> {
    console.warn('endCall endpoint not found in API documentation');
    const organizationId = this.getOrganizationId();
    return this.http.post<Call>(
      `${this.API_URL}/organizations/${organizationId}/calls/${callId}/end`,
      {}
    );
  }

  /**
   * Get call transcript - NOT IN API DOCUMENTATION
   */
  getTranscript(callId: string): Observable<{ transcript: string }> {
    console.warn('getTranscript endpoint not found in API documentation');
    const organizationId = this.getOrganizationId();
    return this.http.get<{ transcript: string }>(
      `${this.API_URL}/organizations/${organizationId}/calls/${callId}/transcript`
    );
  }

  /**
   * Get call recording - NOT IN API DOCUMENTATION
   */
  getRecording(callId: string): Observable<{ recording_url: string }> {
    console.warn('getRecording endpoint not found in API documentation');
    const organizationId = this.getOrganizationId();
    return this.http.get<{ recording_url: string }>(
      `${this.API_URL}/organizations/${organizationId}/calls/${callId}/recording`
    );
  }
}
