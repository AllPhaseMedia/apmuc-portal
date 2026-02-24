import "server-only";

const APP_ID = process.env.HELPSCOUT_APP_ID;
const APP_SECRET = process.env.HELPSCOUT_APP_SECRET;
const MAILBOX_ID = process.env.HELPSCOUT_MAILBOX_ID;

const TOKEN_URL = "https://api.helpscout.net/v2/oauth2/token";
const API_BASE = "https://api.helpscout.net/v2";

// In-memory token cache (refreshed on expiry)
let cachedToken: { token: string; expiresAt: number } | null = null;

export function isConfigured(): boolean {
  return !!(APP_ID && APP_SECRET && MAILBOX_ID);
}

async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60000) {
    return cachedToken.token;
  }

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "client_credentials",
      client_id: APP_ID,
      client_secret: APP_SECRET,
    }),
  });

  if (!res.ok) {
    throw new Error(`Help Scout auth failed: ${res.status}`);
  }

  const data = await res.json();
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };

  return cachedToken.token;
}

async function apiGet(path: string, params?: Record<string, string>) {
  const token = await getAccessToken();
  const url = new URL(`${API_BASE}${path}`);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.set(k, v);
    }
  }

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) {
    throw new Error(`Help Scout API error: ${res.status} ${res.statusText}`);
  }

  // 204 No Content
  if (res.status === 204) return null;
  return res.json();
}

async function apiPost(path: string, body: unknown) {
  const token = await getAccessToken();

  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Help Scout API error: ${res.status} ${res.statusText} ${text}`
    );
  }

  // 201 Created often returns Location header, no body
  if (res.status === 201) {
    return { location: res.headers.get("Location") };
  }
  if (res.status === 204) return null;
  return res.json();
}

// ============================================================
// TYPES
// ============================================================

export type HelpScoutConversation = {
  id: number;
  number: number;
  subject: string;
  status: "active" | "pending" | "closed" | "spam";
  preview: string;
  mailboxId: number;
  createdAt: string;
  closedAt: string | null;
  userUpdatedAt: string;
  customer?: {
    id: number;
    email: string;
    firstName: string;
    lastName: string;
  };
  primaryCustomer?: {
    id: number;
    email: string;
    firstName?: string;
    lastName?: string;
  };
  tags: { id: number; tag: string }[];
  _embedded?: {
    threads: HelpScoutThread[];
  };
};

export type HelpScoutAttachment = {
  id: number;
  filename: string;
  mimeType: string;
  size: number;
  width?: number;
  height?: number;
  _links?: {
    download?: { href: string };
    data?: { href: string };
  };
};

export type HelpScoutThread = {
  id: number;
  type: "customer" | "message" | "reply" | "note" | "lineitem";
  status: string;
  body: string;
  createdAt: string;
  createdBy: {
    id: number;
    type: "customer" | "user";
    email: string;
    first: string;
    last: string;
  };
  source?: { type: string };
  _embedded?: {
    attachments?: HelpScoutAttachment[];
  };
  attachments?: HelpScoutAttachment[];
};

// ============================================================
// CONVERSATIONS
// ============================================================

export async function getConversationsByEmail(email: string) {
  if (!isConfigured()) return null;

  const data = await apiGet("/conversations", {
    mailbox: MAILBOX_ID!,
    query: `(email:"${email}")`,
    status: "all",
    sortField: "modifiedAt",
    sortOrder: "desc",
  });

  return (data?._embedded?.conversations ?? []) as HelpScoutConversation[];
}

export async function getConversation(conversationId: number) {
  if (!isConfigured()) return null;

  const data = await apiGet(`/conversations/${conversationId}`, {
    embed: "threads",
  });

  return data as HelpScoutConversation;
}

export type Attachment = {
  fileName: string;
  mimeType: string;
  data: string; // base64
};

export async function createConversation(
  customerEmail: string,
  customerName: string,
  subject: string,
  body: string,
  attachments?: Attachment[]
) {
  if (!isConfigured()) throw new Error("Help Scout not configured");

  const [firstName, ...rest] = customerName.split(" ");
  const lastName = rest.join(" ") || "-";

  const thread: Record<string, unknown> = {
    type: "customer",
    customer: {
      email: customerEmail,
    },
    text: body,
  };

  if (attachments && attachments.length > 0) {
    thread.attachments = attachments.map((a) => ({
      fileName: a.fileName,
      mimeType: a.mimeType,
      data: a.data,
    }));
  }

  return apiPost("/conversations", {
    subject,
    type: "email",
    autoReply: true,
    mailboxId: Number(MAILBOX_ID),
    customer: {
      email: customerEmail,
      firstName: firstName || customerEmail,
      lastName,
    },
    threads: [thread],
    status: "active",
  });
}

export async function replyToConversation(
  conversationId: number,
  customerEmail: string,
  body: string,
  attachments?: Attachment[]
) {
  if (!isConfigured()) throw new Error("Help Scout not configured");

  const payload: Record<string, unknown> = {
    customer: { email: customerEmail },
    text: body,
    type: "customer",
  };

  if (attachments && attachments.length > 0) {
    payload.attachments = attachments.map((a) => ({
      fileName: a.fileName,
      mimeType: a.mimeType,
      data: a.data,
    }));
  }

  return apiPost(`/conversations/${conversationId}/reply`, payload);
}
