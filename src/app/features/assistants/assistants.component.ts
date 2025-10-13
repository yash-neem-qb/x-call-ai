import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { FormsModule } from '@angular/forms';

import { AssistantService, Assistant, AssistantCreate, AssistantUpdate } from '../../core/services/assistant.service';
import { VoiceService, Voice } from '../../core/services/voice.service';
import { AssistantTemplateDialogComponent, AssistantTemplate } from './assistant-template-dialog/assistant-template-dialog.component';
import { AssistantChatComponent } from './assistant-chat/assistant-chat.component';
import { AssistantToolsComponent } from './assistant-tools/assistant-tools.component';

@Component({
  selector: 'app-assistants',
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
    MatSlideToggleModule,
    MatProgressBarModule,
    MatSnackBarModule,
    MatDialogModule,
    AssistantToolsComponent
  ],
  templateUrl: './assistants.component.html',
  styleUrls: ['./assistants.component.scss']
})
export class AssistantsComponent implements OnInit, OnDestroy {
  // Assistants data
  assistants: Assistant[] = [];
  selectedAssistant: Assistant | null = null;
  newAssistant: AssistantCreate | null = null;
  isLoading = true;
  error: string | null = null;
  
  // Voice data
  availableVoices: Voice[] = [];
  voiceProviders: string[] = ['11labs'];
  isLoadingVoices = false;
  
  // Model data
  modelProviders: string[] = ['openai'];
  models: { [key: string]: string[] } = {
    'openai': ['gpt-4o', 'gpt-4-turbo', 'gpt-4', 'gpt-3.5-turbo', 'gpt-4o-mini']
  };
  
  // Transcriber data
  transcriberProviders: string[] = ['deepgram'];
  
  // Current view state
  activeTab = 'model';
  isCreating = false;
  manualVoiceId = false; // For manual voice ID input toggle
  showCodePanel = false; // For showing JSON configuration panel
  private _firstMessageMode = '';
  
  // Properties for two-way binding
  private _modelProvider = 'openai';
  private _modelName = 'gpt-4o-mini';
  private _firstMessage = 'Hello, how can I help you today?';
  private _systemPrompt = 'You are a helpful assistant.';
  private _maxTokens = 1024;
  private _temperature = 0.7;
  private _voiceProvider = '11labs';
  private _voiceId = '21m00Tcm4TlvDq8ikWAM';
  private _speakingRate = 1.0;
  private _pitch = 1.0;
  private _transcriberProvider = 'deepgram';
  private _transcriberLanguage = 'en';
  private _transcriberModel = 'nova-3';

  get hasSelection(): boolean {
    return !!this.selectedAssistant || this.isCreating;
  }
  
  // Getter/setter methods for two-way binding
  
  // Model provider
  get modelProvider(): string {
    return this._modelProvider;
  }
  
  set modelProvider(value: string) {
    this._modelProvider = value;
    if (this.isCreating && this.newAssistant) {
      this.newAssistant.model.provider = value;
    } else if (this.selectedAssistant) {
      this.selectedAssistant.model.provider = value;
    }
  }
  
  // Model name
  get modelName(): string {
    return this._modelName;
  }
  
  set modelName(value: string) {
    this._modelName = value;
    if (this.isCreating && this.newAssistant) {
      this.newAssistant.model.model = value;
    } else if (this.selectedAssistant) {
      this.selectedAssistant.model.model = value;
    }
  }
  
  // First message
  get firstMessage(): string {
    return this._firstMessage;
  }
  
  set firstMessage(value: string) {
    this._firstMessage = value;
    if (this.isCreating && this.newAssistant) {
      this.newAssistant.firstMessage = value;
    } else if (this.selectedAssistant) {
      this.selectedAssistant.firstMessage = value;
    }
  }
  
  // First message mode
  get firstMessageMode(): string {
    return this._firstMessageMode;
  }
  
