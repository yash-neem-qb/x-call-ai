import { Component, OnInit, OnDestroy, Input, Output, EventEmitter, ViewChild, ElementRef, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialogModule } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar } from '@angular/material/snack-bar';
import { HttpClient } from '@angular/common/http';
import { WebRTCAssistantService, ChatMessage, WebRTCState } from '../../../core/services/webrtc-assistant.service';
import { Assistant } from '../../../core/services/assistant.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-assistant-chat',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    MatButtonModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatDialogModule,
    MatTooltipModule
  ],
  templateUrl: './assistant-chat.component.html',
  styleUrls: ['./assistant-chat.component.scss']
})
export class AssistantChatComponent implements OnInit, OnDestroy {
  @Input() assistant: Assistant | null = null;
  @Output() closeChat = new EventEmitter<void>();

  @ViewChild('messageInput') messageInput!: ElementRef<HTMLInputElement>;
  @ViewChild('chatContainer') chatContainer!: ElementRef<HTMLDivElement>;

  private destroy$ = new Subject<void>();

  // Call state
  isRecording = false;
  isConnected = false;
  isConnecting = false;
  isInitializing = false; // New state for pipeline initialization
  error: string | null = null;
  isMuted = false; // Mute/unmute state
  callDuration: string = '00:00';
  showSuccessToast = false;

  // Audio recording
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private audioContext: AudioContext | null = null; // AudioContext for recording
  private playbackAudioContext: AudioContext | null = null; // Separate AudioContext for playback
  private audioStream: MediaStream | null = null;
  private isStreaming = false;
  
  // Audio queue system - prevents overlapping audio chunks
  // Each audio chunk is queued and played sequentially to avoid audio overlap
  private audioQueue: Array<{data: string, format: string}> = [];
  private isPlayingAudio = false;
  private currentAudioSource: AudioBufferSourceNode | null = null;
  
  // Call duration timer
  private callStartTime: Date | null = null;
  private durationInterval: any = null;
  
  // Call logging
  private currentCallId: string | null = null;
  
  // Chat messages
  chatMessages: ChatMessage[] = [];
  private currentAssistantMessage: ChatMessage | null = null;
  
  // Streaming text management
  private currentUserStreamingMessage: ChatMessage | null = null;
  private streamingTextBuffer: string = '';
  private streamingTimeout: any = null;
  

  constructor(
    private webrtcService: WebRTCAssistantService,
    private snackBar: MatSnackBar,
    private http: HttpClient,
    private authService: AuthService,
    @Inject(MAT_DIALOG_DATA) public data: { assistant: Assistant },
    private dialogRef: MatDialogRef<AssistantChatComponent>
  ) {
    this.assistant = data.assistant;
  }

  ngOnInit(): void {
    if (this.assistant) {
      this.connectToAssistant();
    }

    // Check browser audio capabilities
    this.checkAudioCapabilities();
    
    // Ensure chat scrolls to bottom after view init
    setTimeout(() => this.scrollToBottom(), 500);

    // Subscribe to WebRTC state changes
    this.webrtcService.state$.pipe(takeUntil(this.destroy$)).subscribe(state => {
      this.isConnected = state.connected;
      this.isConnecting = state.connecting;
      this.isInitializing = state.initializing;
      this.error = state.error;
      
           // Handle call duration timer
           if (state.connected && !this.callStartTime) {
             this.startCallTimer();
             this.showSuccessToast = true;
             setTimeout(() => this.showSuccessToast = false, 3000);
             // Log call start
             this.logCallStart();
           } else if (!state.connected && this.callStartTime) {
             this.stopCallTimer();
             // Log call end
             this.logCallEnd();
           }
      
      // Automatically start recording when connected
      if (state.connected && !this.isRecording) {
        this.startRecording();
      }
    });

    // Subscribe to incoming messages
    this.webrtcService.messages$.pipe(takeUntil(this.destroy$)).subscribe(message => {
      // Skip null or invalid messages
      if (!message || !message.type) {
        console.warn('Received invalid message:', message);
        return;
      }
      
      // Handle audio messages
      if (message.type === 'audio' && message.data) {
        this.playAudioResponse(message.data, message.format);
      }
      // Handle streaming text messages
      else if (message.type === 'user_streaming' && message.content) {
        this.handleUserStreamingText(message.content, message.isFinal || false);
      }
      else if (message.type === 'assistant_streaming' && message.content) {
        this.handleAssistantStreamingText(message.content, message.isFinal || false);
      }
      // Handle final text messages (user/assistant)
      else if (message.type === 'user' && message.content) {
        this.addUserMessage(message.content);
      }
      else if (message.type === 'assistant' && message.content) {
        this.addAssistantMessage(message.content);
      }
      // Handle system messages (like greetings)
      else if (message.type === 'system' && message.content) {
        this.addSystemMessage(message.content);
      }
      // Handle call end notification
      else if (message.type === 'call_ended') {
        this.handleCallEnded(message.reason, message.content);
      }
    });
  }

