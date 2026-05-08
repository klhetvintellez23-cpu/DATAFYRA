import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/landing/landing').then(m => m.LandingPage)
  },
  {
    path: 'tour',
    loadComponent: () => import('./pages/tour/tour').then(m => m.TourPage)
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./pages/dashboard/dashboard').then(m => m.DashboardPage)
  },
  {
    path: 'editor/new',
    loadComponent: () => import('./pages/editor/editor').then(m => m.EditorPage)
  },
  {
    path: 'editor/:id',
    loadComponent: () => import('./pages/editor/editor').then(m => m.EditorPage)
  },
  {
    path: 'analytics/:id',
    loadComponent: () => import('./pages/analytics/analytics').then(m => m.AnalyticsPage)
  },
  {
    path: 'survey/:id',
    loadComponent: () => import('./pages/survey-response/survey-response').then(m => m.SurveyResponsePage)
  },
  {
    path: 'templates',
    loadComponent: () => import('./pages/templates/templates').then(m => m.TemplatesPage)
  },
  {
    path: 'templates/:id',
    loadComponent: () => import('./pages/template-details/template-details').then(m => m.TemplateDetailsPage)
  },
  {
    path: '**',
    redirectTo: ''
  }
];
