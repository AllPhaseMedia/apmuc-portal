import "server-only";
import mysql from "mysql2/promise";

const UK_DB_HOST = process.env.UPTIME_KUMA_DB_HOST ?? "localhost";
const UK_DB_PORT = parseInt(process.env.UPTIME_KUMA_DB_PORT ?? "3306", 10);
const UK_DB_NAME = process.env.UPTIME_KUMA_DB_NAME;
const UK_DB_USER = process.env.UPTIME_KUMA_DB_USER;
const UK_DB_PASS = process.env.UPTIME_KUMA_DB_PASS;

export type UptimeResult = {
  status: "up" | "down" | "pending" | "unknown";
  uptime24h: number | null;
  uptime30d: number | null;
  responseTime: number | null;
  lastCheck: string | null;
};

function isConfigured(): boolean {
  return !!(UK_DB_NAME && UK_DB_USER && UK_DB_PASS);
}

export async function fetchUptimeStatus(
  monitorId: string
): Promise<UptimeResult | null> {
  if (!isConfigured()) return null;

  let conn: mysql.Connection | null = null;
  try {
    conn = await mysql.createConnection({
      host: UK_DB_HOST,
      port: UK_DB_PORT,
      database: UK_DB_NAME,
      user: UK_DB_USER,
      password: UK_DB_PASS,
      connectTimeout: 5000,
    });

    // Latest heartbeat for current status + response time
    const [latestRows] = await conn.execute<mysql.RowDataPacket[]>(
      `SELECT status, ping, time FROM heartbeat
       WHERE monitor_id = ? ORDER BY time DESC LIMIT 1`,
      [monitorId]
    );

    if (latestRows.length === 0) {
      return { status: "unknown", uptime24h: null, uptime30d: null, responseTime: null, lastCheck: null };
    }

    const latest = latestRows[0];

    // 24h uptime percentage
    const [stats24h] = await conn.execute<mysql.RowDataPacket[]>(
      `SELECT COUNT(*) as total, SUM(status = 1) as up_count, ROUND(AVG(ping), 0) as avg_ping
       FROM heartbeat WHERE monitor_id = ? AND time > DATE_SUB(NOW(), INTERVAL 24 HOUR)`,
      [monitorId]
    );

    // 30d uptime percentage
    const [stats30d] = await conn.execute<mysql.RowDataPacket[]>(
      `SELECT COUNT(*) as total, SUM(status = 1) as up_count
       FROM heartbeat WHERE monitor_id = ? AND time > DATE_SUB(NOW(), INTERVAL 30 DAY)`,
      [monitorId]
    );

    const s24 = stats24h[0];
    const s30 = stats30d[0];

    return {
      status: latest.status === 1 ? "up" : "down",
      uptime24h: s24.total > 0 ? Math.round((s24.up_count / s24.total) * 10000) / 100 : null,
      uptime30d: s30.total > 0 ? Math.round((s30.up_count / s30.total) * 10000) / 100 : null,
      responseTime: s24.avg_ping ?? latest.ping ?? null,
      lastCheck: latest.time ? new Date(latest.time).toISOString() : null,
    };
  } catch (error) {
    console.error("Uptime Kuma fetch failed:", error);
    return null;
  } finally {
    if (conn) await conn.end().catch(() => {});
  }
}
