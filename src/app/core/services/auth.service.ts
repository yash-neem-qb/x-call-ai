import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap, catchError, of } from 'rxjs';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface SignupRequest {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  organization_name?: string;
}

export interface SignupResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  user_id: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  organization_id: string;
  organization_name: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  user_id: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  organization_id: string;
  organization_name: string;
}

export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  organization_id: string;
  organization_name: string;
  avatar?: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly API_URL = environment.apiUrl;
  private readonly TOKEN_KEY = 'x_call_token';
  private readonly USER_KEY = 'x_call_user';

  private authStateSubject = new BehaviorSubject<AuthState>({
    isAuthenticated: false,
    user: null,
    token: null
  });

  public authState$ = this.authStateSubject.asObservable();

  constructor(
    private http: HttpClient,
    private router: Router
  ) {
    this.initializeAuthState();
  }

  /**
   * Initialize authentication state from localStorage
   */
  private initializeAuthState(): void {
    const token = localStorage.getItem(this.TOKEN_KEY);
    const userStr = localStorage.getItem(this.USER_KEY);

    if (token && userStr) {
      try {
        const user = JSON.parse(userStr);
        this.authStateSubject.next({
          isAuthenticated: true,
          user,
          token
        });
      } catch (error) {
        console.error('Error parsing user data from localStorage:', error);
        this.clearAuthData();
      }
    }
  }

  /**
   * Login user with email and password
   */
  login(credentials: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.API_URL}/auth/login`, credentials)
      .pipe(
        tap((response: LoginResponse) => {
          this.setAuthData(response);
        }),
        catchError((error) => {
          console.error('Login error:', error);
          throw error;
        })
      );
  }

  /**
   * Sign up new user
   */
  signup(userData: SignupRequest): Observable<SignupResponse> {
    return this.http.post<SignupResponse>(`${this.API_URL}/auth/register`, userData)
      .pipe(
        tap((response: SignupResponse) => {
          this.setAuthData(response);
        }),
        catchError((error) => {
          console.error('Signup error:', error);
          throw error;
        })
      );
  }

  /**
   * Logout user and clear authentication data
   */
  logout(): void {
    this.clearAuthData();
    this.router.navigate(['/auth/login']);
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return this.authStateSubject.value.isAuthenticated;
  }

  /**
   * Get current user
   */
  getCurrentUser(): User | null {
    return this.authStateSubject.value.user;
  }

  /**
   * Get current token
   */
  getToken(): string | null {
    return this.authStateSubject.value.token;
  }

  /**
   * Refresh user data
   */
  refreshUser(): Observable<User> {
    return this.http.get<User>(`${this.API_URL}/auth/me`)
      .pipe(
        tap((user: User) => {
          localStorage.setItem(this.USER_KEY, JSON.stringify(user));
          this.authStateSubject.next({
            ...this.authStateSubject.value,
            user
          });
        }),
        catchError((error) => {
          console.error('Error refreshing user data:', error);
          this.logout();
          throw error;
        })
      );
  }

  /**
   * Set authentication data after successful login
   */
  private setAuthData(response: LoginResponse): void {
    localStorage.setItem(this.TOKEN_KEY, response.access_token);
    
    // Create user object from response fields
    const user: User = {
      id: response.user_id,
      email: response.email,
      first_name: response.first_name,
      last_name: response.last_name,
      full_name: response.full_name,
      organization_id: response.organization_id,
      organization_name: response.organization_name
    };
    
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));

    this.authStateSubject.next({
      isAuthenticated: true,
      user: user,
      token: response.access_token
    });
  }


  /**
   * Clear authentication data
   */
  private clearAuthData(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);

    this.authStateSubject.next({
      isAuthenticated: false,
      user: null,
      token: null
    });
  }

  /**
   * Check if token is expired
   */
  isTokenExpired(): boolean {
    const token = this.getToken();
    if (!token) return true;

    try {
      // Check for invalid token format
      if (token.startsWith('mock-') || token.includes('demo') || token.includes('test')) {
        console.error('Invalid token format detected');
        return true; // Consider invalid
      }
      
      // For real JWT tokens
      const parts = token.split('.');
      if (parts.length !== 3) {
        return true; // Not a valid JWT token format
      }
      
      const payload = JSON.parse(atob(parts[1]));
      const currentTime = Date.now() / 1000;
      return payload.exp < currentTime;
    } catch (error) {
      console.error('Error checking token expiration:', error);
      return true;
    }
  }

  /**
   * Social login methods
   */
  loginWithGoogle(): void {
    // Implement Google OAuth
    window.location.href = `${this.API_URL}/auth/google`;
  }

  loginWithGitHub(): void {
    // Implement GitHub OAuth
    window.location.href = `${this.API_URL}/auth/github`;
  }

  loginWithDiscord(): void {
    // Implement Discord OAuth
    window.location.href = `${this.API_URL}/auth/discord`;
  }

  /**
   * SSO login
   */
  loginWithSSO(): void {
    // Implement SSO login
    window.location.href = `${this.API_URL}/auth/sso`;
  }

  /**
   * Update user information (for organization switching)
   */
  updateUserInfo(updatedUser: User): void {
    localStorage.setItem(this.USER_KEY, JSON.stringify(updatedUser));
    this.authStateSubject.next({
      ...this.authStateSubject.value,
      user: updatedUser
    });
  }

  /**
   * Update current organization
   */
  updateCurrentOrganization(organization: any): void {
    const currentUser = this.getCurrentUser();
    if (currentUser) {
      const updatedUser: User = {
        ...currentUser,
        organization_id: organization.organization_id,
        organization_name: organization.organization_name
      };
      this.updateUserInfo(updatedUser);
    }
  }
}
