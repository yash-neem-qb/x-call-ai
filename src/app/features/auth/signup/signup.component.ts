import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';

import { AuthService, SignupRequest } from '../../../core/services/auth.service';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatIconModule, MatSnackBarModule],
  templateUrl: './signup.component.html',
  styleUrls: ['./signup.component.scss']
})
export class SignupComponent implements OnInit {
  signupForm!: FormGroup;
  isLoading = false;
  errorMessage = '';
  showPassword = false;
  showConfirmPassword = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.initializeForm();
  }

  private initializeForm(): void {
    this.signupForm = this.fb.group({
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      lastName: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      organizationName: [''],
      password: ['', [
        Validators.required,
        Validators.minLength(8),
        Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/)
      ]],
      confirmPassword: ['', [Validators.required]],
      acceptTerms: [false, [Validators.requiredTrue]]
    }, { validators: this.passwordMatchValidator });
  }

  private passwordMatchValidator(form: FormGroup) {
    const password = form.get('password');
    const confirmPassword = form.get('confirmPassword');
    
    if (password && confirmPassword && password.value !== confirmPassword.value) {
      confirmPassword.setErrors({ mismatch: true });
      return { mismatch: true };
    }
    
    if (confirmPassword?.errors?.['mismatch']) {
      delete confirmPassword.errors['mismatch'];
      if (Object.keys(confirmPassword.errors).length === 0) {
        confirmPassword.setErrors(null);
      }
    }
    
    return null;
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.signupForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPasswordVisibility(): void {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  // Password strength indicators
  get hasMinLength(): boolean {
    const password = this.signupForm.get('password')?.value || '';
    return password.length >= 8;
  }

  get hasUppercase(): boolean {
    const password = this.signupForm.get('password')?.value || '';
    return /[A-Z]/.test(password);
  }

  get hasLowercase(): boolean {
    const password = this.signupForm.get('password')?.value || '';
    return /[a-z]/.test(password);
  }

  get hasNumber(): boolean {
    const password = this.signupForm.get('password')?.value || '';
    return /\d/.test(password);
  }

  onSubmit(): void {
    if (this.signupForm.valid && !this.isLoading) {
      this.isLoading = true;
      this.errorMessage = '';

      const formValue = this.signupForm.value;
      const signupData: SignupRequest = {
        first_name: formValue.firstName,
        last_name: formValue.lastName,
        email: formValue.email,
        password: formValue.password,
        organization_name: formValue.organizationName || undefined
      };

      this.authService.signup(signupData).subscribe({
        next: (response) => {
          this.isLoading = false;
          this.snackBar.open('Account created successfully! Welcome to X-Call AI.', 'Close', {
            duration: 5000,
            panelClass: ['success-snackbar']
          });
          
          // Redirect to dashboard since user is now logged in
          this.router.navigate(['/dashboard']);
        },
        error: (error) => {
          this.isLoading = false;
          console.error('Signup error:', error);
          
          // Handle different error types
          if (error.status === 400) {
            if (error.error?.detail?.includes('email')) {
              this.errorMessage = 'An account with this email already exists. Please try logging in instead.';
            } else {
              this.errorMessage = 'Please check your information and try again.';
            }
          } else if (error.status === 422) {
            this.errorMessage = 'Please check your information and try again.';
          } else {
            this.errorMessage = 'Something went wrong. Please try again later.';
          }
        }
      });
    } else {
      // Mark all fields as touched to show validation errors
      Object.keys(this.signupForm.controls).forEach(key => {
        this.signupForm.get(key)?.markAsTouched();
      });
    }
  }

  goToLogin(): void {
    this.router.navigate(['/auth/login']);
  }
}