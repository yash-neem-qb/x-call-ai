import { Component, OnInit, OnDestroy, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';

import { AuthService, AuthState } from './core/services/auth.service';

declare const particlesJS: any;

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet],
  template: `
    <div class="app-container content-above-particles" [class.authenticated]="isAuthenticated">
      <router-outlet></router-outlet>
    </div>
  `,
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit, AfterViewInit, OnDestroy {
  title = 'X-Call';
  isAuthenticated = false;
  private destroy$ = new Subject<void>();

  constructor(private authService: AuthService) {}

  ngOnInit(): void {
    // Subscribe to authentication state changes
    this.authService.authState$
      .pipe(takeUntil(this.destroy$))
      .subscribe((authState: AuthState) => {
        this.isAuthenticated = authState.isAuthenticated;
      });
  }

  ngAfterViewInit(): void {
    // Delay particles initialization to ensure DOM is ready
    setTimeout(() => {
      this.initParticles();
    }, 100);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Initialize particles.js with our configuration
   */
  private initParticles(): void {
    try {
      // Initialize particles.js with the spider web effect
      particlesJS("particles-js", {
        particles: {
          number: {
            value: 100,
            density: {
              enable: true,
              value_area: 800
            }
          },
          color: {
            value: "#00d4aa"
          },
          shape: {
            type: "circle",
            stroke: {
              width: 0,
              color: "#000000"
            },
            polygon: {
              nb_sides: 5
            }
          },
          opacity: {
            value: 0.8,
            random: false,
            anim: {
              enable: false,
              speed: 1,
              opacity_min: 0.1,
              sync: false
            }
          },
          size: {
            value: 3,
            random: true,
            anim: {
              enable: false,
              speed: 40,
              size_min: 0.1,
              sync: false
            }
          },
          line_linked: {
            enable: true,
            distance: 150,
            color: "#00d4aa",
            opacity: 0.6,
            width: 1
          },
          move: {
            enable: true,
            speed: 3,
            direction: "none",
            random: false,
            straight: false,
            out_mode: "out",
            bounce: false,
            attract: {
              enable: false,
              rotateX: 600,
              rotateY: 1200
            }
          }
        },
        interactivity: {
          detect_on: "canvas",
          events: {
            onhover: {
              enable: true,
              mode: "grab"
            },
            onclick: {
              enable: true,
              mode: "push"
            },
            resize: true
          },
          modes: {
            grab: {
              distance: 200,
              line_linked: {
                opacity: 1
              }
            },
            bubble: {
              distance: 400,
              size: 40,
              duration: 2,
              opacity: 8,
              speed: 3
            },
            repulse: {
              distance: 200,
              duration: 0.4
            },
            push: {
              particles_nb: 4
            },
            remove: {
              particles_nb: 2
            }
          }
        },
        retina_detect: true
      });

      // Initialize AOS (Animate on Scroll)
      setTimeout(() => {
        try {
          // @ts-ignore
          AOS.init();
        } catch (e) {
          console.error('Error initializing AOS:', e);
        }
      }, 500);
      
      // Add animation to cards on scroll
      setTimeout(() => {
        const cards = document.querySelectorAll('.card');
        const observer = new IntersectionObserver((entries) => {
          entries.forEach((entry, index) => {
            if (entry.isIntersecting) {
              setTimeout(() => {
                (entry.target as HTMLElement).style.opacity = '1';
                (entry.target as HTMLElement).style.transform = 'translateY(0)';
              }, index * 200);
              observer.unobserve(entry.target);
            }
          });
        }, { threshold: 0.1 });

        cards.forEach((card, index) => {
          (card as HTMLElement).style.opacity = '0';
          (card as HTMLElement).style.transform = 'translateY(50px)';
          (card as HTMLElement).style.transition = 'all 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
          observer.observe(card);
        });

        // Add 3D tilt effect to cards
        cards.forEach(card => {
          card.addEventListener('mousemove', function(e: any) {
            const rect = this.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            const xRotation = ((y - rect.height / 2) / rect.height) * 10;
            const yRotation = ((x - rect.width / 2) / rect.width) * -10;
            
            this.style.transform = `perspective(1000px) rotateX(${xRotation}deg) rotateY(${yRotation}deg) translateY(-10px)`;
          });
          
          card.addEventListener('mouseout', function() {
            this.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) translateY(0)';
          });
        });
      }, 1000);
    } catch (error) {
      console.error('Error initializing particles.js:', error);
    }
  }
}