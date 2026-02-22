declare module "whois-json" {
  interface WhoisData {
    registrar?: string;
    registrarName?: string;
    Registrar?: string;
    expirationDate?: string;
    registryExpiryDate?: string;
    registrarRegistrationExpirationDate?: string;
    "Registry Expiry Date"?: string;
    [key: string]: unknown;
  }

  function whois(domain: string): Promise<WhoisData | WhoisData[]>;

  export default whois;
}
