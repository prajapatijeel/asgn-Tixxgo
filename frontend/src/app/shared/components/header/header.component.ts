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
        </nav>
      </div>
    </header>
  `,
  styles: [`
    .app-header {
      background: #fff;
      border-bottom: 1px solid var(--color-border);
      box-shadow: var(--shadow-sm);
      position: sticky;
      top: 0;
      z-index: 100;
    }
    .header-inner {
      display: flex;
      align-items: center;
      justify-content: space-between;
      height: 60px;
    }
    .logo {
      display: flex;
      align-items: center;
      gap: .5rem;
      text-decoration: none;
      color: var(--color-primary);
    }
    .logo-icon {
      font-size: 1.4rem;
    }
    .logo-text {
      font-size: 1.3rem;
      font-weight: 700;
      letter-spacing: -.5px;
    }
    .header-nav { display: flex; gap: 1rem; }
    .nav-link {
      font-size: .9375rem;
      font-weight: 500;
      color: var(--color-text-secondary);
      text-decoration: none;
      padding: .25rem .5rem;
      border-radius: var(--radius-sm);
      transition: color var(--transition), background var(--transition);
    }
    .nav-link:hover {
      color: var(--color-primary);
      background: var(--color-primary-light);
    }
  `],
})
export class HeaderComponent {}
