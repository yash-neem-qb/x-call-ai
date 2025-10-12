import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';

export interface AssistantTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  systemPrompt: string;
  firstMessage: string;
}

export interface AssistantTemplateDialogData {
  templates: AssistantTemplate[];
}

export interface AssistantTemplateDialogResult {
  name: string;
  template: AssistantTemplate | null;
}

@Component({
  selector: 'app-assistant-template-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule
  ],
  templateUrl: './assistant-template-dialog.component.html',
  styleUrls: ['./assistant-template-dialog.component.scss']
})
export class AssistantTemplateDialogComponent {
  assistantName = 'New Assistant';
  selectedTemplate: AssistantTemplate | null = null;
  
  // Blank template
  blankTemplate: AssistantTemplate = {
    id: 'blank',
    name: 'Blank Template',
    description: 'Start with a blank template and configure your assistant from scratch.',
    icon: 'add',
    systemPrompt: '',
    firstMessage: ''
  };
  
  // QuickStart templates
  quickStartTemplates: AssistantTemplate[] = [
    {
      id: 'customer-support',
      name: 'Customer Support Specialist',
      description: 'A comprehensive template for resolving product issues, answering questions, and ensuring satisfying customer experiences with technical knowledge and empathy.',
      icon: 'support_agent',
      systemPrompt: 'You are a customer support specialist who helps users with product questions and issues. Be friendly, empathetic, and solution-oriented.',
      firstMessage: 'Hello! I\'m your customer support specialist. How can I assist you with our products or services today?'
    },
    {
      id: 'loan-assistant',
      name: 'Loan Assistant',
      description: 'A specialized template for loan payment reminders and collections, designed to professionally communicate with customers about their financial obligations.',
      icon: 'account_balance',
      systemPrompt: 'You are a professional voice assistant for a financial services company.',
      firstMessage: 'Hello, this is calling from the financial services department. How may I assist you today?'
    },
    {
      id: 'appointment-scheduler',
      name: 'Appointment Scheduler',
      description: 'A specialized template for efficiently booking, confirming, rescheduling, or canceling appointments while providing clear service information.',
      icon: 'calendar_today',
      systemPrompt: 'You are an appointment scheduler who helps users book, reschedule or cancel appointments. Be efficient and clear in your communication.',
      firstMessage: 'Hello! I\'m here to help you schedule an appointment. Would you like to book a new appointment, or manage an existing one?'
    },
    {
      id: 'info-collector',
      name: 'Info Collector',
      description: 'A methodical template for gathering accurate and complete information from customers while ensuring data quality and regulatory compliance.',
      icon: 'assignment',
      systemPrompt: 'You are an information collector who gathers specific details from users in a structured way. Be thorough but efficient.',
      firstMessage: 'Hi! I\'ll be collecting some information from you today. Let\'s start with your basic details. Could you provide your full name?'
    }
  ];
  
  constructor(
    public dialogRef: MatDialogRef<AssistantTemplateDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: AssistantTemplateDialogData
  ) {
    // Add any additional templates from data if provided
    if (data?.templates) {
      this.quickStartTemplates = [...this.quickStartTemplates, ...data.templates];
    }
  }
  
  selectTemplate(template: AssistantTemplate): void {
    this.selectedTemplate = template;
  }
  
  createAssistant(): void {
    this.dialogRef.close({
      name: this.assistantName,
      template: this.selectedTemplate || this.blankTemplate
    });
  }
  
  cancel(): void {
    this.dialogRef.close();
  }
}
