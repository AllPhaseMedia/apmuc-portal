"use server";

import { requireAuth } from "@/lib/auth";
import { resolveClientContext } from "@/lib/client-context";
import * as helpscout from "@/lib/helpscout";
import type { ActionResult } from "@/types";

export async function getTickets() {
  try {
    await requireAuth();

    const ctx = await resolveClientContext();
    if (!ctx) {
      return { success: false as const, error: "No client record found." };
    }

    if (!ctx.permissions.support) {
      return { success: false as const, error: "You don't have permission to view support tickets." };
    }

    if (!helpscout.isConfigured()) {
      return { success: false as const, error: "Support system not configured." };
    }

    // Use the contact's own email for Help Scout queries (not the client's primary email)
    const email = ctx.userEmail;
    const conversations = await helpscout.getConversationsByEmail(email);
    const emailLower = email.toLowerCase();
    const filtered = (conversations ?? []).filter((c) => {
      const custEmail = (
        c.primaryCustomer?.email ?? c.customer?.email ?? ""
      ).toLowerCase();
      return custEmail === emailLower;
    });
    return { success: true as const, data: filtered };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Failed to fetch tickets",
    };
  }
}

export async function getTicket(conversationId: number) {
  try {
    await requireAuth();

    const ctx = await resolveClientContext();
    if (!ctx || !ctx.permissions.support) {
      return { success: false as const, error: "Ticket not found" };
    }

    if (!helpscout.isConfigured()) {
      return { success: false as const, error: "Support system not configured." };
    }

    const conversation = await helpscout.getConversation(conversationId);
    if (!conversation) {
      return { success: false as const, error: "Ticket not found" };
    }

    // Verify this conversation belongs to the current user's email
    const conversationEmail = (
      conversation.primaryCustomer?.email ??
      conversation.customer?.email ??
      ""
    ).toLowerCase();
    if (conversationEmail !== ctx.userEmail.toLowerCase()) {
      return { success: false as const, error: "Ticket not found" };
    }

    return { success: true as const, data: conversation };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Failed to fetch ticket",
    };
  }
}

export type TicketAttachment = {
  fileName: string;
  mimeType: string;
  data: string; // base64
};

export async function createTicket(
  subject: string,
  body: string,
  attachments?: TicketAttachment[]
): Promise<ActionResult<null>> {
  try {
    const user = await requireAuth();

    const ctx = await resolveClientContext();
    if (!ctx) {
      return { success: false, error: "No client record found." };
    }

    if (!ctx.permissions.support) {
      return { success: false, error: "You don't have permission to create tickets." };
    }

    if (!helpscout.isConfigured()) {
      return { success: false, error: "Support system not configured." };
    }
    await helpscout.createConversation(
      ctx.userEmail,
      user.name || ctx.client.name,
      subject,
      body,
      attachments
    );
    return { success: true, data: null };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create ticket",
    };
  }
}

export async function replyToTicket(
  conversationId: number,
  body: string,
  attachments?: TicketAttachment[]
): Promise<ActionResult<null>> {
  try {
    await requireAuth();

    const ctx = await resolveClientContext();
    if (!ctx || !ctx.permissions.support) {
      return { success: false, error: "Not available." };
    }

    if (!helpscout.isConfigured()) {
      return { success: false, error: "Support system not configured." };
    }

    await helpscout.replyToConversation(conversationId, ctx.userEmail, body, attachments);
    return { success: true, data: null };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to send reply",
    };
  }
}
