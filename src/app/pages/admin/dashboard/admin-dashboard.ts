import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AdminDataService, type AdminAuditLog } from '../../../services/admin-data.service';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './admin-dashboard.html',
  styleUrl: './admin-dashboard.css'
})
export class AdminDashboardComponent {
  public readonly adminData = inject(AdminDataService);

  // Get recent logs (limit to 4)
  readonly recentLogs = computed<AdminAuditLog[]>(() => {
    return this.adminData.auditLogs().slice(0, 4);
  });

  // Calculate percentages
  readonly activePercent = computed(() => {
    const total = this.adminData.totalUsersCount();
    if (total === 0) return 0;
    return Math.round((this.adminData.activeUsersCount() / total) * 100);
  });

  readonly suspendedPercent = computed(() => {
    const total = this.adminData.totalUsersCount();
    if (total === 0) return 0;
    return Math.round((this.adminData.suspendedUsersCount() / total) * 100);
  });

  readonly blockedPercent = computed(() => {
    const total = this.adminData.totalUsersCount();
    if (total === 0) return 0;
    return Math.round((this.adminData.blockedUsersCount() / total) * 100);
  });

  formatAction(action: string): string {
    return action.replace(/_/g, ' ');
  }

  getActionBadgeClass(action: string): string {
    if (action.includes('ROLE')) return 'badge-role';
    if (action.includes('SUSPENSION') || action.includes('BLOCK')) return 'badge-danger';
    if (action.includes('ACTIVATION') || action.includes('RESTORE')) return 'badge-success';
    return 'badge-info';
  }
}
