import { type Routes, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { AdminDataService } from '../../services/admin-data.service';
import { AdminLayoutComponent } from './components/admin-layout/admin-layout';
import { AdminDashboardComponent } from './dashboard/admin-dashboard';
import { AdminUsersComponent } from './users/admin-users';
import { AdminUserProfileComponent } from './user-profile/admin-user-profile';
import { AdminAuditLogsComponent } from './audit-logs/admin-audit-logs';

export const adminRoutes: Routes = [
  {
    path: '',
    component: AdminLayoutComponent,
    canActivate: [() => {
      const auth = inject(AuthService);
      const adminData = inject(AdminDataService);
      const router = inject(Router);
      
      const user = auth.user();
      if (!user || !user.email) {
        return router.parseUrl('/dashboard');
      }

      if (user.email.toLowerCase() === 'klhetvintellez23@gmail.com') {
        return true;
      }

      const adminUser = adminData.users().find(u => u.email.toLowerCase() === user.email.toLowerCase());
      const hasRole = adminUser ? ['Moderator', 'Admin', 'SuperAdmin'].includes(adminUser.role) : false;

      return hasRole ? true : router.parseUrl('/dashboard');
    }],
    children: [
      {
        path: 'dashboard',
        component: AdminDashboardComponent
      },
      {
        path: 'users',
        component: AdminUsersComponent
      },
      {
        path: 'user-profile/:id',
        component: AdminUserProfileComponent
      },
      {
        path: 'audit-logs',
        component: AdminAuditLogsComponent
      },
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      }
    ]
  }
];
