import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminDataService, type AdminAuditLog, type UserRole } from '../../../services/admin-data.service';

@Component({
  selector: 'app-admin-audit-logs',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-audit-logs.html',
  styleUrl: './admin-audit-logs.css'
})
export class AdminAuditLogsComponent {
  public readonly adminData = inject(AdminDataService);

  // Filters state
  readonly searchTerm = signal<string>('');
  readonly actionFilter = signal<string>('all');
  readonly adminFilter = signal<string>('all');
  readonly timeFilter = signal<string>('all');

  // Reactively computed list of unique administrators for dropdown select
  readonly uniqueAdmins = computed<Array<{ email: string; name: string }>>(() => {
    const logs = this.adminData.auditLogs();
    const map = new Map<string, string>(); // email -> name
    logs.forEach(l => {
      map.set(l.adminEmail, l.adminName);
    });
    return Array.from(map.entries()).map(([email, name]) => ({ email, name }));
  });

  // Reactively computed filtered list of audit logs
  readonly filteredLogs = computed<AdminAuditLog[]>(() => {
    const term = this.searchTerm().toLowerCase().trim();
    const action = this.actionFilter();
    const adminEmail = this.adminFilter();
    const timeFrame = this.timeFilter();
    const now = new Date().getTime();

    return this.adminData.auditLogs().filter(log => {
      // 1. Filter by search query (action, details, target, adminName)
      const matchesTerm = !term ||
        log.details.toLowerCase().includes(term) ||
        log.target.toLowerCase().includes(term) ||
        log.adminName.toLowerCase().includes(term) ||
        log.adminEmail.toLowerCase().includes(term) ||
        log.action.toLowerCase().includes(term);

      if (!matchesTerm) return false;

      // 2. Filter by Action type
      if (action !== 'all' && log.action !== action) return false;

      // 3. Filter by Administrator
      if (adminEmail !== 'all' && log.adminEmail.toLowerCase() !== adminEmail.toLowerCase()) return false;

      // 4. Filter by date/time frame
      if (timeFrame !== 'all') {
        const logTime = new Date(log.timestamp).getTime();
        const diffMs = now - logTime;
        const diffDays = diffMs / (1000 * 60 * 60 * 24);

        if (timeFrame === 'today' && diffDays > 1) return false;
        if (timeFrame === 'week' && diffDays > 7) return false;
        if (timeFrame === 'month' && diffDays > 30) return false;
      }

      return true;
    });
  });

  resetFilters(): void {
    this.searchTerm.set('');
    this.actionFilter.set('all');
    this.adminFilter.set('all');
    this.timeFilter.set('all');
  }

  formatAction(action: string): string {
    return action.replace(/_/g, ' ');
  }

  getActionBadgeClass(action: string): string {
    if (action.includes('ROLE')) return 'badge-role';
    if (action.includes('SUSPENSION') || action.includes('BLOCK')) return 'badge-danger';
    if (action.includes('ACTIVATION') || action.includes('RESTORE')) return 'badge-success';
    return 'badge-info';
  }

  getAdminRoleBadgeClass(role: UserRole): string {
    switch (role) {
      case 'SuperAdmin': return 'admin-super';
      case 'Admin': return 'admin-regular';
      case 'Moderator': return 'admin-moderator';
      default: return '';
    }
  }
}
