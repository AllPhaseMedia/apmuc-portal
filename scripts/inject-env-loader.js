/**
 * Prepends .env loader code to the Next.js standalone server.js.
 *
 * PM2 caches process config (including env vars) from the first `pm2 start`
 * and `pm2 restart --update-env` only reads from the current shell env,
 * not from ecosystem.config.js. This script injects .env loading directly
 * into server.js so the app reads fresh env vars from disk on every restart.
 */
const fs = require("fs");
const path = require("path");

const serverPath = path.join(__dirname, "..", ".next", "standalone", "server.js");

const loader = `// Auto-injected .env loader (see scripts/inject-env-loader.js)
const __envPath = require("path").resolve(__dirname, "../../.env");
try {
  const __lines = require("fs").readFileSync(__envPath, "utf-8").split("\\n");
  for (const __line of __lines) {
    const __t = __line.trim();
    if (!__t || __t.startsWith("#")) continue;
    const __eq = __t.indexOf("=");
    if (__eq === -1) continue;
    const __k = __t.slice(0, __eq).trim();
    let __v = __t.slice(__eq + 1).trim();
    if ((__v.startsWith('"') && __v.endsWith('"')) || (__v.startsWith("'") && __v.endsWith("'"))) __v = __v.slice(1, -1);
    process.env[__k] = __v;
  }
} catch {}
`;

const original = fs.readFileSync(serverPath, "utf-8");
fs.writeFileSync(serverPath, loader + original);
console.log("Injected .env loader into .next/standalone/server.js");
