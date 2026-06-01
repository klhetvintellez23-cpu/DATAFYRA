import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AdminDataService, type AdminUser, type UserRole, type UserStatus } from '../../../services/admin-data.service';

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './admin-users.html',
  styleUrl: './admin-users.css'
})
export class AdminUsersComponent {
  public readonly adminData = inject(AdminDataService);

  // Filters state
  readonly searchTerm = signal<string>('');
  readonly roleFilter = signal<string>('all');
  readonly statusFilter = signal<string>('all');

  // Reactively computed list of filtered users
  readonly filteredUsers = computed<AdminUser[]>(() => {
    const term = this.searchTerm().toLowerCase().trim();
    const role = this.roleFilter();
    const status = this.statusFilter();

    return this.adminData.users().filter(u => {
      // 1. Filter by term
      const matchesTerm = !term || 
        u.name.toLowerCase().includes(term) || 
        u.email.toLowerCase().includes(term) ||
        u.id.toLowerCase().includes(term);

      if (!matchesTerm) return false;

      // 2. Filter by role
      if (role !== 'all' && u.role !== role) return false;

      // 3. Filter by status
      if (status !== 'all' && u.status !== status) return false;

      return true;
    });
  });

  resetFilters(): void {
    this.searchTerm.set('');
    this.roleFilter.set('all');
    this.statusFilter.set('all');
  }

  getRoleBadgeClass(role: UserRole): string {
    switch (role) {
      case 'SuperAdmin': return 'role-superadmin';
      case 'Admin': return 'role-admin';
      case 'Moderator': return 'role-moderator';
      default: return 'role-user';
    }
  }

  getStatusBadgeClass(status: UserStatus): string {
    switch (status) {
      case 'activo': return 'status-active';
      case 'suspendido': return 'status-suspended';
      case 'bloqueado': return 'status-blocked';
    }
  }
}