  /**
   * Handle call end notification
   */
  private handleCallEnded(reason: string, message: string): void {
    console.log('📞 Call ended:', reason, message);
    
    // Update call state
    this.isConnected = false;
    this.isConnecting = false;
    this.isInitializing = false;
    
    // Stop call duration timer
    if (this.durationInterval) {
      clearInterval(this.durationInterval);
      this.durationInterval = null;
    }
    
    // Add call ended message to chat
    this.addSystemMessage(`Call ended: ${message}`);
    
    // Show success toast
    this.showSuccessToast = true;
    setTimeout(() => {
      this.showSuccessToast = false;
    }, 3000);
    
    // Close the chat after a short delay
    setTimeout(() => {
      this.closeChat.emit();
    }, 2000);
  }

  /**
   * Check browser audio capabilities and log information
   */
  private checkAudioCapabilities(): void {
    // Check Web Audio API support
    if (!(window.AudioContext || (window as any).webkitAudioContext)) {
      console.error('❌ Web Audio API not supported');
      this.snackBar.open('Web Audio API not supported in this browser', 'Close', { duration: 5000 });
    }
    
    // Check MediaDevices API support
    if (!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)) {
      console.error('❌ MediaDevices API not supported');
      this.snackBar.open('MediaDevices API not supported in this browser', 'Close', { duration: 5000 });
    }
    
