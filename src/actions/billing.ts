"use server";

import { requireAuth } from "@/lib/auth";
import { resolveClientContext } from "@/lib/client-context";
import * as stripeLib from "@/lib/stripe";
import type { ActionResult } from "@/types";
import { headers } from "next/headers";

export async function getBillingData() {
  try {
    await requireAuth();

    const ctx = await resolveClientContext();
    if (!ctx) {
      return { success: false as const, error: "No client record found." };
    }

    if (!ctx.permissions.billing) {
      return { success: false as const, error: "You don't have permission to view billing." };
    }

    if (!stripeLib.isConfigured()) {
      return { success: false as const, error: "Billing system not configured." };
    }

    const customerId = ctx.client.stripeCustomerId;
    if (!customerId) {
      return { success: false as const, error: "No billing account linked." };
    }

    const [subscriptions, invoices, paymentMethods] = await Promise.all([
      stripeLib.getCustomerSubscriptions(customerId),
      stripeLib.getCustomerInvoices(customerId),
      stripeLib.getCustomerPaymentMethods(customerId),
    ]);

    return {
      success: true as const,
      data: { subscriptions, invoices, paymentMethods },
    };
  } catch (error) {
    return {
      success: false as const,
      error: error instanceof Error ? error.message : "Failed to load billing data",
    };
  }
}

export async function createPortalSession(): Promise<ActionResult<string>> {
  try {
    await requireAuth();

    const ctx = await resolveClientContext();
    if (!ctx || !ctx.permissions.billing) {
      return { success: false, error: "Billing not available." };
    }

    if (!stripeLib.isConfigured() || !ctx.client.stripeCustomerId) {
      return { success: false, error: "Billing not available." };
    }

    const headerList = await headers();
    const origin = headerList.get("origin") || "http://localhost:3000";
    const session = await stripeLib.createBillingPortalSession(
      ctx.client.stripeCustomerId,
      `${origin}/billing`
    );

    return { success: true, data: session.url };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create portal session",
    };
  }
}