  set firstMessageMode(value: string) {
    this._firstMessageMode = value;
    // This is just a UI state, no need to update assistant data
  }
  
  // System prompt
  get systemPrompt(): string {
    return this._systemPrompt;
  }
  
  set systemPrompt(value: string) {
    this._systemPrompt = value;
    if (this.isCreating && this.newAssistant) {
      this.newAssistant.model.systemPrompt = value;
    } else if (this.selectedAssistant) {
      this.selectedAssistant.model.systemPrompt = value;
    }
  }
  
  // Max tokens
  get maxTokens(): number {
    return this._maxTokens;
  }
  
  set maxTokens(value: number) {
    this._maxTokens = value;
    if (this.isCreating && this.newAssistant) {
      this.newAssistant.model.maxTokens = value;
    } else if (this.selectedAssistant) {
      this.selectedAssistant.model.maxTokens = value;
    }
  }
  
  // Temperature
  get temperature(): number {
    return this._temperature;
  }
  
  set temperature(value: number) {
    this._temperature = value;
    if (this.isCreating && this.newAssistant) {
      this.newAssistant.model.temperature = value;
    } else if (this.selectedAssistant) {
      this.selectedAssistant.model.temperature = value;
    }
  }
  
  // Voice provider
  get voiceProvider(): string {
    return this._voiceProvider;
  }
  
  set voiceProvider(value: string) {
    this._voiceProvider = value;
    if (this.isCreating && this.newAssistant) {
      this.newAssistant.voice.provider = value;
    } else if (this.selectedAssistant) {
      this.selectedAssistant.voice.provider = value;
    }
  }
  
  // Voice ID
  get voiceId(): string {
    return this._voiceId;
  }
  
  set voiceId(value: string) {
    this._voiceId = value;
    if (this.isCreating && this.newAssistant) {
      this.newAssistant.voice.voiceId = value;
    } else if (this.selectedAssistant) {
      this.selectedAssistant.voice.voiceId = value;
    }
  }
  
  // Speaking rate
  get speakingRate(): number {
    return this._speakingRate;
  }
  
  set speakingRate(value: number) {
    this._speakingRate = value;
    if (this.isCreating && this.newAssistant) {
      this.newAssistant.voice.speed = value;
    } else if (this.selectedAssistant) {
      // Handle legacy property or set new property
      if ('speakingRate' in this.selectedAssistant.voice) {
        (this.selectedAssistant.voice as any).speakingRate = value;
      } else {
        this.selectedAssistant.voice.speed = value;
      }
    }
  }
  
  // Pitch
  get pitch(): number {
    return this._pitch;
  }
  
  set pitch(value: number) {
    this._pitch = value;
    if (this.isCreating && this.newAssistant) {
      // For new assistants, we don't set pitch as it's not in the API
      // But we keep the value in the component for UI
    } else if (this.selectedAssistant) {
      // Handle legacy property if it exists
      if ('pitch' in this.selectedAssistant.voice) {
        (this.selectedAssistant.voice as any).pitch = value;
      }
    }
  }

  // Transcriber provider
  get transcriberProvider(): string {
    return this._transcriberProvider;
  }
  
  set transcriberProvider(value: string) {
    this._transcriberProvider = value;
    if (this.isCreating && this.newAssistant) {
      this.newAssistant.transcriber.provider = value;
    } else if (this.selectedAssistant) {
      this.selectedAssistant.transcriber.provider = value;
    }
  }

  // Transcriber language
  get transcriberLanguage(): string {
    return this._transcriberLanguage;
  }
  
  set transcriberLanguage(value: string) {
    this._transcriberLanguage = value;
    if (this.isCreating && this.newAssistant) {
      this.newAssistant.transcriber.language = value;
    } else if (this.selectedAssistant) {
      this.selectedAssistant.transcriber.language = value;
    }
  }

  // Transcriber model
  get transcriberModel(): string {
    return this._transcriberModel;
  }
  
