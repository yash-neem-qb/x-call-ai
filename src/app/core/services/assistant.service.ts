import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

export interface VoiceConfig {
  provider: string;
  voiceId: string;
  model?: string;
  stability?: number;
  similarityBoost?: number;
  speed?: number;
  // Legacy properties for backward compatibility
  similarity?: number;
  speakingRate?: number;
  pitch?: number;
}

export interface ModelConfig {
  provider: string;
  model: string;
  temperature?: number;
  systemPrompt?: string;
  maxTokens?: number;
  messages?: Array<{
    role: string;
    content: string;
  }>;
}

export interface TranscriberConfig {
  provider: string;
  model?: string;
  language?: string;
}

export interface Assistant {
  id: string;
  name: string;
  voice: VoiceConfig;
  model: ModelConfig;
  firstMessage?: string;
  voicemailMessage?: string;
  endCallMessage?: string;
  transcriber: TranscriberConfig;
  createdAt?: string;
  updatedAt?: string;
  organizationId?: string;
  teamId?: string;
  isServerUrlSecretSet?: boolean;
}

export interface AssistantList {
  items: Assistant[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// Based on curl example for creating an assistant
export interface AssistantCreate {
  name: string;
  team_id?: string;
  voice: {
    provider: string;
    voiceId: string;
    model?: string;
    stability?: number;
    similarityBoost?: number;
    speed?: number;
  };
  model: {
    provider: string;
    model: string;
    systemPrompt?: string;
    maxTokens?: number;
    temperature?: number;
    messages?: Array<{
      role: string;
      content: string;
    }>;
  };
  transcriber: {
    provider: string;
    model?: string;
    language?: string;
  };
  firstMessage?: string;
  voicemailMessage?: string;
  endCallMessage?: string;
  isServerUrlSecretSet?: boolean;
}

// Based on curl example for updating an assistant
export interface AssistantUpdate {
  name?: string;
  voice_provider?: string;
  voice_model?: string;
  llm_model?: string;
  first_message?: string;
  team_id?: string;
  // Legacy fields for backward compatibility
  voice?: VoiceConfig;
  model?: ModelConfig;
  transcriber?: TranscriberConfig;
  voicemailMessage?: string;
  endCallMessage?: string;
}

export interface DashboardSummary {
  totalAssistants: number;
  totalCalls: number;
  totalDuration: number;
  successRate: number;
}

@Injectable({
  providedIn: 'root'
})
export class AssistantService {
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
   * Get list of assistants
   * Based on curl example:
   * curl -X GET "https://<host>/api/v1/organizations/<ORG_ID>/assistants?skip=0&limit=25"
   */
  getAssistants(page: number = 1, limit: number = 10): Observable<AssistantList> {
    const organizationId = this.getOrganizationId();
    // According to curl example, the parameters are skip and limit
    const skip = (page - 1) * limit;
    return this.http.get<AssistantList>(
      `${this.API_URL}/organizations/${organizationId}/assistants?skip=${skip}&limit=${limit}`
    );
  }

  /**
   * Get assistant by ID
   * Based on curl example:
   * curl -X GET "https://<host>/api/v1/organizations/<ORG_ID>/assistants/<ASSISTANT_ID>"
   */
  getAssistant(assistantId: string): Observable<Assistant> {
    const organizationId = this.getOrganizationId();
    return this.http.get<Assistant>(
      `${this.API_URL}/organizations/${organizationId}/assistants/${assistantId}`
    );
  }

  /**
   * Create new assistant
   * Based on curl example:
   * curl -X POST "https://<host>/api/v1/organizations/<ORG_ID>/assistants"
   */
  createAssistant(assistant: AssistantCreate): Observable<Assistant> {
    const organizationId = this.getOrganizationId();
    return this.http.post<Assistant>(
      `${this.API_URL}/organizations/${organizationId}/assistants`,
      assistant
    );
  }

  /**
   * Update assistant
   * Based on curl example:
   * curl -X PUT "https://<host>/api/v1/organizations/<ORG_ID>/assistants/<ASSISTANT_ID>"
   */
  updateAssistant(assistantId: string, assistant: AssistantUpdate): Observable<Assistant> {
    const organizationId = this.getOrganizationId();
    return this.http.put<Assistant>(
      `${this.API_URL}/organizations/${organizationId}/assistants/${assistantId}`,
      assistant
    );
  }

  /**
   * Delete assistant
   * Based on curl example:
   * curl -X DELETE "https://<host>/api/v1/organizations/<ORG_ID>/assistants/<ASSISTANT_ID>"
   */
  deleteAssistant(assistantId: string): Observable<any> {
    const organizationId = this.getOrganizationId();
    return this.http.delete(
      `${this.API_URL}/organizations/${organizationId}/assistants/${assistantId}`
    );
  }

  /**
   * Get assistant analytics
   */
  getAssistantAnalytics(assistantId?: string): Observable<any> {
    const organizationId = this.getOrganizationId();
    let url = `${this.API_URL}/organizations/${organizationId}/dashboard/assistants`;
    if (assistantId) {
      url += `?assistant_id=${assistantId}`;
    }
    return this.http.get(url);
  }

  /**
   * Get dashboard summary
   * This endpoint may return a 500 error if not implemented on the backend
   */
  getDashboardSummary(): Observable<DashboardSummary> {
    const organizationId = this.getOrganizationId();
    return this.http.get<DashboardSummary>(
      `${this.API_URL}/organizations/${organizationId}/dashboard/summary`
    ).pipe(
      // If the API fails, create a fallback dashboard summary based on assistants
      catchError(error => {
        console.warn('Dashboard summary API failed, using fallback data:', error);
        // Return assistants count as fallback
        return this.getAssistants().pipe(
          map(assistantList => {
            const summary: DashboardSummary = {
              totalAssistants: assistantList.items.length,
              totalCalls: 0,
              totalDuration: 0,
              successRate: 0
            };
            return summary;
          })
        );
      })
    );
  }

  /**
   * Get hourly call distribution
   */
  getHourlyDistribution(days: number = 7): Observable<any> {
    const organizationId = this.getOrganizationId();
    return this.http.get(
      `${this.API_URL}/organizations/${organizationId}/dashboard/hourly-distribution?days=${days}`
    );
  }
}