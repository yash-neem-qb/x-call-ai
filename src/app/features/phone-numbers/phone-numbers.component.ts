import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil, of } from 'rxjs';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';

import { PhoneService, PhoneNumber, ApiPhoneNumber, PhoneNumberUpdate } from '../../core/services/phone.service';
import { AssistantService, Assistant } from '../../core/services/assistant.service';
import { AuthService } from '../../core/services/auth.service';
import { ImportTwilioDialogComponent } from './import-twilio-dialog/import-twilio-dialog.component';

@Component({
  selector: 'app-phone-numbers',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    MatTooltipModule,
    MatInputModule,
    MatSelectModule,
    MatDialogModule,
    MatSnackBarModule
  ],
  templateUrl: './phone-numbers.component.html',
  styleUrls: ['./phone-numbers.component.scss']
})
export class PhoneNumbersComponent implements OnInit, OnDestroy {
  phoneNumbers: PhoneNumber[] = [];
  assistants: Assistant[] = [];
  selectedPhoneNumber: PhoneNumber | null = null;
  isEditing = false;
  isLoading = true;
  error: string | null = null;
  searchQuery = '';
  
  // For editing phone number
  editedName = '';
  selectedAssistantId: string | null = null;
  
  private destroy$ = new Subject<void>();
  
  constructor(
    private phoneService: PhoneService,
    private assistantService: AssistantService,
    private authService: AuthService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}
  
  ngOnInit(): void {
    this.loadPhoneNumbers();
    this.loadAssistants();
  }
  
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
  
