import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

export interface Tool {
  id: string;
  name: string;
  description: string;
  type: 'function' | 'retrieval' | 'code_interpreter' | 'custom';
  schema?: any;
  function_name?: string;
  parameters?: any;
  required_parameters?: string[];
  created_at: string;
  updated_at: string;
  organization_id: string;
}

export interface ToolList {
  items: Tool[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface ToolCreate {
  name: string;
  description: string;
  type: 'function' | 'retrieval' | 'code_interpreter' | 'custom';
  schema?: any;
  function_name?: string;
  parameters?: any;
  required_parameters?: string[];
}

export interface ToolUpdate {
  name?: string;
  description?: string;
  schema?: any;
  function_name?: string;
  parameters?: any;
  required_parameters?: string[];
}

@Injectable({
  providedIn: 'root'
})
export class ToolService {
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
   * Get list of tools
   */
  getTools(page: number = 1, pageSize: number = 10, type?: string): Observable<ToolList> {
    const organizationId = this.getOrganizationId();
    
    let url = `${this.API_URL}/organizations/${organizationId}/tools?page=${page}&page_size=${pageSize}`;
    if (type) {
      url += `&type=${type}`;
    }
    
    return this.http.get<ToolList>(url);
  }

  /**
   * Get tool by ID
   */
  getTool(toolId: string): Observable<Tool> {
    const organizationId = this.getOrganizationId();
    return this.http.get<Tool>(
      `${this.API_URL}/organizations/${organizationId}/tools/${toolId}`
    );
  }

  /**
   * Create new tool
   */
  createTool(tool: ToolCreate): Observable<Tool> {
    const organizationId = this.getOrganizationId();
    return this.http.post<Tool>(
      `${this.API_URL}/organizations/${organizationId}/tools`,
      tool
    );
  }

  /**
   * Update tool
   */
  updateTool(toolId: string, tool: ToolUpdate): Observable<Tool> {
    const organizationId = this.getOrganizationId();
    return this.http.put<Tool>(
      `${this.API_URL}/organizations/${organizationId}/tools/${toolId}`,
      tool
    );
  }

  /**
   * Delete tool
   */
  deleteTool(toolId: string): Observable<void> {
    const organizationId = this.getOrganizationId();
    return this.http.delete<void>(
      `${this.API_URL}/organizations/${organizationId}/tools/${toolId}`
    );
  }

  /**
   * Test tool execution
   */
  testTool(toolId: string, parameters: any): Observable<any> {
    const organizationId = this.getOrganizationId();
    return this.http.post<any>(
      `${this.API_URL}/organizations/${organizationId}/tools/${toolId}/test`,
      { parameters }
    );
  }

  /**
   * Get tool execution logs
   */
  getToolLogs(toolId: string, page: number = 1, pageSize: number = 10): Observable<any> {
    const organizationId = this.getOrganizationId();
    return this.http.get<any>(
      `${this.API_URL}/organizations/${organizationId}/tools/${toolId}/logs?page=${page}&page_size=${pageSize}`
    );
  }
}
