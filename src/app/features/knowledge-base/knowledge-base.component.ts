import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { KnowledgeBaseService, KnowledgeBaseFile, UploadProgress } from '../../core/services/knowledge-base.service';
import { AssistantService, Assistant } from '../../core/services/assistant.service';

@Component({
  selector: 'app-knowledge-base',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    MatButtonModule,
    MatProgressBarModule,
    MatMenuModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './knowledge-base.component.html',
  styleUrls: ['./knowledge-base.component.scss']
})
export class KnowledgeBaseComponent implements OnInit, OnDestroy {
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  private destroy$ = new Subject<void>();

  // Data
  assistants: Assistant[] = [];
  selectedAssistant: Assistant | null = null;
  knowledgeBaseFiles: KnowledgeBaseFile[] = [];
  uploadProgress: UploadProgress[] = [];

  // UI State
  isLoading = false;
  isUploading = false;
  error: string | null = null;
  selectedFiles: File[] = [];
  showUploadDialog = false;

  // File upload
  dragOver = false;
  supportedFileTypes: string[] = [];

  constructor(
    private knowledgeBaseService: KnowledgeBaseService,
    private assistantService: AssistantService,
    private snackBar: MatSnackBar,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.supportedFileTypes = this.knowledgeBaseService.getSupportedFileTypes();
    this.loadAssistants();
    this.subscribeToUploadProgress();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Load assistants for selection
   */
  loadAssistants(): void {
    this.isLoading = true;
    this.error = null;

    this.assistantService.getAssistants()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.assistants = response.items;
          this.isLoading = false;

          // Auto-select first assistant if available
          if (this.assistants.length > 0 && !this.selectedAssistant) {
            this.selectAssistant(this.assistants[0]);
          }
        },
        error: (err) => {
          console.error('Error loading assistants:', err);
          this.error = 'Failed to load assistants. Please try again.';
          this.isLoading = false;
        }
      });
  }

  /**
   * Select an assistant and load their knowledge base files
   */
  selectAssistant(assistant: Assistant): void {
    this.selectedAssistant = assistant;
    this.loadKnowledgeBaseFiles();
  }

  /**
   * Load knowledge base files for selected assistant
   */
  loadKnowledgeBaseFiles(): void {
    if (!this.selectedAssistant) return;

    this.isLoading = true;
    this.error = null;

    this.knowledgeBaseService.getKnowledgeBaseFiles(this.selectedAssistant.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
          next: (response) => {
            this.knowledgeBaseFiles = response.items;
            this.isLoading = false;
          },
        error: (err) => {
          this.error = 'Failed to load knowledge base files. Please try again.';
          this.isLoading = false;
        }
      });
  }

  /**
   * Subscribe to upload progress updates
   */
  subscribeToUploadProgress(): void {
    this.knowledgeBaseService.uploadProgress$
      .pipe(takeUntil(this.destroy$))
      .subscribe(progress => {
        this.uploadProgress = progress;
        this.isUploading = progress.some(p => p.status === 'uploading' || p.status === 'processing');
      });
  }

  /**
   * Handle file selection
   */
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      this.handleFiles(Array.from(input.files));
    }
  }

  /**
   * Handle drag and drop
   */
  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.dragOver = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.dragOver = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragOver = false;

    if (event.dataTransfer?.files) {
      this.handleFiles(Array.from(event.dataTransfer.files));
    }
  }

  /**
   * Handle selected files
   */
  handleFiles(files: File[]): void {
    if (!this.selectedAssistant) {
      this.snackBar.open('Please select an assistant first', 'Close', { duration: 3000 });
      return;
    }

    // Validate files
    const validFiles: File[] = [];
    const invalidFiles: string[] = [];

    files.forEach(file => {
      if (this.knowledgeBaseService.isFileTypeSupported(file)) {
        validFiles.push(file);
      } else {
        invalidFiles.push(file.name);
      }
    });

    if (invalidFiles.length > 0) {
      this.snackBar.open(
        `Unsupported file types: ${invalidFiles.join(', ')}. Supported: ${this.supportedFileTypes.join(', ')}`,
        'Close',
        { duration: 5000 }
      );
    }

    if (validFiles.length > 0) {
      this.selectedFiles = [...this.selectedFiles, ...validFiles];
    }
  }

  /**
   * Remove file from selection
   */
  removeSelectedFile(file: File): void {
    this.selectedFiles = this.selectedFiles.filter(f => f !== file);
  }

  /**
   * Upload selected files
   */
  uploadFiles(): void {
    if (!this.selectedAssistant || this.selectedFiles.length === 0) {
      console.log('Upload blocked: No assistant selected or no files');
      return;
    }

    console.log('Starting upload for assistant:', this.selectedAssistant.id);
    console.log('Files to upload:', this.selectedFiles.map(f => f.name));

    this.isUploading = true;
    let completedUploads = 0;
    const totalUploads = this.selectedFiles.length;

      this.selectedFiles.forEach(file => {
      
      this.knowledgeBaseService.uploadFile(file, this.selectedAssistant!.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (event) => {
            // Handle upload completion
            if (event.type === 4) { // HttpEventType.Response
              completedUploads++;
              if (completedUploads === totalUploads) {
                this.snackBar.open('All files uploaded successfully!', 'Close', { duration: 3000 });
                this.selectedFiles = [];
                this.loadKnowledgeBaseFiles(); // Refresh the list
                this.isUploading = false;
                this.closeUploadDialog(); // Close the dialog
              }
            }
          },
          error: (err) => {
            this.snackBar.open(`Failed to upload ${file.name}: ${err.message || 'Unknown error'}`, 'Close', { duration: 5000 });
            completedUploads++;
            if (completedUploads === totalUploads) {
              this.isUploading = false;
            }
          }
        });
    });
  }

  /**
   * Delete a knowledge base file
   */
  deleteFile(file: KnowledgeBaseFile): void {
    if (!confirm(`Are you sure you want to delete "${file.metadata.original_filename}"?`)) {
      return;
    }

    this.knowledgeBaseService.deleteFile(file.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.snackBar.open('File deleted successfully', 'Close', { duration: 3000 });
          this.loadKnowledgeBaseFiles(); // Refresh the list
        },
        error: (err) => {
          console.error('Error deleting file:', err);
          this.snackBar.open('Failed to delete file', 'Close', { duration: 3000 });
        }
      });
  }

  /**
   * Clear selected files
   */
  clearSelectedFiles(): void {
    this.selectedFiles = [];
  }

  /**
   * Open upload dialog
   */
  openUploadDialog(): void {
    this.showUploadDialog = true;
    this.selectedFiles = [];
  }

  /**
   * Close upload dialog
   */
  closeUploadDialog(): void {
    this.showUploadDialog = false;
    this.selectedFiles = [];
    this.dragOver = false;
  }

  /**
   * Get file icon based on file type
   */
  getFileIcon(fileType: string): string {
    const extension = fileType.toLowerCase();
    switch (extension) {
      case 'pdf':
        return 'picture_as_pdf';
      case 'docx':
      case 'doc':
        return 'description';
      case 'txt':
        return 'text_snippet';
      case 'csv':
      case 'xlsx':
      case 'xls':
        return 'table_chart';
      default:
        return 'insert_drive_file';
    }
  }

  /**
   * Format file size
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Get status color
   */
  getStatusColor(status: string): string {
    switch (status) {
      case 'ready':
        return '#46d27d';
      case 'processing':
        return '#ffa726';
      case 'uploading':
        return '#42a5f5';
      case 'error':
        return '#f44336';
      default:
        return '#8a8f9d';
    }
  }

  /**
   * Get status text
   */
  getStatusText(status: string): string {
    switch (status) {
      case 'ready':
        return 'Ready';
      case 'processing':
        return 'Processing';
      case 'uploading':
        return 'Uploading';
      case 'error':
        return 'Error';
      default:
        return 'Unknown';
    }
  }

  /**
   * Navigate to assistants page to create a new assistant
   */
  createAssistant(): void {
    this.router.navigate(['/assistants']);
  }
}
