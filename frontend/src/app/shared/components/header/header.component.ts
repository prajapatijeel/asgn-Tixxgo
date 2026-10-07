import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterLink],
  template: `
    <header class="app-header">
      <div class="container header-inner">
        <a class="logo" routerLink="/flights/search">
          <span class="logo-icon">✈</span>
          <span class="logo-text">Tixxgo</span>
        </a>
        <nav class="header-nav">
          <a routerLink="/flights/search" class="nav-link">Search Flights</a>
          <a routerLink="/bookings" class="nav-link">My Bookings</a>
        </nav>
      </div>
    </header>
  `,
  styles: [`
    .app-header {
      background: rgba(13, 11, 30, 0.75);
      backdrop-filter: blur(20px) saturate(1.5);
      -webkit-backdrop-filter: blur(20px) saturate(1.5);
      border-bottom: 1px solid rgba(255,255,255,0.10);
      box-shadow: 0 4px 24px rgba(0,0,0,0.35);
      position: sticky;
      top: 0;
      z-index: 100;
    }
    .header-inner {
      display: flex;
      align-items: center;
      justify-content: space-between;
      height: 64px;
    }
    .logo {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      text-decoration: none;
      color: #c4b5fd;
      transition: color 200ms ease;
    }
    .logo:hover { color: #fff; }
    .logo-icon { font-size: 1.4rem; }
    .logo-text {
      font-size: 1.35rem;
      font-weight: 800;
      letter-spacing: -0.5px;
      background: linear-gradient(135deg, #c4b5fd, #818cf8);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    .header-nav { display: flex; gap: 0.5rem; }
    .nav-link {
      font-size: 0.9rem;
      font-weight: 500;
      color: rgba(240,238,255,0.65);
      text-decoration: none;
      padding: 0.35rem 0.875rem;
      border-radius: 999px;
      border: 1px solid transparent;
      transition: color 200ms ease, background 200ms ease, border-color 200ms ease;
    }
    .nav-link:hover {
      color: #fff;
      background: rgba(108,99,255,0.2);
      border-color: rgba(108,99,255,0.4);
    }
  `],
})
export class HeaderComponent {}

