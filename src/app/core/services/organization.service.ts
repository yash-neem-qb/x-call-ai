import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

export interface Organization {
  organization_id: string;
  organization_name: string;
  role: string;
  is_active: boolean;
  joined_at: string;
}

export interface OrganizationsResponse {
  organizations: Organization[];
  total_count: number;
}

@Injectable({
  providedIn: 'root'
})
export class OrganizationService {
  private readonly API_URL = environment.apiUrl;

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  /**
   * Extract organizations array from API response
   */
  extractOrganizations(response: OrganizationsResponse): Organization[] {
    if (response && response.organizations && Array.isArray(response.organizations)) {
      return response.organizations;
    }
    
    // If we can't find the organizations array, return an empty array
    console.warn('Could not extract organizations array from response:', response);
    return [];
  }

  /**
   * Get organization by ID
   */
  getOrganization(id: string): Observable<any> {
    return this.http.get<any>(`${this.API_URL}/organizations/${id}`);
  }

  /**
   * Get organizations for the current user
   * Note: This is a compatibility method that returns a mock response
   * since the API doesn't have an endpoint to list all organizations
   */
  getOrganizations(): Observable<OrganizationsResponse> {
    const user = this.authService.getCurrentUser();
    if (!user || !user.organization_id) {
      throw new Error('Organization ID not available');
    }
    
    // Return a mock response with the current organization
    return this.getOrganization(user.organization_id).pipe(
      map(org => {
        const organization: Organization = {
          organization_id: org.id || user.organization_id,
          organization_name: org.name || user.organization_name || 'My Organization',
          role: 'owner',
          is_active: true,
          joined_at: org.created_at || new Date().toISOString()
        };
        
        return {
          organizations: [organization],
          total_count: 1
        };
      })
    );
  }

  /**
   * Update organization settings
   * Note: According to the API docs, we can only update the current organization
   */
  updateOrganization(organizationId: string, data: any): Observable<any> {
    return this.http.put<any>(`${this.API_URL}/organizations/${organizationId}`, data);
  }
  
  /**
   * Switch to a different organization
   * This method updates the current user's organization context
   */
  switchOrganization(organizationId: string): Observable<any> {
    // Get the organization details
    const targetOrg = this.getOrganization(organizationId);
    
    return targetOrg.pipe(
      map(org => {
        // Update the auth service with the new organization
        const updatedUser = {
          ...this.authService.getCurrentUser(),
          organization_id: organizationId,
          organization_name: org.name || 'Organization'
        };
        
        // Store the updated user info
        this.authService.updateUserInfo(updatedUser);
        
        return { 
          success: true, 
          organization: {
            organization_id: organizationId,
            organization_name: org.name || 'Organization',
            role: 'owner', // Default role, could be enhanced
            is_active: true,
            joined_at: org.created_at || new Date().toISOString()
          }
        };
      })
    );
  }

  /**
   * Get organization members
   */
  getOrganizationMembers(organizationId: string): Observable<any> {
    return this.http.get<any>(`${this.API_URL}/organizations/${organizationId}/members`);
  }

  /**
   * Invite member to organization
   */
  inviteMember(organizationId: string, email: string, role: string = 'member'): Observable<any> {
    return this.http.post<any>(`${this.API_URL}/organizations/${organizationId}/members/invite`, {
      email,
      role
    });
  }

  /**
   * Update member role
   */
  updateMemberRole(organizationId: string, memberId: string, role: string): Observable<any> {
    return this.http.put<any>(`${this.API_URL}/organizations/${organizationId}/members/${memberId}/role`, {
      role
    });
  }

  /**
   * Remove member from organization
   */
  removeMember(organizationId: string, memberId: string): Observable<any> {
    return this.http.delete<any>(`${this.API_URL}/organizations/${organizationId}/members/${memberId}`);
  }
}
