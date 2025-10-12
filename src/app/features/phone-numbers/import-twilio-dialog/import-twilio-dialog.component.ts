import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../core/services/auth.service';

export interface TwilioImportData {
  phoneNumber: string;
  accountSid: string;
  authToken: string;
  label: string;
  smsEnabled: boolean;
}

@Component({
  selector: 'app-import-twilio-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatSlideToggleModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './import-twilio-dialog.component.html',
  styleUrls: ['./import-twilio-dialog.component.scss']
})
export class ImportTwilioDialogComponent {
  twilioPhoneNumber: string = '';
  twilioAccountSid: string = '';
  twilioAuthToken: string = '';
  phoneLabel: string = '';
  smsEnabled: boolean = true;
  isImporting: boolean = false;

  constructor(
    public dialogRef: MatDialogRef<ImportTwilioDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private http: HttpClient,
    private authService: AuthService,
    private snackBar: MatSnackBar
  ) {}

  /**
   * Check if form is valid
   */
  isFormValid(): boolean {
    return !!(
      this.twilioPhoneNumber &&
      this.twilioAccountSid &&
      this.twilioAuthToken &&
      this.phoneLabel
    );
  }

  /**
   * Import phone number from Twilio
   */
  importFromTwilio(): void {
    if (!this.isFormValid()) {
      this.snackBar.open('Please fill in all required fields', 'Close', {
        duration: 3000,
        horizontalPosition: 'right',
        verticalPosition: 'top'
      });
      return;
    }

    this.isImporting = true;

    const currentUser = this.authService.getCurrentUser();
    if (!currentUser?.organization_id) {
      this.snackBar.open('Organization not found', 'Close', {
        duration: 3000,
        horizontalPosition: 'right',
        verticalPosition: 'top'
      });
      this.isImporting = false;
      return;
    }

    const token = this.authService.getToken();
    if (!token) {
      this.snackBar.open('Authentication required', 'Close', {
        duration: 3000,
        horizontalPosition: 'right',
        verticalPosition: 'top'
      });
      this.isImporting = false;
      return;
    }

    const importData = {
      phone_number: this.twilioPhoneNumber,
      twilio_account_sid: this.twilioAccountSid,
      twilio_auth_token: this.twilioAuthToken,
      friendly_name: this.phoneLabel,
      settings: {
        sms_enabled: this.smsEnabled
      }
    };

    // Make API call to import Twilio phone number using existing endpoint
    const url = `${environment.apiUrl}/organizations/${currentUser.organization_id}/phone-numbers`;
    
    this.http.post(url, importData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }).subscribe({
      next: (response: any) => {
        this.isImporting = false;
        this.snackBar.open('Phone number imported successfully!', 'Close', {
          duration: 3000,
          horizontalPosition: 'right',
          verticalPosition: 'top'
        });
        
        // Return the imported phone number data
        this.dialogRef.close({
          success: true,
          phoneNumber: response
        });
      },
      error: (error) => {
        this.isImporting = false;
        console.error('Error importing Twilio phone number:', error);
        
        const errorMessage = error.error?.detail || error.error?.message || 'Failed to import phone number';
        this.snackBar.open(errorMessage, 'Close', {
          duration: 5000,
          horizontalPosition: 'right',
          verticalPosition: 'top'
        });
      }
    });
  }

  /**
   * Cancel dialog
   */
  cancel(): void {
    this.dialogRef.close({ success: false });
  }
}
