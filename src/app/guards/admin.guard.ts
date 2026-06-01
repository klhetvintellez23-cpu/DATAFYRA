import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { AdminDataService } from '../services/admin-data.service';

export const adminGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  const adminData = inject(AdminDataService);
  const router = inject(Router);

  // 1. Ensure logged in
  if (!auth.isLoggedIn()) {
    // If not authenticated via Supabase, check if there is a local stored auth or fallback
    void router.navigate(['/']);
    return false;
  }

  const currentUser = auth.user();
  if (!currentUser) {
    void router.navigate(['/']);
    return false;
  }

  // 2. Resolve matching administrative user
  const adminUser = adminData.users().find(u => u.email.toLowerCase() === currentUser.email.toLowerCase());

  if (!adminUser) {
    // Regular user logged in, not in administrative list -> redirect to user dashboard
    void router.navigate(['/dashboard']);
    return false;
  }

  // 3. Verify status is active
  if (adminUser.status !== 'activo') {
    alert(`Tu cuenta se encuentra en estado '${adminUser.status}'. Acceso denegado.`);
    void router.navigate(['/']);
    return false;
  }

  // 4. Verify role is administrative (Moderator, Admin, SuperAdmin)
  const allowedRoles = ['Moderator', 'Admin', 'SuperAdmin'];
  if (!allowedRoles.includes(adminUser.role)) {
    void router.navigate(['/dashboard']);
    return false;
  }

  return true;
};
