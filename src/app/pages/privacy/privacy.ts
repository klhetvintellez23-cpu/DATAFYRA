import { ChangeDetectionStrategy, Component } from '@angular/core';
import { NavbarComponent } from '../../components/navbar/navbar';
import { FooterComponent } from '../../components/footer/footer';

@Component({
  selector: 'app-privacy',
  imports: [NavbarComponent, FooterComponent],
  templateUrl: './privacy.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`
    .legal-container {
      max-width: 800px;
      margin: 0 auto;
      padding: 6rem 2rem;
      font-family: 'Epilogue', sans-serif;
      color: #1d1b20;
    }
    .legal-title {
      font-size: 2.5rem;
      font-weight: 700;
      margin-bottom: 1rem;
      color: #440789;
    }
    .legal-date {
      font-size: 1rem;
      color: #625b71;
      margin-bottom: 3rem;
    }
    .legal-content h2 {
      font-size: 1.5rem;
      font-weight: 700;
      margin-top: 2.5rem;
      margin-bottom: 1rem;
    }
    .legal-content p, .legal-content li {
      font-size: 1.1rem;
      line-height: 1.7;
      color: #49454e;
      margin-bottom: 1rem;
    }
    .legal-content ul {
      list-style-type: disc;
      padding-left: 1.5rem;
      margin-bottom: 1.5rem;
    }
  `]
})
export class PrivacyPage {
}
