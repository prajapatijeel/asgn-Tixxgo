import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

/**
 * AppComponent — the shell.
 * It only provides the <router-outlet> — all real UI lives inside feature pages.
 * The header is included per-page rather than here, so each page
 * can control its own layout independently.
 */
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: `<router-outlet></router-outlet>`,
  styles: [],
})
export class AppComponent {}
