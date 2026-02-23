import "server-only";

type WhoisResult = {
  registrar: string | null;
  expiresAt: Date | null;
};

/** Map TLD → RDAP bootstrap server. Covers common TLDs. */
const RDAP_SERVERS: Record<string, string> = {
  com: "https://rdap.verisign.com/com/v1",
  net: "https://rdap.verisign.com/net/v1",
  org: "https://rdap.org",
  io: "https://rdap.org",
  app: "https://rdap.org",
  dev: "https://rdap.org",
};

function getRegistrableDomain(hostname: string): string {
  const parts = hostname.split(".");
  return parts.length > 2 ? parts.slice(-2).join(".") : hostname;
}

type RDAPEntity = {
  roles?: string[];
  handle?: string;
  vcardArray?: [string, [string, Record<string, string>, string, string][]];
};

type RDAPEvent = {
  eventAction: string;
  eventDate: string;
};

export async function lookupDomain(hostname: string): Promise<WhoisResult> {
  try {
    const domain = getRegistrableDomain(hostname);
    const tld = domain.split(".").pop() ?? "";
    const baseUrl = RDAP_SERVERS[tld] ?? "https://rdap.org";

    const res = await fetch(`${baseUrl}/domain/${domain}`, {
      headers: { Accept: "application/rdap+json" },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      console.error(`RDAP lookup returned ${res.status} for ${domain}`);
      return { registrar: null, expiresAt: null };
    }

    const data = await res.json();

    // Extract registrar from entities
    const regEntity = (data.entities as RDAPEntity[] | undefined)?.find(
      (e) => e.roles?.includes("registrar")
    );
    const registrar =
      regEntity?.vcardArray?.[1]?.find((v) => v[0] === "fn")?.[3] ??
      regEntity?.handle ??
      null;

    // Extract expiration date from events
    const expiryEvent = (data.events as RDAPEvent[] | undefined)?.find(
      (e) => e.eventAction === "expiration"
    );
    let expiresAt: Date | null = null;
    if (expiryEvent?.eventDate) {
      const parsed = new Date(expiryEvent.eventDate);
      if (!isNaN(parsed.getTime())) {
        expiresAt = parsed;
      }
    }

    return { registrar, expiresAt };
  } catch (error) {
    console.error(`RDAP lookup failed for ${hostname}:`, error);
    return { registrar: null, expiresAt: null };
  }
}
