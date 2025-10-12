import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

export interface WebRTCState {
  connected: boolean;
  connecting: boolean;
  error: string | null;
  iceConnectionState: string;
  signalingState: string;
}

export interface ChatMessage {
  type: 'audio' | 'text' | 'system' | 'error' | 'user' | 'assistant' | 'user_streaming' | 'assistant_streaming';
  content?: string;
  data?: string;
  format?: string;
  message?: string;
  timestamp: Date;
  id?: string;
  isStreaming?: boolean;
  isTyping?: boolean;
  isFinal?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class WebRTCAssistantService {
  private pc: RTCPeerConnection | null = null;
  private ws: WebSocket | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  
  private stateSubject = new BehaviorSubject<WebRTCState>({
    connected: false,
    connecting: false,
    error: null,
    iceConnectionState: 'new',
    signalingState: 'stable'
  });
  
  private messageSubject = new BehaviorSubject<ChatMessage | null>(null);

  public state$ = this.stateSubject.asObservable();
  public messages$ = this.messageSubject.asObservable();

  constructor(private authService: AuthService) {}

  /**
   * Connect to assistant using WebRTC (simplified approach)
   */
  async connectToAssistant(assistantId: string): Promise<boolean> {
    try {
      this.updateState({ connected: false, connecting: true, error: null });
      
      // Get user media for microphone access
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      // Connect to signaling server (no actual WebRTC peer connection needed)
      await this.connectSignalingServer(assistantId);
      
      // Mark as connected since we have the stream and WebSocket
      this.updateState({ 
        connected: true, 
        connecting: false, 
        error: null,
        iceConnectionState: 'connected',
        signalingState: 'stable'
      });
      
      return true;
    } catch (error) {
      console.error('❌ Failed to connect to assistant:', error);
      this.updateState({ 
        connected: false, 
        connecting: false, 
        error: `Connection failed: ${error.message}` 
      });
      return false;
    }
  }

  /**
   * Connect to WebRTC signaling server (simplified)
   */
  private async connectSignalingServer(assistantId: string): Promise<void> {
    const organizationId = this.getOrganizationId();
    if (!organizationId) {
      throw new Error('Organization ID not available');
    }

    const wsUrl = `${environment.wsBaseUrl}/api/v1/webrtc/signaling/${assistantId}?organization_id=${organizationId}`;
    
    this.ws = new WebSocket(wsUrl);
    
    this.ws.onopen = () => {
      // Send a simple ready message instead of WebRTC handshake
      this.ws!.send(JSON.stringify({
        type: 'ready'
      }));
    };

    this.ws.onmessage = async (event) => {
      const data = JSON.parse(event.data);
      await this.handleSignalingMessage(data);
    };

    this.ws.onclose = () => {
      this.updateState({ connected: false, connecting: false, error: 'Signaling server disconnected' });
    };

    this.ws.onerror = (error) => {
      console.error('📡 Signaling server error:', error);
      this.updateState({ connected: false, connecting: false, error: 'Signaling server error' });
    };
  }

  /**
   * Handle signaling messages from server (simplified)
   */
  private async handleSignalingMessage(data: any): Promise<void> {
    try {
      switch (data.type) {
        case 'audio':
          // Handle audio data from assistant
          this.messageSubject.next({
            type: 'audio',
            data: data.data,
            format: data.format || 'pcm_16000',
            timestamp: new Date()
          });
          break;
          
        case 'greeting':
          // Handle greeting message
          this.messageSubject.next({
            type: 'system',
            content: data.message || 'Assistant is ready!',
            timestamp: new Date()
          });
          break;
          
        case 'text':
          // Handle text messages (user/assistant messages)
          this.messageSubject.next({
            type: data.messageType || 'text',
            content: data.content,
            timestamp: new Date(),
            isFinal: data.isFinal || false
          });
          break;
          
        case 'error':
          console.error('❌ Server error:', data.message);
          this.updateState({ connected: false, connecting: false, error: data.message });
          break;
          
        default:
          console.log('📡 Unknown signaling message:', data.type);
      }
    } catch (error) {
      console.error('❌ Error handling signaling message:', error);
    }
  }

  // Remote audio handling removed - using direct audio data instead

  /**
   * Send audio data to assistant
   */
  sendAudioChunk(audioData: string): boolean {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return false;
    }

    try {
      this.ws.send(JSON.stringify({
        type: 'audio',
        data: audioData
      }));
      return true;
    } catch (error) {
      console.error('❌ Error sending audio:', error);
      return false;
    }
  }

  /**
   * Send text message to assistant
   */
  sendTextMessage(text: string): boolean {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return false;
    }

    try {
      this.ws.send(JSON.stringify({
        type: 'text',
        content: text
      }));
      return true;
    } catch (error) {
      console.error('❌ Error sending text:', error);
      return false;
    }
  }

  /**
   * Disconnect from assistant and clear all audio resources
   */
  disconnect(): void {
    console.log('🔌 WebRTC disconnecting - clearing all audio resources');
    
    // Close WebSocket connection
    if (this.ws) {
      this.ws.close();
      this.ws = null;
      console.log('🔌 WebSocket connection closed');
    }
    
    // Stop and clear local stream
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        track.stop();
        console.log('🔌 Audio track stopped:', track.kind);
      });
      this.localStream = null;
    }
    
    // Close RTCPeerConnection
    if (this.pc) {
      this.pc.close();
      this.pc = null;
      console.log('🔌 RTCPeerConnection closed');
    }
    
    // Clear any pending audio data or buffers
    // Note: This service doesn't handle audio playback directly,
    // but we ensure all media streams are properly stopped
    
    this.updateState({ 
      connected: false, 
      connecting: false, 
      error: null,
      iceConnectionState: 'closed',
      signalingState: 'closed'
    });
    
    console.log('🔌 WebRTC disconnect completed with full audio cleanup');
  }

  /**
   * Get organization ID from auth service
   */
  private getOrganizationId(): string | null {
    const user = this.authService.getCurrentUser();
    return user?.organization_id || null;
  }

  /**
   * Update connection state
   */
  private updateState(updates: Partial<WebRTCState>): void {
    const currentState = this.stateSubject.value;
    this.stateSubject.next({ ...currentState, ...updates });
  }

  /**
   * Get current state
   */
  getCurrentState(): WebRTCState {
    return this.stateSubject.value;
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.stateSubject.value.connected;
  }
}