  set transcriberModel(value: string) {
    this._transcriberModel = value;
    if (this.isCreating && this.newAssistant) {
      this.newAssistant.transcriber.model = value;
    } else if (this.selectedAssistant) {
      this.selectedAssistant.transcriber.model = value;
    }
  }

  private createEmptyAssistant(): AssistantCreate {
    return {
      name: 'New Assistant',
      voice: {
        provider: '11labs',
        voiceId: '21m00Tcm4TlvDq8ikWAM',
        model: 'eleven_flash_v2_5',
        stability: 0.5,
        similarityBoost: 0.75
      },
      model: {
        provider: 'openai',
        model: 'gpt-4o-mini',
        systemPrompt: 'You are a helpful assistant.',
        temperature: 0.7,
        maxTokens: 1024,
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant.'
          }
        ]
      },
      transcriber: {
        provider: 'deepgram',
        model: 'nova-3',
        language: 'en'
      },
      firstMessage: 'Hello, how can I help you today?',
      voicemailMessage: 'Please leave a message and I will get back to you.',
      endCallMessage: 'Thank you for your time. Goodbye.',
      isServerUrlSecretSet: false
    };
  }
  
  private destroy$ = new Subject<void>();

  
  constructor(
    private assistantService: AssistantService,
    private voiceService: VoiceService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    // Load voices first, then assistants
    this.loadVoices();
    this.loadAssistants();
    
    // Check for assistant query parameter
    this.route.queryParams.subscribe(params => {
      if (params['assistant']) {
        // Wait for assistants to load, then select the specified assistant
        this.assistantService.getAssistants().subscribe(assistantList => {
          const targetAssistant = assistantList.items.find(a => a.id === params['assistant']);
          if (targetAssistant) {
            this.selectAssistant(targetAssistant);
          }
        });
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Load assistants from API
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
          
          // Select first assistant if available and voices are loaded
          if (this.assistants.length > 0 && !this.selectedAssistant && this.availableVoices.length > 0) {
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
   * Load available voices
   */
  loadVoices(): void {
    this.isLoadingVoices = true;
    this.voiceService.getVoicesByProvider('11labs', 100)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (voices) => {
          this.availableVoices = voices;
          this.isLoadingVoices = false;
          
          // If assistants are already loaded but no assistant is selected, select the first one
          if (this.assistants.length > 0 && !this.selectedAssistant) {
            this.selectAssistant(this.assistants[0]);
          }
        },
        error: (err) => {
          console.error('Error loading voices:', err);
          this.isLoadingVoices = false;
        }
      });
  }

  /**
   * Select an assistant (always in edit mode)
   */
  selectAssistant(assistant: Assistant): void {
    this.selectedAssistant = JSON.parse(JSON.stringify(assistant)); // Create a copy to edit
    this.isCreating = false;
    this.activeTab = 'model';
    
    // Initialize binding properties
    this._modelProvider = this.selectedAssistant.model.provider;
    this._modelName = this.selectedAssistant.model.model;
    this._firstMessage = this.selectedAssistant.firstMessage || '';
    this._systemPrompt = this.selectedAssistant.model.systemPrompt || '';
    this._maxTokens = this.selectedAssistant.model.maxTokens || 1024;
    this._temperature = this.selectedAssistant.model.temperature || 0.7;
    this._voiceProvider = this.selectedAssistant.voice.provider;
    this._voiceId = this.selectedAssistant.voice.voiceId;
    // Handle both new 'speed' property and legacy 'speakingRate' property
    this._speakingRate = this.selectedAssistant.voice.speed || (this.selectedAssistant.voice as any).speakingRate || 1.0;
    // Handle legacy 'pitch' property if it exists
    this._pitch = (this.selectedAssistant.voice as any).pitch || 1.0;
    // Set transcriber properties
    this._transcriberProvider = this.selectedAssistant.transcriber.provider;
    this._transcriberLanguage = this.selectedAssistant.transcriber.language || 'en';
    this._transcriberModel = this.selectedAssistant.transcriber.model || 'nova-3';
    // Set first message mode (default to assistant since all assistants have firstMessage)
    this._firstMessageMode = 'assistant';
  }

  /**
   * Start creating a new assistant
   */
  createAssistant(): void {
    const dialogRef = this.dialog.open(AssistantTemplateDialogComponent, {
      width: '800px',
      height: '80vh',
      panelClass: 'dark-dialog',
      disableClose: false,
      data: {}
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
    this.selectedAssistant = null;
    this.isCreating = true;
    this.activeTab = 'model';
    
        // Create new assistant from template
        const template = result.template as AssistantTemplate;
    this.newAssistant = {
          name: result.name || 'New Assistant',
      voice: {
            provider: '11labs',
            voiceId: '21m00Tcm4TlvDq8ikWAM',
            model: 'eleven_flash_v2_5',
        stability: 0.5,
            similarityBoost: 0.75
      },
      model: {
            provider: 'openai',
            model: 'gpt-4o-mini',
        temperature: 0.7,
            systemPrompt: template ? template.systemPrompt : 'You are a helpful assistant.',
            maxTokens: 1024,
            messages: [
              {
                role: 'system',
                content: template ? template.systemPrompt : 'You are a helpful assistant.'
              }
            ]
      },
      transcriber: {
            provider: 'deepgram',
            model: 'nova-3',
            language: 'en'
          },
          firstMessage: template ? template.firstMessage : 'Hello, how can I help you today?',
          voicemailMessage: 'Please leave a message and I will get back to you.',
          endCallMessage: 'Thank you for your time. Goodbye.',
          isServerUrlSecretSet: false
        };
        
        // Initialize binding properties
        this._modelProvider = this.newAssistant.model.provider;
        this._modelName = this.newAssistant.model.model;
        this._firstMessage = this.newAssistant.firstMessage;
        this._systemPrompt = this.newAssistant.model.systemPrompt;
        this._maxTokens = this.newAssistant.model.maxTokens || 250;
        this._temperature = this.newAssistant.model.temperature;
        this._voiceProvider = this.newAssistant.voice.provider;
        this._voiceId = this.newAssistant.voice.voiceId;
        this._speakingRate = this.newAssistant.voice.speed || 1.0;
        this._pitch = 1.0;
        this._transcriberProvider = this.newAssistant.transcriber.provider;
        this._transcriberLanguage = this.newAssistant.transcriber.language || 'en';
        this._transcriberModel = this.newAssistant.transcriber.model || 'nova-3';
        this._firstMessageMode = 'assistant';
      }
    });
  }
  
  /**
   * Save a new assistant
   */
  saveNewAssistant(): void {
    if (!this.newAssistant) return;
    
    this.isLoading = true;
    this.assistantService.createAssistant(this.newAssistant)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (assistant) => {
          this.snackBar.open(`Assistant "${assistant.name}" created successfully`, 'Close', {
            duration: 3000
          });
          this.assistants.push(assistant);
          this.selectAssistant(assistant);
          this.isCreating = false;
          this.isLoading = false;
        },
        error: (err) => {
          console.error('Error creating assistant:', err);
          this.snackBar.open('Failed to create assistant. Please try again.', 'Close', {
            duration: 5000,
            panelClass: 'error-snackbar'
          });
          this.isLoading = false;
        }
      });
  }

  /**
   * Start editing an assistant
   */
  editAssistant(assistant: Assistant): void {
    this.selectedAssistant = JSON.parse(JSON.stringify(assistant)); // Create a copy to edit
    this.isCreating = false;
  }
  
  /**
   * Cancel editing and revert changes
   */
  cancelEdit(): void {
    if (this.isCreating) {
    this.isCreating = false;
      this.newAssistant = null;
      if (this.assistants.length > 0) {
        this.selectAssistant(this.assistants[0]);
      } else {
        this.selectedAssistant = null;
      }
    } else if (this.selectedAssistant) {
      // Reload the original assistant from the list
      const originalAssistant = this.assistants.find(a => a.id === this.selectedAssistant!.id);
      if (originalAssistant) {
        this.selectAssistant(originalAssistant);
      }
    }
  }
  
  /**
   * Save changes to an existing assistant
   */
  saveChanges(): void {
    if (this.isCreating) {
      this.saveNewAssistant();
      return;
    }
    
    if (!this.selectedAssistant) return;
    
    this.isLoading = true;
    
    // Update the selectedAssistant with current form values before saving
    this.selectedAssistant.name = this.selectedAssistant.name; // Keep existing name
    this.selectedAssistant.model.provider = this._modelProvider;
    this.selectedAssistant.model.model = this._modelName;
    this.selectedAssistant.model.systemPrompt = this._systemPrompt;
    this.selectedAssistant.model.maxTokens = this._maxTokens;
    this.selectedAssistant.model.temperature = this._temperature;
    this.selectedAssistant.firstMessage = this._firstMessage;
    this.selectedAssistant.voice.provider = this._voiceProvider;
    this.selectedAssistant.voice.voiceId = this._voiceId;
    this.selectedAssistant.voice.speed = this._speakingRate;
    this.selectedAssistant.transcriber.provider = this._transcriberProvider;
    this.selectedAssistant.transcriber.language = this._transcriberLanguage;
    this.selectedAssistant.transcriber.model = this._transcriberModel;
    
    // Update the messages array with the current system prompt
    this.selectedAssistant.model.messages = [
      {
        role: 'system',
        content: this._systemPrompt
      }
    ];
    
    
    // Update existing assistant using the new format
    const update: AssistantUpdate = {
      name: this.selectedAssistant.name,
      voice_provider: this.selectedAssistant.voice.provider,
      voice_model: this.selectedAssistant.voice.model || 'eleven_flash_v2_5',
      llm_model: this.selectedAssistant.model.model,
      first_message: this.selectedAssistant.firstMessage,
      // Include legacy fields for backward compatibility
      voice: this.selectedAssistant.voice,
      model: this.selectedAssistant.model,
      transcriber: this.selectedAssistant.transcriber,
      voicemailMessage: this.selectedAssistant.voicemailMessage,
      endCallMessage: this.selectedAssistant.endCallMessage
    };
    
    this.assistantService.updateAssistant(this.selectedAssistant.id, update)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (assistant) => {
          // Update the assistant in the list
          const index = this.assistants.findIndex(a => a.id === assistant.id);
          if (index !== -1) {
            this.assistants[index] = assistant;
          }
          
          this.snackBar.open(`Assistant "${assistant.name}" updated successfully`, 'Close', {
            duration: 3000
          });
          this.isLoading = false;
        },
        error: (err) => {
          console.error('Error updating assistant:', err);
          this.snackBar.open('Failed to update assistant. Please try again.', 'Close', {
            duration: 5000,
            panelClass: 'error-snackbar'
          });
          this.isLoading = false;
        }
      });
  }

  /**
   * Delete an assistant
   */
  deleteAssistant(assistant: Assistant): void {
    if (confirm(`Are you sure you want to delete ${assistant.name}?`)) {
      this.assistantService.deleteAssistant(assistant.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.assistants = this.assistants.filter(a => a.id !== assistant.id);
            if (this.selectedAssistant && this.selectedAssistant.id === assistant.id) {
              this.selectedAssistant = this.assistants.length > 0 ? this.assistants[0] : null;
            }
          },
          error: (err) => {
            console.error('Error deleting assistant:', err);
          }
        });
    }
  }

  /**
   * Set active tab
   */
  setActiveTab(tab: string): void {
    this.activeTab = tab;
  }
  

  /**
   * Get model options for selected provider
   */
  getModelOptions(provider: string): string[] {
    return this.models[provider] || [];
  }

  getProviderDisplayName(provider: string): string {
    const displayNames: { [key: string]: string } = {
      'openai': 'OpenAI',
      '11labs': 'ElevenLabs',
      'deepgram': 'Deepgram'
    };
    return displayNames[provider] || provider;
  }

  /**
   * Get the selected voice object
   */
  getSelectedVoice(): Voice | undefined {
    return this.availableVoices.find(v => v.id === this.voiceId);
  }

  /**
   * Check if the selected voice has a preview URL
   */
  hasVoicePreview(): boolean {
    const selectedVoice = this.getSelectedVoice();
    return !!(selectedVoice?.preview_url);
  }

  /**
   * Get the preview URL for the selected voice
   */
  getSelectedVoicePreviewUrl(): string {
    const selectedVoice = this.getSelectedVoice();
    return selectedVoice?.preview_url || '';
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
   * Publish the assistant (save changes)
   */
  PublishAssistant(): void {
    if (this.isCreating) {
      // Create new assistant
      this.saveNewAssistant();
    } else if (this.selectedAssistant) {
      // Update existing assistant
      this.saveChanges();
    }
  }

  /**
   * Open web chat dialog for direct assistant communication
   */
  openChatDialog(assistant: Assistant): void {
    const dialogRef = this.dialog.open(AssistantChatComponent, {
      width: '600px',
      height: '700px',
      panelClass: 'dark-dialog',
      disableClose: false,
      data: { assistant: assistant }
    });

    dialogRef.afterClosed().subscribe(result => {
      // Chat dialog closed
    });
  }

  /**
   * Copy assistant ID to clipboard
   */
  copyAssistantId(): void {
    if (this.selectedAssistant?.id) {
      navigator.clipboard.writeText(this.selectedAssistant.id).then(() => {
        this.snackBar.open('Assistant ID copied to clipboard', 'Close', {
          duration: 2000,
          horizontalPosition: 'right',
          verticalPosition: 'top'
        });
      }).catch(err => {
        console.error('Failed to copy assistant ID: ', err);
        this.snackBar.open('Failed to copy assistant ID', 'Close', {
          duration: 2000,
          horizontalPosition: 'right',
          verticalPosition: 'top'
        });
      });
    }
  }

  /**
   * Open assistant in new tab
   */
  openAssistantInNewTab(): void {
    if (this.selectedAssistant?.id) {
      // Open assistants page in new tab with assistant ID as query parameter
      const baseUrl = window.location.origin;
      const newUrl = `${baseUrl}/assistants?assistant=${this.selectedAssistant.id}`;
      window.open(newUrl, '_blank');
    }
  }

  /**
   * Toggle code panel visibility
   */
  toggleCodePanel(): void {
    this.showCodePanel = !this.showCodePanel;
  }

  /**
   * Close code panel
   */
  closeCodePanel(): void {
    this.showCodePanel = false;
  }

  /**
   * Get current assistant configuration as JSON
   */
  getAssistantConfigJson(): string {
    if (this.isCreating && this.newAssistant) {
      return JSON.stringify(this.newAssistant, null, 2);
    } else if (this.selectedAssistant) {
      return JSON.stringify(this.selectedAssistant, null, 2);
    }
    return '{}';
  }

  /**
   * Copy assistant configuration JSON to clipboard
   */
  copyAssistantConfig(): void {
    const configJson = this.getAssistantConfigJson();
    navigator.clipboard.writeText(configJson).then(() => {
      this.snackBar.open('Configuration copied to clipboard', 'Close', {
        duration: 2000,
        horizontalPosition: 'right',
        verticalPosition: 'top'
      });
    }).catch(err => {
      console.error('Failed to copy configuration: ', err);
      this.snackBar.open('Failed to copy configuration', 'Close', {
        duration: 2000,
        horizontalPosition: 'right',
        verticalPosition: 'top'
      });
    });
  }
}