    // Check audio output devices
    if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
      navigator.mediaDevices.enumerateDevices().then(devices => {
        const audioOutputs = devices.filter(device => device.kind === 'audiooutput');
        if (audioOutputs.length === 0) {
          console.warn('⚠️ No audio output devices found');
          this.snackBar.open('No speakers/headphones detected', 'Close', { duration: 3000 });
        }
      });
    }
  }

  /**
   * Initialize audio contexts (separate contexts for recording and playback)
   */
  private async initializeAudioContexts(): Promise<void> {
    try {
      // Initialize recording audio context
      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
          sampleRate: 16000,
          latencyHint: 'interactive'
        });
        // Resume context if suspended
        if (this.audioContext.state === 'suspended') {
          await this.audioContext.resume();
        }
      }

      // Initialize playback audio context
      if (!this.playbackAudioContext) {
        this.playbackAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
          sampleRate: 44100, // Higher sample rate for better playback quality
          latencyHint: 'playback'
        });
        // Resume context if suspended
        if (this.playbackAudioContext.state === 'suspended') {
          await this.playbackAudioContext.resume();
        }
      }
    } catch (error) {
      console.error('Failed to initialize audio contexts:', error);
      this.snackBar.open('Failed to initialize audio. Please check your audio devices.', 'Close', { duration: 5000 });
    }
  }

  /**
   * Get available audio devices and help user select appropriate ones
   */
  private async getAudioDevices(): Promise<void> {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audioInputs = devices.filter(device => device.kind === 'audioinput');
        const audioOutputs = devices.filter(device => device.kind === 'audiooutput');
        
        // Audio devices enumerated successfully
        
        if (audioInputs.length === 0) {
          this.snackBar.open('No microphone found. Please connect a microphone.', 'Close', { duration: 5000 });
        }
        if (audioOutputs.length === 0) {
          this.snackBar.open('No speakers found. Please connect speakers or headphones.', 'Close', { duration: 5000 });
        }
      }
    } catch (error) {
      console.error('Error getting audio devices:', error);
    }
  }

  ngOnDestroy(): void {
    // Component destroying - performing comprehensive cleanup
    
    this.destroy$.next();
    this.destroy$.complete();
    this.stopRecording();
    this.stopCallTimer();
    this.webrtcService.disconnect();
    
    // Clear audio queue and stop any playing audio
    this.clearAudioQueue();
    
    // Comprehensive AudioContext cleanup
    this.cleanupAudioContexts();
    
    // Clear chat messages and conversation data
    this.chatMessages = [];
    this.currentAssistantMessage = null;
    this.currentUserStreamingMessage = null;
    
    // Clear streaming state
    this.streamingTextBuffer = '';
    if (this.streamingTimeout) {
      clearTimeout(this.streamingTimeout);
      this.streamingTimeout = null;
    }
    
    // Clear call state
    this.currentCallId = null;
    this.callStartTime = null;
    
    // Component cleanup completed
  }

  /**
   * Connect to assistant via WebRTC
   */
  private async connectToAssistant(): Promise<void> {
    if (!this.assistant) return;

    try {
      const success = await this.webrtcService.connectToAssistant(this.assistant.id);
      if (success) {
        // Connected to assistant via WebRTC
        this.snackBar.open('Connected to assistant', 'Close', { duration: 2000 });
      } else {
        console.error('Failed to connect to assistant');
        this.snackBar.open('Failed to connect to assistant', 'Close', { duration: 3000 });
      }
    } catch (error) {
      console.error('Error connecting to assistant:', error);
      this.snackBar.open('Failed to connect to assistant', 'Close', { duration: 3000 });
    }
  }


  /**
   * Start audio recording with real-time streaming
   */
  async startRecording(): Promise<void> {
    if (this.isRecording || !this.isConnected) return;

    try {
      // Check available audio devices first
      await this.getAudioDevices();
      
      // Initialize audio contexts - this will also resume them if suspended
      await this.initializeAudioContexts();
      
      // Ensure playback context is ready for audio output
      if (this.playbackAudioContext && this.playbackAudioContext.state === 'suspended') {
        // Resuming playback context for future audio
        await this.playbackAudioContext.resume();
      }
      
      this.audioStream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      
      // Send start event before recording
      this.webrtcService.sendTextMessage('start');
      
      // Start real-time audio streaming
      await this.startAudioStreaming();
      
      this.isRecording = true;

    } catch (error) {
      this.snackBar.open('Microphone access denied', 'Close', { duration: 3000 });
    }
  }

  /**
   * Start real-time audio streaming to WebSocket
   */
  private async startAudioStreaming(): Promise<void> {
    if (!this.audioStream || !this.audioContext) return;

    try {
      const source = this.audioContext.createMediaStreamSource(this.audioStream);
      const processor = this.audioContext.createScriptProcessor(4096, 1, 1);

      processor.onaudioprocess = (event) => {
        if (!this.isStreaming) return;

        // Check if muted - if so, don't send audio but keep processing
        if (this.isMuted) {
          // Audio chunk muted - not sending to assistant
          return;
        }

        const inputBuffer = event.inputBuffer;
        const inputData = inputBuffer.getChannelData(0);
        
        // Convert float32 to int16 PCM
        const pcmData = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          pcmData[i] = Math.max(-32768, Math.min(32767, inputData[i] * 32768));
        }

        // Process audio chunk

        // Convert to base64 and send
        const base64Audio = this.arrayBufferToBase64(pcmData.buffer);
        this.webrtcService.sendAudioChunk(base64Audio);
      };

      // Connect the audio graph properly
      source.connect(processor);
      processor.connect(this.audioContext.destination);
      
      this.isStreaming = true;
      // Audio streaming started

    } catch (error) {
      console.error('Error starting audio streaming:', error);
      this.snackBar.open('Failed to start audio streaming', 'Close', { duration: 3000 });
    }
  }

  /**
   * Convert ArrayBuffer to base64
   */
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }


  /**
   * Decode PCM 16-bit audio to Float32Array
   * PCM is the standard uncompressed audio format
   */
  private decodePCM16(pcmData: Uint8Array): Float32Array {
    const samples = new Float32Array(pcmData.length / 2);
    
    for (let i = 0; i < samples.length; i++) {
      // Combine two bytes into a 16-bit signed integer (little-endian)
      const sample = (pcmData[i * 2] | (pcmData[i * 2 + 1] << 8));
      // Convert to signed 16-bit
      const signedSample = sample > 32767 ? sample - 65536 : sample;
      // Convert to float range [-1, 1]
      samples[i] = signedSample / 32768.0;
    }
    
    return samples;
  }

  /**
   * Decode μ-law (mu-law) audio to PCM
   * μ-law is a compressed audio format used in telephony
   */
  private decodeULaw(ulawData: Uint8Array): Float32Array {
    const pcmData = new Float32Array(ulawData.length);
    
    // μ-law to linear PCM conversion table
    const ulawToLinear = new Int16Array([
      -32124, -31100, -30076, -29052, -28028, -27004, -25980, -24956,
      -23932, -22908, -21884, -20860, -19836, -18812, -17788, -16764,
      -15996, -15484, -14972, -14460, -13948, -13436, -12924, -12412,
      -11900, -11388, -10876, -10364, -9852, -9340, -8828, -8316,
      -7932, -7676, -7420, -7164, -6908, -6652, -6396, -6140,
      -5884, -5628, -5372, -5116, -4860, -4604, -4348, -4092,
      -3900, -3772, -3644, -3516, -3388, -3260, -3132, -3004,
      -2876, -2748, -2620, -2492, -2364, -2236, -2108, -1980,
      -1884, -1820, -1756, -1692, -1628, -1564, -1500, -1436,
      -1372, -1308, -1244, -1180, -1116, -1052, -988, -924,
      -876, -844, -812, -780, -748, -716, -684, -652,
      -620, -588, -556, -524, -492, -460, -428, -396,
      -372, -356, -340, -324, -308, -292, -276, -260,
      -244, -228, -212, -196, -180, -164, -148, -132,
      -120, -112, -104, -96, -88, -80, -72, -64,
      -56, -48, -40, -32, -24, -16, -8, 0,
      32124, 31100, 30076, 29052, 28028, 27004, 25980, 24956,
      23932, 22908, 21884, 20860, 19836, 18812, 17788, 16764,
      15996, 15484, 14972, 14460, 13948, 13436, 12924, 12412,
      11900, 11388, 10876, 10364, 9852, 9340, 8828, 8316,
      7932, 7676, 7420, 7164, 6908, 6652, 6396, 6140,
      5884, 5628, 5372, 5116, 4860, 4604, 4348, 4092,
      3900, 3772, 3644, 3516, 3388, 3260, 3132, 3004,
      2876, 2748, 2620, 2492, 2364, 2236, 2108, 1980,
      1884, 1820, 1756, 1692, 1628, 1564, 1500, 1436,
      1372, 1308, 1244, 1180, 1116, 1052, 988, 924,
      876, 844, 812, 780, 748, 716, 684, 652,
      620, 588, 556, 524, 492, 460, 428, 396,
      372, 356, 340, 324, 308, 292, 276, 260,
      244, 228, 212, 196, 180, 164, 148, 132,
      120, 112, 104, 96, 88, 80, 72, 64,
      56, 48, 40, 32, 24, 16, 8, 0
    ]);
    
    for (let i = 0; i < ulawData.length; i++) {
      pcmData[i] = ulawToLinear[ulawData[i]] / 32768.0; // Convert to float range [-1, 1]
    }
    
    return pcmData;
  }

  /**
   * Stop audio recording
   */
  stopRecording(): void {
    if (this.isRecording) {
      this.isStreaming = false;
      this.isRecording = false;
      
      // Stop audio stream
      if (this.audioStream) {
        this.audioStream.getTracks().forEach(track => track.stop());
        this.audioStream = null;
      }
      
      // Note: Don't close audio context here as it's used for playback too
      
      // Send stop event after recording
      this.webrtcService.sendTextMessage('stop');
    }
  }

  /**
   * Toggle recording
   */
  toggleRecording(): void {
    if (this.isRecording) {
      this.stopRecording();
    } else {
      this.startRecording();
    }
  }

  /**
   * Toggle mute/unmute (keeps WebSocket connected)
   */
  toggleMute(): void {
    this.isMuted = !this.isMuted;
    
    if (this.isMuted) {
      // Microphone muted - WebSocket stays connected
      this.snackBar.open('Microphone muted', 'Close', { duration: 1500 });
    } else {
      // Microphone unmuted - WebSocket stays connected
      this.snackBar.open('Microphone unmuted', 'Close', { duration: 1500 });
    }
  }



  /**
   * Play audio response from assistant (queued)
   */
  private async playAudioResponse(base64Audio: string, format: string = 'pcm_16000'): Promise<void> {
    // Validate audio data
    if (!base64Audio || base64Audio.length === 0) {
      console.warn('🎵 Empty audio data received, skipping');
      return;
    }

    // Add audio to queue
    this.audioQueue.push({ data: base64Audio, format });
    // Audio chunk queued
    
    // Start processing queue if not already playing
    if (!this.isPlayingAudio) {
      this.processAudioQueue();
    }
  }

  /**
   * Process audio queue sequentially
   */
  private async processAudioQueue(): Promise<void> {
    if (this.audioQueue.length === 0) {
      this.isPlayingAudio = false;
      return;
    }

    this.isPlayingAudio = true;
    const audioItem = this.audioQueue.shift();
    
    if (!audioItem) {
      this.isPlayingAudio = false;
      return;
    }

    try {
      // Playing audio chunk
      
      // Play audio and wait for it to complete
      await this.playAudioWithWebAudio(audioItem.data, audioItem.format);
      
      // Audio finished, process next item in queue
      this.processAudioQueue();
      
    } catch (error) {
      console.error('🎵 Web Audio playback failed, trying fallback:', error);
      try {
        await this.playAudioWithFallback(audioItem.data, audioItem.format);
        // Fallback finished, process next item
        this.processAudioQueue();
      } catch (fallbackError) {
        console.error('🎵 Fallback audio also failed:', fallbackError);
        // Continue to next audio even if this one failed
        this.processAudioQueue();
      }
    }
  }

  /**
   * Clear audio queue and stop any currently playing audio
   */
  private clearAudioQueue(): void {
    // Clearing audio queue and stopping playback
    
    // Stop any currently playing audio
    if (this.currentAudioSource) {
      try {
        this.currentAudioSource.stop();
        this.currentAudioSource.disconnect();
      } catch (e) {
        // Audio source might already be stopped
        console.warn('Audio source already stopped or error stopping:', e);
      }
      this.currentAudioSource = null;
    }
    
    // Clear the queue
    this.audioQueue = [];
    this.isPlayingAudio = false;
    
    // Clear any audio chunks from recording
    this.audioChunks = [];
    
    // Stop any ongoing recording
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      try {
        this.mediaRecorder.stop();
      } catch (e) {
        console.warn('Error stopping media recorder:', e);
      }
    }
    
    // Stop audio stream tracks
    if (this.audioStream) {
      this.audioStream.getTracks().forEach(track => {
        track.stop();
        // Audio track stopped
      });
      this.audioStream = null;
    }
    
    // Clear any pending audio processing
    this.isStreaming = false;
    
    // Audio queue and streams cleared completely
  }

  /**
   * Get current audio queue status (for debugging)
   */
  getAudioQueueStatus(): { queueLength: number, isPlaying: boolean } {
    return {
      queueLength: this.audioQueue.length,
      isPlaying: this.isPlayingAudio
    };
  }

  /**
   * Comprehensive AudioContext cleanup
   */
  private cleanupAudioContexts(): void {
    // Cleaning up AudioContexts
    
    // Close recording AudioContext
    if (this.audioContext) {
      try {
        if (this.audioContext.state !== 'closed') {
          this.audioContext.close();
          // Recording AudioContext closed
        }
      } catch (e) {
        console.warn('Error closing recording AudioContext:', e);
      }
      this.audioContext = null;
    }
    
    // Close playback AudioContext
    if (this.playbackAudioContext) {
      try {
        if (this.playbackAudioContext.state !== 'closed') {
          this.playbackAudioContext.close();
          // Playback AudioContext closed
        }
      } catch (e) {
        console.warn('Error closing playback AudioContext:', e);
      }
      this.playbackAudioContext = null;
    }
    
    // Clear any remaining audio buffers
    this.audioQueue = [];
    this.audioChunks = [];
    
    // AudioContext cleanup completed
  }

  private async playAudioWithWebAudio(base64Audio: string, format: string): Promise<void> {
    return new Promise(async (resolve, reject) => {
      try {
    // Ensure playback audio context is properly initialized
    if (!this.playbackAudioContext) {
      await this.initializeAudioContexts();
    }

    // Always resume playback context before playing audio
    if (this.playbackAudioContext && this.playbackAudioContext.state === 'suspended') {
      await this.playbackAudioContext.resume();
    }

        // Stop any currently playing audio
        if (this.currentAudioSource) {
          try {
            this.currentAudioSource.stop();
          } catch (e) {
            // Audio source might already be stopped
          }
          this.currentAudioSource = null;
        }

      // Decode base64 to bytes
      const audioData = atob(base64Audio);
      const audioBytes = new Uint8Array(audioData.length);
      for (let i = 0; i < audioData.length; i++) {
        audioBytes[i] = audioData.charCodeAt(i);
      }
      
      let pcmData: Float32Array;
      let sampleRate: number;
      
      if (format === 'pcm_16000') {
        // Handle PCM 16kHz format (browser-friendly)
        pcmData = this.decodePCM16(audioBytes);
        sampleRate = 16000;
      } else if (format === 'ulaw_8000') {
        // Handle μ-law 8kHz format (legacy/Twilio)
        pcmData = this.decodeULaw(audioBytes);
        sampleRate = 8000;
      } else {
        throw new Error(`Unsupported audio format: ${format}`);
      }
      
      // Create audio buffer using playback audio context
      const audioBuffer = this.playbackAudioContext.createBuffer(1, pcmData.length, sampleRate);
      const channelData = audioBuffer.getChannelData(0);
      channelData.set(pcmData);
      
      // Play the audio with proper gain control using playback audio context
      const source = this.playbackAudioContext.createBufferSource();
      const gainNode = this.playbackAudioContext.createGain();
      
      // Set volume to maximum (1.0)
      gainNode.gain.setValueAtTime(1.0, this.playbackAudioContext.currentTime);
      
      // Connect audio graph: source -> gain -> destination
      source.buffer = audioBuffer;
      source.connect(gainNode);
      gainNode.connect(this.playbackAudioContext.destination);
        
        // Store current audio source for potential stopping
        this.currentAudioSource = source;
        
        // Set up event handlers
        source.onended = () => {
          // Audio chunk finished playing
          this.currentAudioSource = null;
          resolve(); // Resolve promise when audio finishes
        };
      
      // Start playback immediately
      source.start(0);

      } catch (error) {
        console.error('🎵 Error in playAudioWithWebAudio:', error);
        this.currentAudioSource = null;
        reject(error);
      }
    });
  }

  private async playAudioWithFallback(base64Audio: string, format: string): Promise<void> {
    try {
      // Using fallback audio playback method
      
      // Create a simple audio context for fallback
      const fallbackContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      if (fallbackContext.state === 'suspended') {
        await fallbackContext.resume();
      }
      
      // For fallback, we'll create a simple beep to indicate audio is working
      const oscillator = fallbackContext.createOscillator();
      const gainNode = fallbackContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(fallbackContext.destination);
      
      oscillator.frequency.setValueAtTime(800, fallbackContext.currentTime);
      gainNode.gain.setValueAtTime(0.1, fallbackContext.currentTime);
      
      oscillator.start();
      oscillator.stop(fallbackContext.currentTime + 0.2);
      
      // Fallback audio played (beep)
      
    } catch (error) {
      console.error('🎵 Fallback audio also failed:', error);
      this.snackBar.open('Audio playback not available', 'Close', { duration: 2000 });
    }
  }


  /**
   * Start call duration timer
   */
  private startCallTimer(): void {
    this.callStartTime = new Date();
    this.durationInterval = setInterval(() => {
      if (this.callStartTime) {
        const now = new Date();
        const duration = Math.floor((now.getTime() - this.callStartTime.getTime()) / 1000);
        const minutes = Math.floor(duration / 60);
        const seconds = duration % 60;
        this.callDuration = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      }
    }, 1000);
  }

  /**
   * Stop call duration timer
   */
  private stopCallTimer(): void {
    if (this.durationInterval) {
      clearInterval(this.durationInterval);
      this.durationInterval = null;
    }
    this.callStartTime = null;
    this.callDuration = '00:00';
  }

  /**
   * Hang up the call with comprehensive cleanup
   */
  hangup(): void {
    // Hanging up call with comprehensive cleanup
    
    // Clear audio queue and stop any playing audio
    this.clearAudioQueue();
    
    // Stop recording if active
    this.stopRecording();
    
    // Disconnect WebRTC
    this.webrtcService.disconnect();
    
    // Stop call timer
    this.stopCallTimer();
    
    // Clear conversation data
    this.chatMessages = [];
    this.currentAssistantMessage = null;
    
    // Clear call state
    this.currentCallId = null;
    this.callStartTime = null;
    
    // Close dialog
    this.dialogRef.close();
    
    // Call hung up with full cleanup
  }

  /**
   * Log call start
   */
  private logCallStart(): void {
    if (!this.assistant) return;

    // Get organization ID from auth service
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser?.organization_id) {
      console.error('No organization ID found for current user');
      return;
    }

    const callData = {
      organizationId: currentUser.organization_id,
      assistantId: this.assistant.id,
      direction: 'web',
      status: 'initiated',
      sessionId: this.generateSessionId(),
      startedAt: new Date().toISOString()
    };
  }

  /**
     * Log call end
   */
  private logCallEnd(): void {
    if (!this.currentCallId || !this.callStartTime) return;

    const durationSeconds = Math.floor((new Date().getTime() - this.callStartTime.getTime()) / 1000);
    const endData = {
      status: this.isConnected ? 'completed' : 'failed',
      endedAt: new Date().toISOString(),
      durationSeconds: durationSeconds,
      costUsd: this.calculateCallCost(durationSeconds)
    };

    this.http.put(`/api/call-logs/${this.currentCallId}`, endData).subscribe({
      next: (response: any) => {
        // Call end logged successfully
        this.currentCallId = null;
      },
      error: (error) => {
        console.error('Failed to log call end:', error);
      }
    });
  }

  /**
   * Generate session ID
   */
  private generateSessionId(): string {
    return 'session_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }

  /**
   * Calculate call cost
   */
  private calculateCallCost(durationSeconds: number): number {
    // TODO: Implement actual cost calculation based on service provider
    console.warn('Call cost calculation not implemented');
    return 0;
  }

  /**
   * Chat message handling methods
   */
  /**
   * Handle streaming user text (from STT)
   */
  private handleUserStreamingText(text: string, isFinal: boolean): void {
    if (isFinal) {
      // Final text - finalize the streaming message or create new one
      if (this.currentUserStreamingMessage) {
        this.currentUserStreamingMessage.content = text;
        this.currentUserStreamingMessage.isStreaming = false;
        this.currentUserStreamingMessage = null;
      } else {
        // Create final message if no streaming message exists
        this.addUserMessage(text);
      }
      this.streamingTextBuffer = '';
    } else {
      // Interim text - update or create streaming message
      if (!this.currentUserStreamingMessage) {
        this.currentUserStreamingMessage = {
          type: 'user',
          content: text,
          timestamp: new Date(),
          id: this.generateMessageId(),
          isStreaming: true
        };
        this.chatMessages.push(this.currentUserStreamingMessage);
        this.sortMessagesByTimestamp();
      } else {
        // Update existing streaming message content
        this.currentUserStreamingMessage.content = text;
      }
      this.scrollToBottom();
    }
  }

  addUserMessage(content: string): void {
    const message: ChatMessage = {
      type: 'user',
      content: content,
      timestamp: new Date(),
      id: this.generateMessageId()
    };
    this.chatMessages.push(message);
    this.sortMessagesByTimestamp();
    this.scrollToBottom();
  }

  /**
   * Handle streaming assistant text (from TTS/LLM)
   */
  private handleAssistantStreamingText(text: string, isFinal: boolean): void {
    if (isFinal) {
      // Final text - finalize the streaming message or create new one
      if (this.currentAssistantMessage) {
        this.currentAssistantMessage.content = text;
        this.currentAssistantMessage.isStreaming = false;
        this.currentAssistantMessage = null;
      } else {
        // Create final message if no streaming message exists
        this.addAssistantMessage(text);
      }
    } else {
      // Streaming text - update or create streaming message
      if (!this.currentAssistantMessage) {
        this.currentAssistantMessage = {
          type: 'assistant',
          content: text,
          timestamp: new Date(),
          id: this.generateMessageId(),
          isStreaming: true
        };
        this.chatMessages.push(this.currentAssistantMessage);
        this.sortMessagesByTimestamp();
      } else {
        // Update existing streaming message content
        this.currentAssistantMessage.content = text;
      }
      this.scrollToBottom();
    }
  }

  addAssistantMessage(content: string, isStreaming: boolean = false): void {
    // Always create a new message to prevent overwriting issues
    const message: ChatMessage = {
      type: 'assistant',
      content: content,
      timestamp: new Date(),
      id: this.generateMessageId(),
      isStreaming: isStreaming
    };
    
    this.chatMessages.push(message);
    
    // Only set as current if it's a streaming message
    if (isStreaming) {
      this.currentAssistantMessage = message;
    }
    
    this.sortMessagesByTimestamp();
    this.scrollToBottom();
  }

  addSystemMessage(content: string): void {
    const message: ChatMessage = {
      type: 'system',
      content: content,
      timestamp: new Date(),
      id: this.generateMessageId()
    };
    this.chatMessages.push(message);
    this.sortMessagesByTimestamp();
    this.scrollToBottom();
  }

  finalizeAssistantMessage(): void {
    if (this.currentAssistantMessage) {
      this.currentAssistantMessage.isStreaming = false;
      this.currentAssistantMessage = null;
    }
  }

  private generateMessageId(): string {
    return 'msg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
  }

  trackByMessageId(index: number, message: ChatMessage): string {
    return message.id || index.toString();
  }

  /**
   * Sort messages by timestamp to ensure correct chronological order
   */
  private sortMessagesByTimestamp(): void {
    this.chatMessages.sort((a, b) => {
      return a.timestamp.getTime() - b.timestamp.getTime();
    });
  }

  formatTime(timestamp: Date): string {
    return timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  getCurrentTime(): string {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  private scrollToBottom(): void {
    setTimeout(() => {
      if (this.chatContainer) {
        const element = this.chatContainer.nativeElement;
        element.scrollTop = element.scrollHeight;
      }
    }, 50);
    
    // Also try after a longer delay to ensure DOM is fully updated
    setTimeout(() => {
      if (this.chatContainer) {
        const element = this.chatContainer.nativeElement;
        element.scrollTop = element.scrollHeight;
      }
    }, 200);
  }

  endCall(): void {
    // Ending call with comprehensive cleanup
    
    // Clear audio queue and stop any playing audio
    this.clearAudioQueue();
    
    // Stop recording if active
    this.stopRecording();
    
    // Disconnect WebRTC
    this.webrtcService.disconnect();
    
    // Stop call timer
    this.stopCallTimer();
    
    // Clear conversation data
    this.chatMessages = [];
    this.currentAssistantMessage = null;
    
    // Clear call state
    this.currentCallId = null;
    this.callStartTime = null;
    
    // Close dialog
    this.dialogRef.close();
    
    // Call ended with full cleanup
  }
}
