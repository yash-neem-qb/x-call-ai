import { Injectable } from '@angular/core';
import { Observable, Subject, BehaviorSubject } from 'rxjs';
import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';

export interface ChatMessage {
  type: 'greeting' | 'audio' | 'response' | 'error' | 'pong' | 'user' | 'system';
  content?: string;
  data?: string; // For audio data
  format?: string; // For audio format information
  message?: string; // For error messages
  timestamp: Date;
}

export interface WebSocketState {
  connected: boolean;
  connecting: boolean;
  error: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class AssistantChatService {
  private ws: WebSocket | null = null;
  private messageSubject = new Subject<ChatMessage>();
  private stateSubject = new BehaviorSubject<WebSocketState>({
    connected: false,
    connecting: false,
    error: null
  });

  public messages$ = this.messageSubject.asObservable();
  public state$ = this.stateSubject.asObservable();

  constructor(private authService: AuthService) {}

  /**
   * Connect to assistant WebSocket
   */
  connectToAssistant(assistantId: string): Observable<boolean> {
    return new Observable(observer => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.disconnect();
      }

      const organizationId = this.getOrganizationId();
      if (!organizationId) {
        this.updateState({ connected: false, connecting: false, error: 'Organization ID not available' });
        observer.error('Organization ID not available');
        return;
      }

      const wsUrl = `${environment.wsBaseUrl}/api/v1/websocket/assistant-chat/${assistantId}?organization_id=${organizationId}`;
      
      this.updateState({ connected: false, connecting: true, error: null });

      try {
        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = (event) => {
          this.updateState({ connected: true, connecting: false, error: null });
          observer.next(true);
          observer.complete();
        };

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            
            // Handle audio messages with format information
            if (data.event === 'audio' && data.data) {
              const message: ChatMessage = {
                type: 'audio',
                data: data.data,
                format: data.format || 'pcm_16000', // Default to browser-friendly format
                timestamp: new Date()
              };
              this.messageSubject.next(message);
            } else if (data.event === 'media' && data.media && data.media.payload) {
              // Legacy Twilio-compatible format
              const message: ChatMessage = {
                type: 'audio',
                data: data.media.payload,
                format: 'ulaw_8000', // Legacy μ-law format
                timestamp: new Date()
              };
              this.messageSubject.next(message);
            } else if (data.event === 'start') {
              const message: ChatMessage = {
                type: 'system',
                content: 'Audio stream started',
                timestamp: new Date()
              };
              this.messageSubject.next(message);
            } else if (data.event === 'stop') {
              const message: ChatMessage = {
                type: 'system',
                content: 'Audio stream ended',
                timestamp: new Date()
              };
              this.messageSubject.next(message);
            } else {
              // Handle other message types (greeting, response, error, etc.)
              const message: ChatMessage = {
                type: data.type || 'system',
                content: data.content,
                data: data.data,
                message: data.message,
                timestamp: new Date()
              };
              this.messageSubject.next(message);
            }
          } catch (error) {
            this.messageSubject.next({
              type: 'error',
              content: 'Error parsing message',
              timestamp: new Date()
            });
          }
        };

        this.ws.onclose = (event) => {
          this.updateState({ connected: false, connecting: false, error: null });
          this.messageSubject.next({
            type: 'system',
            content: 'Connection closed',
            timestamp: new Date()
          });
        };

        this.ws.onerror = (error) => {
          this.updateState({ connected: false, connecting: false, error: 'Connection error' });
          this.messageSubject.next({
            type: 'error',
            content: 'Connection error occurred',
            timestamp: new Date()
          });
          observer.error(error);
        };

      } catch (error) {
        this.updateState({ connected: false, connecting: false, error: 'Failed to create connection' });
        observer.error(error);
      }
    });
  }

  /**
   * Send text message to assistant
   */
  sendTextMessage(content: string): boolean {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return false;
    }

    try {
      this.ws.send(JSON.stringify({
        type: 'text',
        content: content
      }));

      // Add user message to chat
      this.messageSubject.next({
        type: 'user',
        content: content,
        timestamp: new Date()
      });

      return true;
    } catch (error) {
      this.messageSubject.next({
        type: 'error',
        content: 'Failed to send message',
        timestamp: new Date()
      });
      return false;
    }
  }

  /**
   * Send start event to begin audio stream
   */
  sendStartEvent(): boolean {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return false;
    }

    try {
      this.ws.send(JSON.stringify({
        event: 'start',
        start: {
          streamSid: 'web-stream-' + Date.now(),
          callSid: 'web-call-' + Date.now()
        }
      }));
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Send audio chunk to assistant in real-time streaming format
   */
  sendAudioChunk(base64Audio: string): boolean {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.log('🎤 WebSocket not open, cannot send audio chunk');
      return false;
    }

    try {
      // Send in Twilio-compatible format for real-time streaming
      const message = {
        event: 'media',
        media: {
          payload: base64Audio
        }
      };
      
      this.ws.send(JSON.stringify(message));
      console.log('🎤 Audio chunk sent to WebSocket:', base64Audio.length, 'chars');
      return true;
    } catch (error) {
      console.error('🎤 Error sending audio chunk:', error);
      this.messageSubject.next({
        type: 'error',
        content: 'Failed to send audio chunk',
        timestamp: new Date()
      });
      return false;
    }
  }

  /**
   * Send audio message to assistant in Twilio-compatible format (legacy method)
   */
  sendAudioMessage(audioBlob: Blob): Promise<boolean> {
    return new Promise((resolve) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        resolve(false);
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        try {
          const base64Audio = (reader.result as string).split(',')[1];
          
          // Send in Twilio-compatible format
          this.ws!.send(JSON.stringify({
            event: 'media',
            streamSid: 'web-stream-' + Date.now(),
            media: {
              payload: base64Audio
            }
          }));

          resolve(true);
        } catch (error) {
          this.messageSubject.next({
            type: 'error',
            content: 'Failed to send audio',
            timestamp: new Date()
          });
          resolve(false);
        }
      };

      reader.onerror = () => {
        this.messageSubject.next({
          type: 'error',
          content: 'Failed to process audio',
          timestamp: new Date()
        });
        resolve(false);
      };

      reader.readAsDataURL(audioBlob);
    });
  }

  /**
   * Send stop event to end audio stream
   */
  sendStopEvent(): boolean {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return false;
    }

    try {
      this.ws.send(JSON.stringify({
        event: 'stop',
        streamSid: 'web-stream-' + Date.now()
      }));
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Ping the server
   */
  ping(): boolean {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return false;
    }

    try {
      this.ws.send(JSON.stringify({ type: 'ping' }));
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * End the chat session
   */
  endChat(): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify({ type: 'end' }));
      } catch (error) {
        // Error sending end message
      }
    }
    this.disconnect();
  }

  /**
   * Disconnect from WebSocket
   */
  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.updateState({ connected: false, connecting: false, error: null });
  }

  /**
   * Get current connection state
   */
  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  /**
   * Get organization ID from auth service
   */
  private getOrganizationId(): string | null {
    const user = this.authService.getCurrentUser();
    return user?.organization_id || null;
  }

  /**
   * Update WebSocket state
   */
  private updateState(state: Partial<WebSocketState>): void {
    const currentState = this.stateSubject.value;
    this.stateSubject.next({ ...currentState, ...state });
  }
}
