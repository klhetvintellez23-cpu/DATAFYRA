import { Injectable, signal, computed, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';

export type UserStatus = 'activo' | 'suspendido' | 'bloqueado';
export type UserRole = 'User' | 'Moderator' | 'Admin' | 'SuperAdmin';

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  lastLoginAt: string;
  status: UserStatus;
  role: UserRole;
  avatarUrl?: string;
  surveysCount: number;
  responsesCount: number;
}

export interface AdminSurvey {
  id: string;
  title: string;
  ownerId: string;
  ownerName: string;
  ownerEmail: string;
  createdAt: string;
  status: 'activo' | 'archivado' | 'despublicado';
  responsesCount: number;
}

export interface AdminAuditLog {
  id: string;
  timestamp: string;
  adminName: string;
  adminEmail: string;
  adminRole: UserRole;
  action: 'ROLE_CHANGE' | 'USER_SUSPENSION' | 'USER_ACTIVATION' | 'USER_BLOCK' | 'USER_UNBLOCK' | 'SURVEY_ARCHIVE' | 'SURVEY_UNPUBLISH' | 'SURVEY_RESTORE';
  target: string;
  details: string;
  ip: string;
  location: string;
}

@Injectable({ providedIn: 'root' })
export class AdminDataService {
  private readonly supabaseService = inject(SupabaseService);

  // Dynamic signals holding the real loaded data
  readonly users = signal<AdminUser[]>([]);
  readonly surveys = signal<AdminSurvey[]>([]);
  readonly auditLogs = signal<AdminAuditLog[]>([]);

  constructor() {
    // 1. Initialize Audit Logs from LocalStorage
    this.auditLogs.set(this.loadAuditLogs());
    // 2. Query production data from Supabase
    void this.loadRealData();
  }

  // Load real production data from Supabase tables
  async loadRealData(): Promise<void> {
    const supabase = this.supabaseService.client;
    if (!supabase) return;

    try {
      // 1. Fetch real user profiles from the 'perfiles' table
      const { data: perfiles, error: errProfiles } = await supabase
        .from('perfiles')
        .select('id, nombre_completo, email, url_avatar, creado_el');

      if (errProfiles) throw errProfiles;

      // 2. Fetch real surveys from the 'encuestas' table with submission response counts
      const { data: encuestas, error: errSurveys } = await supabase
        .from('encuestas')
        .select(`
          id,
          usuario_id,
          titulo,
          descripcion,
          estado,
          creado_el,
          actualizado_el,
          envios (count)
        `);

      if (errSurveys) throw errSurveys;

      // 3. Retrieve administrative moderation overrides from localStorage
      const rolesOverrides = JSON.parse(localStorage.getItem('admin_roles_overrides') || '{}');
      const statusesOverrides = JSON.parse(localStorage.getItem('admin_statuses_overrides') || '{}');
      const surveysOverrides = JSON.parse(localStorage.getItem('admin_surveys_overrides') || '{}');

      // 4. Map to AdminSurvey structure
      const resolvedSurveys: AdminSurvey[] = (encuestas || []).map((s: any) => {
        const owner = (perfiles || []).find((p: any) => p.id === s.usuario_id);
        const rawStatus = s.estado === 'cerrado' ? 'despublicado' : s.estado;
        const status = surveysOverrides[s.id] || rawStatus || 'activo';
        
        return {
          id: s.id,
          title: s.titulo || 'Encuesta sin título',
          ownerId: s.usuario_id,
          ownerName: owner?.nombre_completo || 'Usuario Desconocido',
          ownerEmail: owner?.email || 'desconocido@client.com',
          createdAt: s.creado_el,
          status: status,
          responsesCount: s.envios?.[0]?.count || 0
        };
      });

      // 5. Map to AdminUser structure
      const resolvedUsers: AdminUser[] = (perfiles || []).map((p: any) => {
        const userSurveys = resolvedSurveys.filter(s => s.ownerId === p.id);
        const surveysCount = userSurveys.length;
        const responsesCount = userSurveys.reduce((sum, s) => sum + s.responsesCount, 0);

        // Security role resolution: klhetvintellez23@gmail.com is SuperAdmin by default
        const defaultRole = p.email.toLowerCase() === 'klhetvintellez23@gmail.com' ? 'SuperAdmin' : 'User';
        const role = rolesOverrides[p.id] || defaultRole;
        const status = statusesOverrides[p.id] || 'activo';

        return {
          id: p.id,
          name: p.nombre_completo || p.email.split('@')[0],
          email: p.email,
          createdAt: p.creado_el,
          lastLoginAt: p.creado_el, // Fallback to registration date
          status: status,
          role: role,
          avatarUrl: p.url_avatar || undefined,
          surveysCount,
          responsesCount
        };
      });

      // 6. Update signals
      this.surveys.set(resolvedSurveys);
      this.users.set(resolvedUsers);

    } catch (e) {
      console.error('Error loading real production data in AdminDataService:', e);
    }
  }

