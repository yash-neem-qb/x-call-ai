import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

export interface Voice {
  id: string;
  name: string;
  provider: string;
  gender?: string;
  accent?: string;
  language?: string;
  description?: string;
  preview_url?: string;
  metadata?: any;
}

export interface VoiceListResponse {
  voices: Voice[];
  provider: string;
  total: number;
}

export interface VoiceProvidersResponse {
  providers: string[];
  total: number;
}

export interface VoiceProvider {
  id: string;
  name: string;
  description: string;
  website: string;
  logo_url: string;
  supported_languages: string[];
}

export interface VoiceCreate {
  name: string;
  provider: string;
  voice_id: string;
  gender: 'male' | 'female' | 'neutral';
  language: string;
  accent?: string;
  audio_file?: File;
}

export interface VoiceUpdate {
  name?: string;
  provider?: string;
  voice_id?: string;
  gender?: 'male' | 'female' | 'neutral';
  language?: string;
  accent?: string;
}

@Injectable({
  providedIn: 'root'
})
export class VoiceService {
  private readonly API_URL = environment.apiUrl;
  private cachedVoices: Map<string, Voice[]> = new Map();

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  /**
   * Get voices from a specific provider
   */
  getVoices(provider: string = 'elevenlabs', pageSize: number = 100): Observable<VoiceListResponse> {
    // Check cache first
    const cacheKey = `${provider}_${pageSize}`;
    if (this.cachedVoices.has(cacheKey)) {
      const cachedVoices = this.cachedVoices.get(cacheKey)!;
      return of({
        voices: cachedVoices,
        provider: provider,
        total: cachedVoices.length
      });
    }

    // Make API call to backend
    const url = `${this.API_URL}/voices?provider=${provider}&page_size=${pageSize}`;
    return this.http.get<VoiceListResponse>(url);
  }

  /**
   * Get supported voice providers
   */
  getSupportedProviders(): Observable<VoiceProvidersResponse> {
    return this.http.get<VoiceProvidersResponse>(`${this.API_URL}/voices/providers`);
  }

  /**
   * Get voices by provider with caching
   */
  getVoicesByProvider(provider: string, pageSize: number = 100): Observable<Voice[]> {
    return new Observable(observer => {
      this.getVoices(provider, pageSize).subscribe({
        next: (response) => {
          // Cache the results
          const cacheKey = `${provider}_${pageSize}`;
          this.cachedVoices.set(cacheKey, response.voices);
          observer.next(response.voices);
          observer.complete();
        },
        error: (error) => {
          observer.error(error);
        }
      });
    });
  }

  /**
   * Get all available accents from cached voices
   */
  getAvailableAccents(provider: string = 'elevenlabs'): string[] {
    const cacheKey = `${provider}_100`;
    const voices = this.cachedVoices.get(cacheKey) || [];
    const accents = new Set(voices.map(voice => voice.accent).filter(accent => accent));
    return Array.from(accents).sort();
  }

  /**
   * Get all available genders from cached voices
   */
  getAvailableGenders(provider: string = 'elevenlabs'): string[] {
    const cacheKey = `${provider}_100`;
    const voices = this.cachedVoices.get(cacheKey) || [];
    const genders = new Set(voices.map(voice => voice.gender).filter(gender => gender));
    return Array.from(genders).sort();
  }

  /**
   * Filter voices by accent
   */
  getVoicesByAccent(provider: string, accent: string): Observable<Voice[]> {
    return new Observable(observer => {
      this.getVoicesByProvider(provider).subscribe({
        next: (voices) => {
          const filteredVoices = voices.filter(voice => voice.accent === accent);
          observer.next(filteredVoices);
          observer.complete();
        },
        error: (error) => {
          observer.error(error);
        }
      });
    });
  }

  /**
   * Filter voices by gender
   */
  getVoicesByGender(provider: string, gender: string): Observable<Voice[]> {
    return new Observable(observer => {
      this.getVoicesByProvider(provider).subscribe({
        next: (voices) => {
          const filteredVoices = voices.filter(voice => voice.gender === gender);
          observer.next(filteredVoices);
          observer.complete();
        },
        error: (error) => {
          observer.error(error);
        }
      });
    });
  }

  /**
   * Search voices by name
   */
  searchVoices(provider: string, query: string): Observable<Voice[]> {
    return new Observable(observer => {
      this.getVoicesByProvider(provider).subscribe({
        next: (voices) => {
          const filteredVoices = voices.filter(voice => 
      voice.name.toLowerCase().includes(query.toLowerCase())
    );
          observer.next(filteredVoices);
          observer.complete();
        },
        error: (error) => {
          observer.error(error);
        }
      });
    });
  }

  /**
   * Get professional voices (customer care, etc.)
   */
  getProfessionalVoices(provider: string = 'elevenlabs'): Observable<Voice[]> {
    return new Observable(observer => {
      this.getVoicesByProvider(provider).subscribe({
        next: (voices) => {
          const professionalVoices = voices.filter(voice => 
      voice.name.toLowerCase().includes('customer care') || 
      voice.name.toLowerCase().includes('professional') ||
            voice.name.toLowerCase().includes('empathic') ||
            voice.metadata?.category === 'professional'
          );
          observer.next(professionalVoices);
          observer.complete();
        },
        error: (error) => {
          observer.error(error);
        }
      });
    });
  }

  /**
   * Play voice preview
   */
  playVoicePreview(previewUrl: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const audio = new Audio(previewUrl);
      audio.onended = () => resolve();
      audio.onerror = (error) => reject(error);
      audio.play().catch(reject);
    });
  }

  /**
   * Stop any currently playing audio
   */
  stopAllAudio(): void {
    // Stop all audio elements on the page
    const audioElements = document.querySelectorAll('audio');
    audioElements.forEach(audio => {
      audio.pause();
      audio.currentTime = 0;
    });
  }

  /**
   * Clear voice cache
   */
  clearCache(): void {
    this.cachedVoices.clear();
  }
}