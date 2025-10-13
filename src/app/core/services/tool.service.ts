import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ToolParameter {
  name: string;
  type: string;
  description?: string;
  required: boolean;
  default?: any;
}

export interface ToolHeader {
  key: string;
  value: string;
}

export interface Tool {
  id: string;
  name: string;
  description?: string;
  method: string;
  url: string;
  headers?: ToolHeader[];
  parameters?: ToolParameter[];
  body_schema?: string;
  timeout_seconds: number;
  retry_count: number;
  is_active: boolean;
  organization_id: string;
  created_at: string;
  updated_at: string;
}

export interface AssistantTool {
  id: string;
  assistant_id: string;
  tool_id: string;
  is_enabled: boolean;
  priority: number;
  created_at: string;
  updated_at: string;
  tool: Tool;
}

export interface CreateToolRequest {
  name: string;
  description?: string;
  method: string;
  url: string;
  headers?: ToolHeader[];
  parameters?: ToolParameter[];
  body_schema?: string;
  timeout_seconds?: number;
  retry_count?: number;
}

export interface UpdateToolRequest {
  name?: string;
  description?: string;
  method?: string;
  url?: string;
  headers?: { [key: string]: string };
  parameters?: ToolParameter[];
  body_schema?: any;
  timeout_seconds?: number;
  retry_count?: number;
  is_active?: boolean;
}

export interface AddToolToAssistantRequest {
  tool_id: string;
  is_enabled?: boolean;
  priority?: number;
}

export interface UpdateAssistantToolRequest {
  is_enabled?: boolean;
  priority?: number;
}

@Injectable({
  providedIn: 'root'
})
export class ToolService {
  private apiUrl = environment.apiBaseUrl;

  constructor(private http: HttpClient) {}

  // Tool CRUD operations
  createTool(organizationId: string, toolData: CreateToolRequest): Observable<Tool> {
    return this.http.post<Tool>(`${this.apiUrl}/organizations/${organizationId}/tools`, toolData);
  }

  getTools(
    organizationId: string, 
    skip: number = 0, 
    limit: number = 100,
    search?: string,
    isActive?: boolean
  ): Observable<Tool[]> {
    let params = new HttpParams()
      .set('skip', skip.toString())
      .set('limit', limit.toString());
    
    if (search) {
      params = params.set('search', search);
    }
    if (isActive !== undefined) {
      params = params.set('is_active', isActive.toString());
    }

    return this.http.get<Tool[]>(`${this.apiUrl}/organizations/${organizationId}/tools`, { params });
  }

  getTool(organizationId: string, toolId: string): Observable<Tool> {
    return this.http.get<Tool>(`${this.apiUrl}/organizations/${organizationId}/tools/${toolId}`);
  }

  updateTool(organizationId: string, toolId: string, toolData: UpdateToolRequest): Observable<Tool> {
    return this.http.put<Tool>(`${this.apiUrl}/organizations/${organizationId}/tools/${toolId}`, toolData);
  }

  deleteTool(organizationId: string, toolId: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/organizations/${organizationId}/tools/${toolId}`);
  }

  // Assistant tool operations
  addToolToAssistant(
    organizationId: string, 
    assistantId: string, 
    toolData: AddToolToAssistantRequest
  ): Observable<AssistantTool> {
    return this.http.post<AssistantTool>(
      `${this.apiUrl}/organizations/${organizationId}/assistants/${assistantId}/tools`, 
      toolData
    );
  }

  getAssistantTools(
    organizationId: string, 
    assistantId: string, 
    enabledOnly: boolean = true
  ): Observable<AssistantTool[]> {
    const params = new HttpParams().set('enabled_only', enabledOnly.toString());
    return this.http.get<AssistantTool[]>(
      `${this.apiUrl}/organizations/${organizationId}/assistants/${assistantId}/tools`, 
      { params }
    );
  }

  updateAssistantTool(
    organizationId: string, 
    assistantToolId: string, 
    toolData: UpdateAssistantToolRequest
  ): Observable<AssistantTool> {
    return this.http.put<AssistantTool>(
      `${this.apiUrl}/organizations/${organizationId}/assistant-tools/${assistantToolId}`, 
      toolData
    );
  }

  removeToolFromAssistant(organizationId: string, assistantToolId: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/organizations/${organizationId}/assistant-tools/${assistantToolId}`);
  }

  getAvailableToolsForAssistant(organizationId: string, assistantId: string): Observable<Tool[]> {
    return this.http.get<Tool[]>(
      `${this.apiUrl}/organizations/${organizationId}/assistants/${assistantId}/available-tools`
    );
  }

  // Tool execution (for testing)
  executeTool(organizationId: string, toolId: string, parameters?: any, body?: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/organizations/${organizationId}/tools/execute`, {
      tool_id: toolId,
      parameters,
      body
    });
  }
}