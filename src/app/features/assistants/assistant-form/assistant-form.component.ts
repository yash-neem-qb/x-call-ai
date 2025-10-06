import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSliderModule } from '@angular/material/slider';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';

import { AssistantService, Assistant, AssistantCreate, AssistantUpdate, VoiceConfig, ModelConfig, TranscriberConfig } from '../../../core/services/assistant.service';
import { VoiceService, Voice } from '../../../core/services/voice.service';

@Component({
  selector: 'app-assistant-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatSliderModule,
    MatSlideToggleModule
  ],
  templateUrl: './assistant-form.component.html',
  styleUrls: ['./assistant-form.component.scss']
})
export class AssistantFormComponent implements OnInit {
  @Input() assistant: Assistant | null = null;
  @Input() isEditing = false;
  @Output() save = new EventEmitter<AssistantCreate | AssistantUpdate>();
  @Output() cancel = new EventEmitter<void>();

  assistantForm!: FormGroup;
  
  // Voice data
  availableVoices: Voice[] = [];
  filteredVoices: Voice[] = [];
  voiceProviders: string[] = ['ElevenLabs'];
  availableAccents: string[] = [];
  availableGenders: string[] = [];
  
  // Voice filtering
  selectedAccent: string = '';
  selectedGender: string = '';
  voiceSearchQuery: string = '';
  
  // Model data
  modelProviders: string[] = ['OpenAI'];
  models: { [key: string]: string[] } = {
    'OpenAI': ['gpt-4o', 'gpt-4-turbo', 'gpt-4', 'gpt-3.5-turbo', 'gpt-4o-mini']
  };
  
  // Transcriber data
  transcriberProviders: string[] = ['Deepgram'];
  
  constructor(
    private fb: FormBuilder,
    private assistantService: AssistantService,
    private voiceService: VoiceService
  ) {}

  ngOnInit(): void {
    this.loadVoices();
    this.initForm();
  }

  /**
   * Initialize form with default values or assistant data
   */
  initForm(): void {
    this.assistantForm = this.fb.group({
      name: [this.assistant?.name || '', [Validators.required]],
      voice: this.fb.group({
        provider: [this.assistant?.voice?.provider || 'ElevenLabs', [Validators.required]],
        voiceId: [this.assistant?.voice?.voiceId || '', [Validators.required]],
        stability: [this.assistant?.voice?.stability || 0.5],
        similarity: [this.assistant?.voice?.similarity || 0.8],
        speakingRate: [this.assistant?.voice?.speakingRate || 1.0],
        pitch: [this.assistant?.voice?.pitch || 1.0]
      }),
      model: this.fb.group({
        provider: [this.assistant?.model?.provider || 'OpenAI', [Validators.required]],
        model: [this.assistant?.model?.model || 'gpt-4o', [Validators.required]],
        temperature: [this.assistant?.model?.temperature || 0.7],
        systemPrompt: [this.assistant?.model?.systemPrompt || '']
      }),
      firstMessage: [this.assistant?.firstMessage || 'Hello, how can I help you today?'],
      voicemailMessage: [this.assistant?.voicemailMessage || 'Please leave a message after the tone.'],
      endCallMessage: [this.assistant?.endCallMessage || 'Thank you for calling. Goodbye!'],
      transcriber: this.fb.group({
        provider: [this.assistant?.transcriber?.provider || 'Deepgram', [Validators.required]],
        model: [this.assistant?.transcriber?.model || 'whisper-1']
      })
    });
  }

  /**
   * Load available voices
   */
  loadVoices(): void {
    this.voiceService.getVoicesByProvider('11labs', 100)
      .subscribe({
        next: (voices) => {
          this.availableVoices = voices;
          this.filteredVoices = voices;
          this.availableAccents = this.voiceService.getAvailableAccents('11labs');
          this.availableGenders = this.voiceService.getAvailableGenders('11labs');
        },
        error: (err) => {
          console.error('Error loading voices:', err);
        }
      });
  }

  /**
   * Filter voices based on selected criteria
   */
  filterVoices(): void {
    let filtered = [...this.availableVoices];

    // Filter by accent
    if (this.selectedAccent) {
      filtered = filtered.filter(voice => voice.accent === this.selectedAccent);
    }

    // Filter by gender
    if (this.selectedGender) {
      filtered = filtered.filter(voice => voice.gender === this.selectedGender);
    }

    // Filter by search query
    if (this.voiceSearchQuery) {
      filtered = filtered.filter(voice => 
        voice.name.toLowerCase().includes(this.voiceSearchQuery.toLowerCase())
      );
    }

    this.filteredVoices = filtered;
  }

  /**
   * Clear voice filters
   */
  clearVoiceFilters(): void {
    this.selectedAccent = '';
    this.selectedGender = '';
    this.voiceSearchQuery = '';
    this.filteredVoices = [...this.availableVoices];
  }

  /**
   * Get voice display name with accent info
   */
  getVoiceDisplayName(voice: Voice): string {
    let displayName = voice.name;
    if (voice.accent) {
      displayName += ` (${voice.accent.charAt(0).toUpperCase() + voice.accent.slice(1)})`;
    }
    return displayName;
  }

  /**
   * Get model options for selected provider
   */
  getModelOptions(provider: string): string[] {
    return this.models[provider] || [];
  }

  /**
   * Play voice preview
   */
  playVoicePreview(previewUrl: string): void {
    if (previewUrl) {
      this.voiceService.playVoicePreview(previewUrl).catch(error => {
        console.error('Error playing voice preview:', error);
      });
    }
  }

  /**
   * Stop all audio playback
   */
  stopAllAudio(): void {
    this.voiceService.stopAllAudio();
  }

  /**
   * Submit form
   */
  onSubmit(): void {
    if (this.assistantForm.invalid) {
      return;
    }

    const formValue = this.assistantForm.value;
    
    if (this.isEditing && this.assistant) {
      // Update existing assistant
      const assistantUpdate: AssistantUpdate = {
        name: formValue.name,
        voice: formValue.voice,
        model: formValue.model,
        transcriber: formValue.transcriber,
        first_message: formValue.firstMessage,
        voicemailMessage: formValue.voicemailMessage,
        endCallMessage: formValue.endCallMessage
      };
      
      this.save.emit(assistantUpdate);
    } else {
      // Create new assistant
      const assistantCreate: AssistantCreate = {
        name: formValue.name,
        voice: formValue.voice,
        model: formValue.model,
        transcriber: formValue.transcriber,
        firstMessage: formValue.firstMessage,
        voicemailMessage: formValue.voicemailMessage,
        endCallMessage: formValue.endCallMessage
      };
      
      this.save.emit(assistantCreate);
    }
  }

  /**
   * Cancel form
   */
  onCancel(): void {
    this.cancel.emit();
  }
}
