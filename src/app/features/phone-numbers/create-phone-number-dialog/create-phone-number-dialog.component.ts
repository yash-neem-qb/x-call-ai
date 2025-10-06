import { Component, Inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Subject, takeUntil } from 'rxjs';

import { PhoneService, PhoneNumberCreate, AvailablePhoneNumber } from '../../../core/services/phone.service';
import { Assistant } from '../../../core/services/assistant.service';

@Component({
  selector: 'app-create-phone-number-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatCheckboxModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './create-phone-number-dialog.component.html',
  styleUrls: ['./create-phone-number-dialog.component.scss']
})
export class CreatePhoneNumberDialogComponent implements OnInit, OnDestroy {
  // Step tracking
  currentStep = 1;
  totalSteps = 3;
  
  // Step 1: Country and region selection
  countries: { code: string; name: string; }[] = [];
  regions: { code: string; name: string; }[] = [];
  selectedCountry = '';
  selectedRegion = '';
  isLoadingCountries = false;
  isLoadingRegions = false;
  
  // Step 2: Available numbers
  availableNumbers: AvailablePhoneNumber[] = [];
  selectedPhoneNumber: AvailablePhoneNumber | null = null;
  isLoadingNumbers = false;
  numberError: string | null = null;
  
  // Step 3: Configuration
  friendlyName = '';
  selectedAssistantId = '';
  capabilities = {
    voice: true,
    sms: false,
    mms: false
  };
  
  // Purchase state
  isPurchasing = false;
  purchaseError: string | null = null;
  
  private destroy$ = new Subject<void>();
  
  constructor(
    public dialogRef: MatDialogRef<CreatePhoneNumberDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { assistants: Assistant[] },
    private phoneService: PhoneService
  ) {}
  
  ngOnInit(): void {
    this.loadCountries();
  }
  
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
  
  /**
   * Load available countries
   */
  loadCountries(): void {
    this.isLoadingCountries = true;
    
    this.phoneService.getSupportedCountries()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (countries) => {
          this.countries = countries;
          this.isLoadingCountries = false;
          this.loadRegions();
        },
        error: (err) => {
          console.error('Error loading countries:', err);
          this.isLoadingCountries = false;
          // Fallback to US only
          this.countries = [{ code: 'US', name: 'United States' }];
        }
      });
  }
  
  /**
   * Load regions for selected country
   */
  loadRegions(): void {
    if (!this.selectedCountry) return;
    
    this.isLoadingRegions = true;
    this.selectedRegion = '';
    
    this.phoneService.getRegions(this.selectedCountry)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (regions) => {
          this.regions = regions;
          this.isLoadingRegions = false;
        },
        error: (err) => {
          console.error('Error loading regions:', err);
          this.isLoadingRegions = false;
          this.regions = [];
        }
      });
  }
  
  /**
   * Search for available phone numbers
   */
  searchAvailableNumbers(): void {
    this.isLoadingNumbers = true;
    this.numberError = null;
    this.availableNumbers = [];
    this.selectedPhoneNumber = null;
    
    this.phoneService.searchAvailablePhoneNumbers(this.selectedCountry, this.selectedRegion)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.availableNumbers = response.items;
          this.isLoadingNumbers = false;
          
          if (this.availableNumbers.length === 0) {
            this.numberError = 'No available phone numbers found for the selected region. Please try a different region.';
          } else {
            this.currentStep = 2;
          }
        },
        error: (err) => {
          console.error('Error searching phone numbers:', err);
          this.isLoadingNumbers = false;
          this.numberError = 'Failed to search for available phone numbers. Please try again.';
        }
      });
  }
  
  /**
   * Select a phone number and proceed to next step
   */
  selectNumber(number: AvailablePhoneNumber): void {
    this.selectedPhoneNumber = number;
    this.friendlyName = number.friendly_name || number.phone_number;
    this.currentStep = 3;
  }
  
  /**
   * Purchase the selected phone number
   */
  purchaseNumber(): void {
    if (!this.selectedPhoneNumber) return;
    
    this.isPurchasing = true;
    this.purchaseError = null;
    
    const phoneNumberCreate: PhoneNumberCreate = {
      phone_number: this.selectedPhoneNumber.phone_number,
      friendly_name: this.friendlyName,
      assistant_id: this.selectedAssistantId || undefined,
      settings: {
        routing: 'primary',
        note: 'Created via X-Call UI'
      }
    };
    
    this.phoneService.createPhoneNumber(phoneNumberCreate)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (phoneNumber) => {
          this.isPurchasing = false;
          this.dialogRef.close(phoneNumber);
        },
        error: (err) => {
          console.error('Error purchasing phone number:', err);
          this.isPurchasing = false;
          this.purchaseError = 'Failed to purchase phone number. Please try again.';
        }
      });
  }
  
  /**
   * Go back to previous step
   */
  previousStep(): void {
    if (this.currentStep > 1) {
      this.currentStep--;
    }
  }
  
  /**
   * Close the dialog
   */
  cancel(): void {
    this.dialogRef.close();
  }
}
