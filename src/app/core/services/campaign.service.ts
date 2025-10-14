import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

export interface Campaign {
  id: string;
  name: string;
  description?: string;
  assistant_id: string;
  phone_number_id: string;
  status: 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED';
  schedule_type: 'NOW' | 'SCHEDULED';
  scheduled_at?: string;
  created_at: string;
  updated_at: string;
  contacts?: CampaignContact[];
}

export interface CampaignCreate {
  name: string;
  description?: string;
  assistant_id: string;
  phone_number_id: string;
  status?: 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED';
  schedule_type?: 'NOW' | 'SCHEDULED';
  scheduled_at?: string;
  contacts?: CampaignContactCreate[];
}

export interface CampaignUpdate {
  name?: string;
  description?: string;
  assistant_id?: string;
  phone_number_id?: string;
  status?: 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED';
  schedule_type?: 'NOW' | 'SCHEDULED';
  scheduled_at?: string;
}

export interface CampaignContact {
  id: string;
  campaign_id: string;
  phone_number: string;
  name?: string;
  email?: string;
  status: 'pending' | 'called' | 'completed' | 'failed' | 'skipped';
  call_attempts: number;
  last_call_attempt?: string;
  next_call_attempt?: string;
  created_at: string;
  updated_at: string;
}

export interface CampaignContactCreate {
  phone_number: string;
  name?: string;
  email?: string;
}

export interface CampaignContactUpdate {
  phone_number?: string;
  name?: string;
  email?: string;
  status?: 'pending' | 'called' | 'completed' | 'failed' | 'skipped';
}

export interface CampaignList {
  items: Campaign[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

@Injectable({
  providedIn: 'root'
})
export class CampaignService {
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
   * Get all campaigns for the organization
   */
  getCampaigns(page: number = 1, limit: number = 10): Observable<CampaignList> {
    const organizationId = this.getOrganizationId();
    const params = {
      page: page.toString(),
      limit: limit.toString()
    };
    
    return this.http.get<CampaignList>(`${this.API_URL}/organizations/${organizationId}/campaigns`, { params })
      .pipe(
        catchError(error => {
          console.error('Error fetching campaigns:', error);
          throw error;
        })
      );
  }

  /**
   * Get a specific campaign by ID
   */
  getCampaign(campaignId: string): Observable<Campaign> {
    const organizationId = this.getOrganizationId();
    return this.http.get<Campaign>(`${this.API_URL}/organizations/${organizationId}/campaigns/${campaignId}`)
      .pipe(
        catchError(error => {
          console.error('Error fetching campaign:', error);
          throw error;
        })
      );
  }

  /**
   * Create a new campaign
   */
  createCampaign(campaignData: CampaignCreate): Observable<Campaign> {
    const organizationId = this.getOrganizationId();
    return this.http.post<Campaign>(`${this.API_URL}/organizations/${organizationId}/campaigns`, campaignData)
      .pipe(
        catchError(error => {
          console.error('Error creating campaign:', error);
          throw error;
        })
      );
  }

  /**
   * Update an existing campaign
   */
  updateCampaign(campaignId: string, campaignData: CampaignUpdate): Observable<Campaign> {
    const organizationId = this.getOrganizationId();
    return this.http.put<Campaign>(`${this.API_URL}/organizations/${organizationId}/campaigns/${campaignId}`, campaignData)
      .pipe(
        catchError(error => {
          console.error('Error updating campaign:', error);
          throw error;
        })
      );
  }

  /**
   * Delete a campaign
   */
  deleteCampaign(campaignId: string): Observable<void> {
    const organizationId = this.getOrganizationId();
    return this.http.delete<void>(`${this.API_URL}/organizations/${organizationId}/campaigns/${campaignId}`)
      .pipe(
        catchError(error => {
          console.error('Error deleting campaign:', error);
          throw error;
        })
      );
  }

  /**
   * Start a campaign
   */
  startCampaign(campaignId: string): Observable<Campaign> {
    const organizationId = this.getOrganizationId();
    return this.http.post<Campaign>(`${this.API_URL}/organizations/${organizationId}/campaigns/${campaignId}/start`, {})
      .pipe(
        catchError(error => {
          console.error('Error starting campaign:', error);
          throw error;
        })
      );
  }

  /**
   * Pause a campaign
   */
  pauseCampaign(campaignId: string): Observable<Campaign> {
    const organizationId = this.getOrganizationId();
    return this.http.post<Campaign>(`${this.API_URL}/organizations/${organizationId}/campaigns/${campaignId}/pause`, {})
      .pipe(
        catchError(error => {
          console.error('Error pausing campaign:', error);
          throw error;
        })
      );
  }

  /**
   * Stop a campaign
   */
  stopCampaign(campaignId: string): Observable<Campaign> {
    const organizationId = this.getOrganizationId();
    return this.http.post<Campaign>(`${this.API_URL}/organizations/${organizationId}/campaigns/${campaignId}/stop`, {})
      .pipe(
        catchError(error => {
          console.error('Error stopping campaign:', error);
          throw error;
        })
      );
  }

  /**
   * Get campaign contacts
   */
  getCampaignContacts(campaignId: string): Observable<CampaignContact[]> {
    const organizationId = this.getOrganizationId();
    return this.http.get<CampaignContact[]>(`${this.API_URL}/organizations/${organizationId}/campaigns/${campaignId}/contacts`)
      .pipe(
        catchError(error => {
          console.error('Error fetching campaign contacts:', error);
          throw error;
        })
      );
  }

  /**
   * Get campaign analytics
   */
  getCampaignAnalytics(campaignId: string): Observable<any> {
    const organizationId = this.getOrganizationId();
    return this.http.get<any>(`${this.API_URL}/organizations/${organizationId}/campaigns/${campaignId}/analytics`)
      .pipe(
        catchError(error => {
          console.error('Error fetching campaign analytics:', error);
          throw error;
        })
      );
  }
}
