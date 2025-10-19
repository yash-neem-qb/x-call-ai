import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

// API response format
export interface ApiPhoneNumber {
  id: string;
  phone_number: string;
  friendly_name: string;
  settings?: {
    assignedUserId?: string;
    note?: string;
    routing?: string;
  };
  organization_id: string;
  assistant_id?: string;
  twilio_account_sid: string;
  twilio_phone_number_sid: string | null;
  voice_webhook_url: string;
  status_callback_url: string;
  is_active: boolean;
  is_configured: boolean;
  created_at: string;
  updated_at: string;
}

// Our application's phone number model
export interface PhoneNumber {
  id: string;
  phone_number: string;
  friendly_name: string;
  country: string;
  region: string;
  capabilities: {
    voice: boolean;
    sms: boolean;
    mms: boolean;
  };
  status: 'active' | 'pending' | 'inactive';
  created_at: string;
  updated_at: string;
  organization_id: string;
  assistant_id?: string;
  assistant_name?: string;
}

export interface PhoneNumberList {
  items: PhoneNumber[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

// Create phone number request based on curl example
export interface PhoneNumberCreate {
  phone_number: string;
  friendly_name?: string;
  assistant_id?: string;
  settings?: {
    routing?: string;
    note?: string;
  };
  twilio_account_sid?: string;
  twilio_auth_token?: string;
}

// Update phone number request based on curl example
export interface PhoneNumberUpdate {
  friendly_name?: string;
  assistant_id?: string | null;
  settings?: {
    routing?: string;
    note?: string;
  };
  is_active?: boolean;
}

export interface AvailablePhoneNumber {
  phone_number: string;
  friendly_name: string;
  country: string;
  region: string;
  capabilities: {
    voice: boolean;
    sms: boolean;
    mms: boolean;
  };
  monthly_cost: number;
}

export interface AvailablePhoneNumberList {
  items: AvailablePhoneNumber[];
  total: number;
}

@Injectable({
  providedIn: 'root'
})
export class PhoneService {
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
   * Get list of phone numbers (all phone numbers, no pagination)
   */
  getPhoneNumbers(): Observable<ApiPhoneNumber[]> {
    const organizationId = this.getOrganizationId();
    return this.http.get<ApiPhoneNumber[]>(
      `${this.API_URL}/organizations/${organizationId}/phone-numbers`
    );
  }

  /**
   * Get phone number by ID
   */
  getPhoneNumber(phoneNumberId: string): Observable<ApiPhoneNumber> {
    const organizationId = this.getOrganizationId();
    return this.http.get<ApiPhoneNumber>(
      `${this.API_URL}/organizations/${organizationId}/phone-numbers/${phoneNumberId}`
    );
  }

  /**
   * Search for available phone numbers
   */
  searchAvailablePhoneNumbers(country: string, region?: string): Observable<AvailablePhoneNumberList> {
    const organizationId = this.getOrganizationId();
    
    let url = `${this.API_URL}/organizations/${organizationId}/phone-numbers/available?country=${country}`;
    if (region) {
      url += `&region=${region}`;
    }
    
    return this.http.get<AvailablePhoneNumberList>(url);
  }

  /**
   * Create a new phone number
   * Based on the curl example:
   * curl -X POST "https://<host>/api/v1/organizations/{org_id}/phone-numbers"
   */
  createPhoneNumber(phoneNumber: PhoneNumberCreate): Observable<ApiPhoneNumber> {
    const organizationId = this.getOrganizationId();
    return this.http.post<ApiPhoneNumber>(
      `${this.API_URL}/organizations/${organizationId}/phone-numbers`,
      phoneNumber
    );
  }

  /**
   * Update phone number
   * Based on the curl example:
   * curl -X PUT "https://<host>/api/v1/organizations/{org_id}/phone-numbers/{phone_id}"
   */
  updatePhoneNumber(phoneNumberId: string, phoneNumber: PhoneNumberUpdate): Observable<ApiPhoneNumber> {
    const organizationId = this.getOrganizationId();
    return this.http.put<ApiPhoneNumber>(
      `${this.API_URL}/organizations/${organizationId}/phone-numbers/${phoneNumberId}`,
      phoneNumber
    );
  }

  /**
   * Delete phone number
   * Based on the curl example:
   * curl -X DELETE "https://<host>/api/v1/organizations/{org_id}/phone-numbers/{phone_id}"
   */
  deletePhoneNumber(phoneNumberId: string): Observable<void> {
    const organizationId = this.getOrganizationId();
    return this.http.delete<void>(
      `${this.API_URL}/organizations/${organizationId}/phone-numbers/${phoneNumberId}`
    );
  }

  /**
   * Get call history for a phone number
   */
  getCallHistory(phoneNumberId: string, page: number = 1, pageSize: number = 10): Observable<any> {
    const organizationId = this.getOrganizationId();
    return this.http.get<any>(
      `${this.API_URL}/organizations/${organizationId}/phone-numbers/${phoneNumberId}/calls?page=${page}&page_size=${pageSize}`
    );
  }

  /**
   * Get supported countries
   */
  getSupportedCountries(): Observable<{ code: string; name: string; }[]> {
    return this.http.get<{ code: string; name: string; }[]>(
      `${this.API_URL}/phone-numbers/countries`
    );
  }

  /**
   * Get regions for a country
   */
  getRegions(countryCode: string): Observable<{ code: string; name: string; }[]> {
    return this.http.get<{ code: string; name: string; }[]>(
      `${this.API_URL}/phone-numbers/countries/${countryCode}/regions`
    );
  }
}