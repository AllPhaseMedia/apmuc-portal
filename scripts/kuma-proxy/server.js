const http = require("http");
const mysql = require("mysql2/promise");
const url = require("url");

const PORT = process.env.KUMA_PROXY_PORT || 3939;
const API_KEY = process.env.KUMA_PROXY_API_KEY || "";

const DB_CONFIG = {
  host: "127.0.0.1",
  port: 3306,
  database: process.env.UPTIME_KUMA_DB_NAME,
  user: process.env.UPTIME_KUMA_DB_USER,
  password: process.env.UPTIME_KUMA_DB_PASS,
  connectTimeout: 5000,
};

async function fetchUptimeStatus(monitorId) {
  const conn = await mysql.createConnection(DB_CONFIG);
  try {
    const [latestRows] = await conn.execute(
      `SELECT status, ping, time FROM heartbeat
       WHERE monitor_id = ? ORDER BY time DESC LIMIT 1`,
      [monitorId]
    );

    if (latestRows.length === 0) {
      return { status: "unknown", uptime24h: null, uptime30d: null, responseTime: null, lastCheck: null };
    }

    const latest = latestRows[0];

    const [stats24h] = await conn.execute(
      `SELECT COUNT(*) as total, SUM(status = 1) as up_count, ROUND(AVG(ping), 0) as avg_ping
       FROM heartbeat WHERE monitor_id = ? AND time > DATE_SUB(NOW(), INTERVAL 24 HOUR)`,
      [monitorId]
    );

    const [stats30d] = await conn.execute(
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
  } finally {
    await conn.end().catch(() => {});
  }
}

const server = http.createServer(async (req, res) => {
  res.setHeader("Content-Type", "application/json");

  // Auth check
  const authHeader = req.headers["authorization"];
  if (API_KEY && authHeader !== `Bearer ${API_KEY}`) {
    res.writeHead(401);
    res.end(JSON.stringify({ error: "Unauthorized" }));
    return;
  }

  const parsed = url.parse(req.url, true);

  // GET /status?monitorId=123
  if (parsed.pathname === "/status" && req.method === "GET") {
    const monitorId = parsed.query.monitorId;
    if (!monitorId) {
      res.writeHead(400);
      res.end(JSON.stringify({ error: "Missing monitorId" }));
      return;
    }
    try {
      const result = await fetchUptimeStatus(monitorId);
      res.writeHead(200);
      res.end(JSON.stringify(result));
    } catch (err) {
      console.error("Query failed:", err.message);
      res.writeHead(500);
      res.end(JSON.stringify({ error: "Internal error" }));
    }
    return;
  }

  // Health check
  if (parsed.pathname === "/health") {
    res.writeHead(200);
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  res.writeHead(404);
  res.end(JSON.stringify({ error: "Not found" }));
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`Kuma proxy listening on 127.0.0.1:${PORT}`);
});
