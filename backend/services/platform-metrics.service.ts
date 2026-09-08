import { dbService } from './db.service';

const activeSessions = new Map<number, { role: string; lastSeen: number }>();

export function recordPlatformSession(userId: number, role: string): void {
  activeSessions.set(Number(userId), { role, lastSeen: Date.now() });
}

export function getActivePlatformSessions(): { total: number; patients: number; professionals: number } {
  const cutoff = Date.now() - 15 * 60 * 1000;
  for (const [userId, session] of activeSessions) {
    if (session.lastSeen < cutoff) activeSessions.delete(userId);
  }
  const sessions = [...activeSessions.values()];
  return {
    total: sessions.length,
    patients: sessions.filter(session => session.role === 'patient').length,
    professionals: sessions.filter(session => ['doctor', 'admin', 'superadmin'].includes(session.role)).length,
  };
}

export async function getPlatformMetrics() {
  const active = getActivePlatformSessions();
  if (!dbService.getStatus().connected) {
    return { active, users: 0, patients: 0, doctors: 0, hospitals: 0, tables: [] };
  }

  const [counts, tables] = await Promise.all([
    dbService.query<{ users: string; patients: string; doctors: string; hospitals: string }>(
      `SELECT
         (SELECT count(*) FROM users)::text AS users,
         (SELECT count(*) FROM patients)::text AS patients,
         (SELECT count(*) FROM doctors)::text AS doctors,
         (SELECT count(*) FROM hospitals)::text AS hospitals`
    ),
    dbService.query<{ table: string; rows: string }>(
      `SELECT relname AS table, n_live_tup::text AS rows
       FROM pg_stat_user_tables ORDER BY relname`
    ),
  ]);

  const count = counts?.rows[0];
  return {
    active,
    users: Number(count?.users || 0),
    patients: Number(count?.patients || 0),
    doctors: Number(count?.doctors || 0),
    hospitals: Number(count?.hospitals || 0),
    tables: (tables?.rows || []).map(row => ({ table: row.table, rows: Number(row.rows) || 0 })),
  };
}
