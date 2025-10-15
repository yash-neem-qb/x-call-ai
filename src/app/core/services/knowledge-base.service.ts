import { Injectable } from '@angular/core';
import { HttpClient, HttpEvent, HttpEventType, HttpProgressEvent } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { AuthService } from './auth.service';

export interface KnowledgeBaseFile {
  id: string;
  title: string;
  content: string;
  source: string;
  metadata: {
    file_metadata: any;
    file_structure: any;
    original_filename: string;
    file_type: string;
    file_size: number;
    parsing_method: string;
  };
  tags: string[];
  organization_id: string;
  assistant_id: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface KnowledgeBaseList {
  items: KnowledgeBaseFile[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface UploadProgress {
  file: File;
  progress: number;
  status: 'uploading' | 'processing' | 'ready' | 'error';
  error?: string;
}

@Injectable({
  providedIn: 'root'
})
export class KnowledgeBaseService {
  private readonly baseUrl = 'http://localhost:8000/api/v1';
  private uploadProgressSubject = new BehaviorSubject<UploadProgress[]>([]);
  public uploadProgress$ = this.uploadProgressSubject.asObservable();

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
   * Get authorization headers
   */
  private getAuthHeaders(): { [key: string]: string } {
    const token = this.authService.getToken();
    if (!token) {
      throw new Error('Authentication token not available');
    }
    return {
      'Authorization': `Bearer ${token}`
    };
  }

  /**
   * Upload a file to the knowledge base
   */
  uploadFile(file: File, assistantId: string): Observable<HttpEvent<any>> {
    const organizationId = this.getOrganizationId();
    const formData = new FormData();
    formData.append('file', file);
    formData.append('assistant_id', assistantId);

    const url = `${this.baseUrl}/organizations/${organizationId}/knowledge-base/upload-file`;
    console.log('KnowledgeBaseService: Uploading file to URL:', url);
    console.log('KnowledgeBaseService: File:', file.name, 'Assistant ID:', assistantId);
    console.log('KnowledgeBaseService: Organization ID:', organizationId);

    // Add to progress tracking
    this.addToProgress(file, 0, 'uploading');

    return this.http.post(
      url,
      formData,
      {
        headers: this.getAuthHeaders(),
        reportProgress: true,
        observe: 'events'
      }
    ).pipe(
      map(event => {
        console.log('KnowledgeBaseService: HTTP Event:', event.type, event);
        if (event.type === HttpEventType.UploadProgress) {
          const progress = Math.round(100 * event.loaded / (event.total || 1));
          console.log('KnowledgeBaseService: Upload progress:', progress + '%');
          this.updateProgress(file, progress, 'uploading');
        } else if (event.type === HttpEventType.Response) {
          console.log('KnowledgeBaseService: Upload completed successfully');
          this.updateProgress(file, 100, 'ready');
          // Remove from progress after a delay
          setTimeout(() => this.removeFromProgress(file), 2000);
        }
        return event;
      }),
      catchError(error => {
        console.error('KnowledgeBaseService: Upload error:', error);
        this.updateProgress(file, 0, 'error', error.message);
        throw error;
      })
    );
  }

  /**
   * Get knowledge base files for an assistant
   */
  getKnowledgeBaseFiles(assistantId: string, page: number = 1, pageSize: number = 10): Observable<KnowledgeBaseList> {
    const organizationId = this.getOrganizationId();
    const params = {
      assistant_id: assistantId,
      page: page.toString(),
      page_size: pageSize.toString()
    };


    return this.http.get<KnowledgeBaseList>(
      `${this.baseUrl}/organizations/${organizationId}/knowledge-base`,
      {
        headers: this.getAuthHeaders(),
        params
      }
      );
  }

  /**
   * Delete a knowledge base file
   */
  deleteFile(fileId: string): Observable<any> {
    const organizationId = this.getOrganizationId();
    return this.http.delete(
      `${this.baseUrl}/organizations/${organizationId}/knowledge-base/${fileId}`,
      {
        headers: this.getAuthHeaders()
      }
    );
  }

  /**
   * Get supported file types
   */
  getSupportedFileTypes(): string[] {
    return [
      '.pdf',
      '.docx',
      '.txt',
      '.csv',
      '.xlsx',
      '.xls'
    ];
  }

  /**
   * Validate file type
   */
  isFileTypeSupported(file: File): boolean {
    const supportedTypes = this.getSupportedFileTypes();
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    return supportedTypes.includes(fileExtension);
  }

  /**
   * Format file size for display
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Add file to progress tracking
   */
  private addToProgress(file: File, progress: number, status: UploadProgress['status']): void {
    const currentProgress = this.uploadProgressSubject.value;
    const existingIndex = currentProgress.findIndex(p => p.file === file);
    
    if (existingIndex >= 0) {
      currentProgress[existingIndex] = { file, progress, status };
    } else {
      currentProgress.push({ file, progress, status });
    }
    
    this.uploadProgressSubject.next([...currentProgress]);
  }

  /**
   * Update file progress
   */
  private updateProgress(file: File, progress: number, status: UploadProgress['status'], error?: string): void {
    const currentProgress = this.uploadProgressSubject.value;
    const index = currentProgress.findIndex(p => p.file === file);
    
    if (index >= 0) {
      currentProgress[index] = { file, progress, status, error };
      this.uploadProgressSubject.next([...currentProgress]);
    }
  }

  /**
   * Remove file from progress tracking
   */
  private removeFromProgress(file: File): void {
    const currentProgress = this.uploadProgressSubject.value;
    const filtered = currentProgress.filter(p => p.file !== file);
    this.uploadProgressSubject.next(filtered);
  }

  /**
   * Clear all progress
   */
  clearProgress(): void {
    this.uploadProgressSubject.next([]);
  }
}
