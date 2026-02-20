import "server-only";
import * as tls from "tls";

export type SSLResult = {
  valid: boolean;
  issuer: string | null;
  expiresAt: Date | null;
};

export function checkSSL(hostname: string): Promise<SSLResult> {
  return new Promise((resolve) => {
    try {
      const socket = tls.connect(
        {
          host: hostname,
          port: 443,
          servername: hostname,
          timeout: 10000,
        },
        () => {
          const cert = socket.getPeerCertificate();
          socket.end();

          if (!cert || !cert.valid_to) {
            resolve({ valid: false, issuer: null, expiresAt: null });
            return;
          }

          const expiresAt = new Date(cert.valid_to);
          const issuer = cert.issuer?.O || cert.issuer?.CN || null;
          const valid = socket.authorized && expiresAt > new Date();

          resolve({ valid, issuer, expiresAt });
        }
      );

      socket.on("error", () => {
        resolve({ valid: false, issuer: null, expiresAt: null });
      });

      socket.on("timeout", () => {
        socket.destroy();
        resolve({ valid: false, issuer: null, expiresAt: null });
      });
    } catch {
      resolve({ valid: false, issuer: null, expiresAt: null });
    }
  });
}