  // Load audit logs from localStorage or initialize with initial seed
  private loadAuditLogs(): AdminAuditLog[] {
    try {
      const stored = localStorage.getItem('admin_audit_logs');
      if (stored) {
        return JSON.parse(stored) as AdminAuditLog[];
      }
    } catch (e) {
      console.error('Error loading audit logs:', e);
    }

    const seedLogs: AdminAuditLog[] = [
      {
        id: 'log_init',
        timestamp: new Date().toISOString(),
        adminName: 'Sistema de Seguridad',
        adminEmail: 'security@dataencuesta.com',
        adminRole: 'SuperAdmin',
        action: 'USER_ACTIVATION',
        target: 'Consola Administrativa',
        details: 'Se inicializó con éxito la Consola de Administración conectada a la base de datos de Producción.',
        ip: '127.0.0.1',
        location: 'Sistema Central'
      }
    ];
    localStorage.setItem('admin_audit_logs', JSON.stringify(seedLogs));
    return seedLogs;
  }

  // 2. Metrics (Computed Signals for Admin Dashboard Widget Metrics)
  readonly totalUsersCount = computed(() => this.users().length);
  readonly activeUsersCount = computed(() => this.users().filter(u => u.status === 'activo').length);
  readonly suspendedUsersCount = computed(() => this.users().filter(u => u.status === 'suspendido').length);
  readonly blockedUsersCount = computed(() => this.users().filter(u => u.status === 'bloqueado').length);
  
  readonly totalSurveysCount = computed(() => this.surveys().length);
  readonly activeSurveysCount = computed(() => this.surveys().filter(s => s.status === 'activo').length);
  readonly archivedSurveysCount = computed(() => this.surveys().filter(s => s.status === 'archivado').length);
  readonly unpublishedSurveysCount = computed(() => this.surveys().filter(s => s.status === 'despublicado').length);

  readonly totalResponsesCount = computed(() => {
    return this.surveys().reduce((sum, s) => sum + s.responsesCount, 0);
  });

  // 3. Admin Core Actions
  logAction(
    admin: { name: string; email: string; role: UserRole },
    action: AdminAuditLog['action'],
    target: string,
    details: string
  ): void {
    const newLog: AdminAuditLog = {
      id: `log_${Math.random().toString(36).substring(2, 9)}`,
      timestamp: new Date().toISOString(),
      adminName: admin.name,
      adminEmail: admin.email,
      adminRole: admin.role,
      action,
      target,
      details,
      ip: '192.168.1.102',
      location: 'Madrid, ES'
    };
    
    this.auditLogs.update(logs => {
      const next = [newLog, ...logs];
      localStorage.setItem('admin_audit_logs', JSON.stringify(next));
      return next;
    });
  }

  // Users Management Actions
  changeUserRole(
    admin: { name: string; email: string; role: UserRole },
    userId: string,
    newRole: UserRole
  ): void {
    this.users.update(list => list.map(u => {
      if (u.id === userId) {
        const details = `Rol modificado de '${u.role}' a '${newRole}'.`;
        this.logAction(admin, 'ROLE_CHANGE', `${u.name} (${u.id})`, details);

        // Save role override in localStorage
        const rolesOverrides = JSON.parse(localStorage.getItem('admin_roles_overrides') || '{}');
        rolesOverrides[userId] = newRole;
        localStorage.setItem('admin_roles_overrides', JSON.stringify(rolesOverrides));

        return { ...u, role: newRole };
      }
      return u;
    }));
  }

  suspendUser(
    admin: { name: string; email: string; role: UserRole },
    userId: string,
    reason: string
  ): void {
    this.users.update(list => list.map(u => {
      if (u.id === userId) {
        this.logAction(admin, 'USER_SUSPENSION', `${u.name} (${u.id})`, `Usuario suspendido. Motivo: ${reason}`);

        // Save status override in localStorage
        const statusesOverrides = JSON.parse(localStorage.getItem('admin_statuses_overrides') || '{}');
        statusesOverrides[userId] = 'suspendido';
        localStorage.setItem('admin_statuses_overrides', JSON.stringify(statusesOverrides));

        return { ...u, status: 'suspendido' };
      }
      return u;
    }));
  }

