import "server-only";

type WhoisResult = {
  registrar: string | null;
  expiresAt: Date | null;
};

function getRegistrableDomain(hostname: string): string {
  const parts = hostname.split(".");
  return parts.length > 2 ? parts.slice(-2).join(".") : hostname;
}

export async function lookupDomain(hostname: string): Promise<WhoisResult> {
  try {
    const domain = getRegistrableDomain(hostname);
    const whois = await import("whois-json");
    const result = await whois.default(domain);

    const data = Array.isArray(result) ? result[0] : result;

    const registrar =
      data?.registrar ??
      data?.registrarName ??
      data?.Registrar ??
      null;

    const expiryRaw =
      data?.expirationDate ??
      data?.registryExpiryDate ??
      data?.registrarRegistrationExpirationDate ??
      data?.["Registry Expiry Date"] ??
      null;

    let expiresAt: Date | null = null;
    if (expiryRaw) {
      const parsed = new Date(expiryRaw);
      if (!isNaN(parsed.getTime())) {
        expiresAt = parsed;
      }
    }

    return { registrar, expiresAt };
  } catch (error) {
    console.error(`WHOIS lookup failed for ${hostname}:`, error);
    return { registrar: null, expiresAt: null };
  }
}
