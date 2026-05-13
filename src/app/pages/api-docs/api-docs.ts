import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavbarComponent } from '../../components/navbar/navbar';
import { FooterComponent } from '../../components/footer/footer';
import { AuthModalService } from '../../services/auth-modal.service';

@Component({
  selector: 'app-api-docs',
  standalone: true,
  imports: [CommonModule, NavbarComponent, FooterComponent],
  templateUrl: './api-docs.html',
  styles: [`
    .code-block {
      background: #1e1e1e;
      border-radius: 16px;
      padding: 24px;
      font-family: 'JetBrains Mono', 'Fira Code', monospace;
      font-size: 14px;
      color: #d4d4d4;
      line-height: 1.6;
      border: 1px solid rgba(255,255,255,0.1);
    }
    .endpoint-badge {
      padding: 4px 12px;
      border-radius: 6px;
      font-weight: 800;
      font-size: 11px;
      text-transform: uppercase;
    }
    .badge-get { background: #e3f2fd; color: #1976d2; }
    .badge-post { background: #e8f5e9; color: #388e3c; }
    .badge-delete { background: #ffebee; color: #d32f2f; }
  `]
})
export class ApiDocsPage {
  private authModal = inject(AuthModalService);

  activeTab: 'curl' | 'js' | 'python' = 'curl';

  codeExamples = {
    curl: `curl -X GET "https://api.datafyra.com/v1/surveys" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json"`,
    js: `const response = await fetch('https://api.datafyra.com/v1/surveys', {
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY'
  }
});
const data = await response.json();`,
    python: `import requests

url = "https://api.datafyra.com/v1/surveys"
headers = {"Authorization": "Bearer YOUR_API_KEY"}

response = requests.get(url, headers=headers)
surveys = response.json()`
  };

  endpoints = [
    { method: 'GET', path: '/surveys', desc: 'Obtener lista de encuestas', type: 'get' },
    { method: 'POST', path: '/surveys', desc: 'Crear nueva encuesta', type: 'post' },
    { method: 'GET', path: '/surveys/:id', desc: 'Detalles de una encuesta', type: 'get' },
    { method: 'GET', path: '/responses/:id', desc: 'Listar respuestas', type: 'get' }
  ];

  openAuth(mode: 'login' | 'register', event: Event) {
    event.preventDefault();
    this.authModal.open(mode);
  }
}
