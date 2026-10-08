import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  template: `
    <aside class="app-sidebar" aria-label="Primary navigation">
      <div class="sidebar-top">
        <a class="logo" routerLink="/flights/search" aria-label="Tixxgo home">
          <span class="logo-icon" aria-hidden="true">✈</span>
          <span class="logo-copy">
            <span class="logo-text">Tixxgo</span>
            <span class="logo-tagline">Flight booking</span>
          </span>
        </a>

        <nav class="sidebar-nav">
          <span class="nav-label">Plan your trip</span>
          <a routerLink="/flights/search" routerLinkActive="nav-link--active" class="nav-link">
            <span class="nav-icon" aria-hidden="true">⌕</span>
            <span>Search Flights</span>
          </a>
          <a routerLink="/bookings" routerLinkActive="nav-link--active" class="nav-link">
            <span class="nav-icon" aria-hidden="true">▣</span>
            <span>My Bookings</span>
          </a>
        </nav>
      </div>

      <div class="sidebar-footer">
        <span class="sidebar-status" aria-hidden="true"></span>
        <span>Travel support available</span>
      </div>
    </aside>
  `,
  styles: [`
    :host { display: block; }
    .app-sidebar {
      position: fixed;
      inset: 0 auto 0 0;
      z-index: 100;
      width: 252px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      padding: 1.5rem 1rem;
      background: rgba(250, 248, 251, 0.90);
      border-right: 1px solid rgba(112,93,118,0.16);
      box-shadow: 12px 0 32px rgba(76,61,85,0.08);
      backdrop-filter: blur(22px) saturate(1.4);
      -webkit-backdrop-filter: blur(22px) saturate(1.4);
    }
    .sidebar-top { display: flex; flex-direction: column; gap: 2.5rem; }
    .logo { display: flex; align-items: center; gap: 0.75rem; padding: 0.4rem 0.5rem; text-decoration: none; }
    .logo-copy { display: flex; flex-direction: column; line-height: 1.1; }
    .logo-icon { display: grid; width: 34px; height: 34px; place-items: center; border-radius: 10px; background: linear-gradient(135deg, #c5adc5, #b2b5e0); color: #34303c; font-size: 1.1rem; box-shadow: 0 6px 16px rgba(143,120,148,0.22); }
    .logo-text { font-size: 1.35rem; font-weight: 800; letter-spacing: -0.5px; color: #514657; }
    .logo-tagline { margin-top: 0.25rem; color: #817986; font-size: 0.68rem; letter-spacing: 0.08em; text-transform: uppercase; }
    .sidebar-nav { display: flex; flex-direction: column; gap: 0.35rem; }
    .nav-label { padding: 0 0.75rem 0.5rem; color: #817986; font-size: 0.68rem; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; }
    .nav-link { display: flex; align-items: center; gap: 0.75rem; padding: 0.72rem 0.75rem; border: 1px solid transparent; border-radius: 10px; color: #615a68; font-size: 0.9rem; font-weight: 600; text-decoration: none; transition: color 200ms ease, background 200ms ease, border-color 200ms ease; }
    .nav-link:hover { color: #34303c; background: rgba(197,173,197,0.20); border-color: rgba(143,120,148,0.3); }
    .nav-link--active { color: #403545; background: linear-gradient(135deg, rgba(197,173,197,0.42), rgba(178,181,224,0.35)); border-color: rgba(143,120,148,0.36); box-shadow: inset 3px 0 0 #8f7894; }
    .nav-icon { display: inline-grid; width: 20px; place-items: center; color: #78637d; font-size: 1.1rem; }
    .sidebar-footer { display: flex; align-items: center; gap: 0.5rem; padding: 0.8rem 0.75rem; border-top: 1px solid rgba(112,93,118,0.12); color: #817986; font-size: 0.72rem; }
    .sidebar-status { width: 7px; height: 7px; border-radius: 50%; background: #6f9d88; box-shadow: 0 0 10px rgba(95,141,121,0.45); }
    @media (max-width: 768px) {
      .app-sidebar { position: sticky; inset: auto; width: 100%; min-height: 64px; padding: 0.65rem 1rem; flex-direction: row; align-items: center; }
      .sidebar-top { width: 100%; flex-direction: row; align-items: center; justify-content: space-between; gap: 1rem; }
      .logo { padding: 0; }
      .logo-icon { width: 31px; height: 31px; }
      .logo-tagline, .nav-label, .sidebar-footer { display: none; }
      .sidebar-nav { flex-direction: row; gap: 0.25rem; }
      .nav-link { padding: 0.42rem 0.6rem; font-size: 0.8rem; }
      .nav-icon { display: none; }
    }
  `],
})
export class HeaderComponent {}