  activateUser(
    admin: { name: string; email: string; role: UserRole },
    userId: string
  ): void {
    this.users.update(list => list.map(u => {
      if (u.id === userId) {
        this.logAction(admin, 'USER_ACTIVATION', `${u.name} (${u.id})`, 'Cuenta reactivada a estado activo.');

        // Save status override in localStorage
        const statusesOverrides = JSON.parse(localStorage.getItem('admin_statuses_overrides') || '{}');
        statusesOverrides[userId] = 'activo';
        localStorage.setItem('admin_statuses_overrides', JSON.stringify(statusesOverrides));

        return { ...u, status: 'activo' };
      }
      return u;
    }));
  }

  blockUser(
    admin: { name: string; email: string; role: UserRole },
    userId: string,
    reason: string
  ): void {
    this.users.update(list => list.map(u => {
      if (u.id === userId) {
        this.logAction(admin, 'USER_BLOCK', `${u.name} (${u.id})`, `Cuenta bloqueada permanentemente. Motivo: ${reason}`);

        // Save status override in localStorage
        const statusesOverrides = JSON.parse(localStorage.getItem('admin_statuses_overrides') || '{}');
        statusesOverrides[userId] = 'bloqueado';
        localStorage.setItem('admin_statuses_overrides', JSON.stringify(statusesOverrides));

        return { ...u, status: 'bloqueado' };
      }
      return u;
    }));
  }

  unblockUser(
    admin: { name: string; email: string; role: UserRole },
    userId: string
  ): void {
    this.users.update(list => list.map(u => {
      if (u.id === userId) {
        this.logAction(admin, 'USER_UNBLOCK', `${u.name} (${u.id})`, 'Cuenta desbloqueada. Estado devuelto a activo.');

        // Save status override in localStorage
        const statusesOverrides = JSON.parse(localStorage.getItem('admin_statuses_overrides') || '{}');
        statusesOverrides[userId] = 'activo';
        localStorage.setItem('admin_statuses_overrides', JSON.stringify(statusesOverrides));

        return { ...u, status: 'activo' };
      }
      return u;
    }));
  }

  // Survey Management Actions
  archiveSurvey(
    admin: { name: string; email: string; role: UserRole },
    surveyId: string
  ): void {
    this.surveys.update(list => list.map(s => {
      if (s.id === surveyId) {
        this.logAction(admin, 'SURVEY_ARCHIVE', `Encuesta: ${s.title} (${s.id})`, 'Encuesta archivada por decisión administrativa.');

        // Save survey override in localStorage
        const surveysOverrides = JSON.parse(localStorage.getItem('admin_surveys_overrides') || '{}');
        surveysOverrides[surveyId] = 'archivado';
        localStorage.setItem('admin_surveys_overrides', JSON.stringify(surveysOverrides));

        return { ...s, status: 'archivado' };
      }
      return s;
    }));
  }

  unpublishSurvey(
    admin: { name: string; email: string; role: UserRole },
    surveyId: string,
    reason: string
  ): void {
    this.surveys.update(list => list.map(s => {
      if (s.id === surveyId) {
        this.logAction(admin, 'SURVEY_UNPUBLISH', `Encuesta: ${s.title} (${s.id})`, `Encuesta despublicada. Motivo: ${reason}`);

        // Save survey override in localStorage
        const surveysOverrides = JSON.parse(localStorage.getItem('admin_surveys_overrides') || '{}');
        surveysOverrides[surveyId] = 'despublicado';
        localStorage.setItem('admin_surveys_overrides', JSON.stringify(surveysOverrides));

        return { ...s, status: 'despublicado' };
      }
      return s;
    }));
  }

  restoreSurvey(
    admin: { name: string; email: string; role: UserRole },
    surveyId: string
  ): void {
    this.surveys.update(list => list.map(s => {
      if (s.id === surveyId) {
        this.logAction(admin, 'SURVEY_RESTORE', `Encuesta: ${s.title} (${s.id})`, 'Encuesta restaurada a estado activo.');

        // Save survey override in localStorage
        const surveysOverrides = JSON.parse(localStorage.getItem('admin_surveys_overrides') || '{}');
        surveysOverrides[surveyId] = 'activo';
        localStorage.setItem('admin_surveys_overrides', JSON.stringify(surveysOverrides));

        return { ...s, status: 'activo' };
      }
      return s;
    }));
  }
}
