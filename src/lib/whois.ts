import "server-only";

type WhoisResult = {
  registrar: string | null;
  expiresAt: Date | null;
};

export async function lookupDomain(hostname: string): Promise<WhoisResult> {
  try {
    const whois = await import("whois-json");
    const result = await whois.default(hostname);

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
