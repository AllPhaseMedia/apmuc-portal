"use server";

import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import * as helpscout from "@/lib/helpscout";
import type { ActionResult } from "@/types";

async function getClientEmail() {
  const user = await requireAuth();
  let client = await prisma.client.findFirst({
    where: { clerkUserId: user.clerkUserId },
    select: { id: true, email: true, name: true },
  });

  // Fallback: match by email and link the Clerk user ID
  if (!client) {
    client = await prisma.client.findFirst({
      where: { email: user.email, clerkUserId: null },
      select: { id: true, email: true, name: true },
    });

    if (client) {
      await prisma.client.update({
        where: { id: client.id },
        data: { clerkUserId: user.clerkUserId },
      });
    }
  }

  return client;
}

export async function getTickets() {
  try {
    const client = await getClientEmail();
    if (!client) {
      return { success: false as const, error: "No client record found." };
    }

    if (!helpscout.isConfigured()) {
      return { success: false as const, error: "Support system not configured." };
    }

    const conversations = await helpscout.getConversationsByEmail(client.email);
    return { success: true as const, data: conversations ?? [] };
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

    if (!helpscout.isConfigured()) {
      return { success: false as const, error: "Support system not configured." };
    }

    const conversation = await helpscout.getConversation(conversationId);
    if (!conversation) {
      return { success: false as const, error: "Ticket not found" };
    }

    // Verify this conversation belongs to the current user's email
    const client = await getClientEmail();
    const conversationEmail = (
      conversation.primaryCustomer?.email ??
      conversation.customer?.email ??
      ""
    ).toLowerCase();
    if (!client || conversationEmail !== client.email.toLowerCase()) {
      return {
        success: false as const,
        error: `Debug: conv=${conversationEmail}, client=${client?.email ?? "none"}, pCust=${JSON.stringify(conversation.primaryCustomer)}, cust=${JSON.stringify(conversation.customer)}`,
      };
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
    const client = await getClientEmail();
    if (!client) {
      return { success: false, error: "No client record found." };
    }

    if (!helpscout.isConfigured()) {
      return { success: false, error: "Support system not configured." };
    }

    await helpscout.createConversation(
      client.email,
      client.name,
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
    const client = await getClientEmail();
    if (!client) {
      return { success: false, error: "No client record found." };
    }

    if (!helpscout.isConfigured()) {
      return { success: false, error: "Support system not configured." };
    }

    await helpscout.replyToConversation(conversationId, client.email, body, attachments);
    return { success: true, data: null };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to send reply",
    };
  }
}