  /**
   * Load phone numbers
   */
  loadPhoneNumbers(): void {
    this.isLoading = true;
    this.error = null;
    
    // For debugging - log the API URL
    console.log('Loading phone numbers...');
    
    this.phoneService.getPhoneNumbers()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: ApiPhoneNumber[]) => {
          console.log('Phone numbers response:', response);
          
          if (response && response.length > 0) {
            // Map API response to our expected format
            this.phoneNumbers = response.map(phone => {
              return {
                id: phone.id,
                phone_number: phone.phone_number,
                friendly_name: phone.friendly_name,
                country: '',
                region: '',
                capabilities: {
                  voice: false,
                  sms: false,
                  mms: false
                },
                status: phone.is_active ? 'active' : 'inactive',
                created_at: phone.created_at,
                updated_at: phone.updated_at,
                organization_id: phone.organization_id,
                assistant_id: phone.settings?.assignedUserId || undefined,
                assistant_name: undefined // We'll need to look this up separately
              };
            });
            console.log('Loaded phone numbers:', this.phoneNumbers);
            
            // Auto-select the first phone number
            if (this.phoneNumbers.length > 0) {
              this.selectPhoneNumber(this.phoneNumbers[0]);
            }
          } else {
            console.warn('No phone numbers in response');
            this.phoneNumbers = [];
            this.handleNoPhoneNumbers();
          }
          
          this.isLoading = false;
        },
        error: (err) => {
          console.error('Error loading phone numbers:', err);
          this.error = 'Failed to load phone numbers. Please try again.';
          this.isLoading = false;
          this.phoneNumbers = [];
          this.handleNoPhoneNumbers();
        }
      });
  }
  
  /**
   * No mock data - show error if no phone numbers are loaded
   */
  private handleNoPhoneNumbers(): void {
    console.log('No phone numbers available');
    this.snackBar.open('No phone numbers found. Please add phone numbers to your account.', 'Close', { duration: 5000 });
  }
  
  /**
   * Load assistants for dropdown
   */
  loadAssistants(): void {
    this.assistantService.getAssistants()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.assistants = response.items;
        },
        error: (err) => {
          console.error('Error loading assistants:', err);
        }
      });
  }
  
  /**
   * Open import Twilio phone number dialog
   */
  createPhoneNumber(): void {
    const dialogRef = this.dialog.open(ImportTwilioDialogComponent, {
      width: '600px',
      panelClass: 'dark-dialog',
      data: { assistants: this.assistants }
    });
    
    dialogRef.afterClosed().subscribe(result => {
      if (result && result.success) {
        this.loadPhoneNumbers();
        this.snackBar.open('Phone number imported successfully!', 'Close', {
          duration: 3000,
          horizontalPosition: 'right',
          verticalPosition: 'top'
        });
      }
    });
  }
  
  /**
   * Select phone number for editing
   */
  selectPhoneNumber(phoneNumber: PhoneNumber): void {
    this.selectedPhoneNumber = phoneNumber;
    this.editedName = phoneNumber.friendly_name;
    this.selectedAssistantId = phoneNumber.assistant_id || null;
    this.isEditing = true;
  }
  
  /**
   * Cancel editing
   */
  cancelEdit(): void {
    this.selectedPhoneNumber = null;
    this.isEditing = false;
  }
  
  /**
   * Save phone number changes
   */
  saveChanges(): void {
    if (!this.selectedPhoneNumber) return;
    
    const update: PhoneNumberUpdate = {
      friendly_name: this.editedName,
      assistant_id: this.selectedAssistantId
    };
    
    this.phoneService.updatePhoneNumber(this.selectedPhoneNumber.id, update)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updatedPhoneNumber: ApiPhoneNumber) => {
          // Map API response to our expected format
          const mappedPhoneNumber: PhoneNumber = {
            id: updatedPhoneNumber.id,
            phone_number: updatedPhoneNumber.phone_number,
            friendly_name: updatedPhoneNumber.friendly_name,
            country: '',
            region: '',
            capabilities: {
              voice: false,
              sms: false,
              mms: false
            },
            status: updatedPhoneNumber.is_active ? 'active' : 'inactive',
            created_at: updatedPhoneNumber.created_at,
            updated_at: updatedPhoneNumber.updated_at,
            organization_id: updatedPhoneNumber.organization_id,
            assistant_id: updatedPhoneNumber.assistant_id || updatedPhoneNumber.settings?.assignedUserId,
            assistant_name: undefined // We'll need to look this up separately
          };
          
          // Update the phone number in the list
          const index = this.phoneNumbers.findIndex(p => p.id === mappedPhoneNumber.id);
          if (index !== -1) {
            this.phoneNumbers[index] = mappedPhoneNumber;
          }
          
          this.selectedPhoneNumber = null;
          this.isEditing = false;
          this.snackBar.open('Phone number updated successfully', 'Close', { duration: 3000 });
        },
        error: (err) => {
          console.error('Error updating phone number:', err);
          this.snackBar.open('Failed to update phone number', 'Close', { duration: 3000 });
        }
      });
  }
  
  /**
   * Release (delete) phone number
   */
  releasePhoneNumber(phoneNumber: PhoneNumber): void {
    if (confirm(`Are you sure you want to release the phone number ${phoneNumber.phone_number}?`)) {
      this.phoneService.deletePhoneNumber(phoneNumber.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.phoneNumbers = this.phoneNumbers.filter(p => p.id !== phoneNumber.id);
            if (this.selectedPhoneNumber && this.selectedPhoneNumber.id === phoneNumber.id) {
              this.selectedPhoneNumber = null;
              this.isEditing = false;
            }
            this.snackBar.open('Phone number released successfully', 'Close', { duration: 3000 });
          },
          error: (err) => {
            console.error('Error releasing phone number:', err);
            this.snackBar.open('Failed to release phone number', 'Close', { duration: 3000 });
          }
        });
    }
  }
  
  /**
   * Filter phone numbers based on search query
   */
  get filteredPhoneNumbers(): PhoneNumber[] {
    if (!this.searchQuery) return this.phoneNumbers;
    
    const query = this.searchQuery.toLowerCase();
    return this.phoneNumbers.filter(phone => 
      phone.phone_number.toLowerCase().includes(query) ||
      phone.friendly_name.toLowerCase().includes(query)
    );
  }
}