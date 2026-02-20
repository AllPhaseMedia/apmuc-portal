"use server";

import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import * as stripeLib from "@/lib/stripe";
import type { ActionResult } from "@/types";
import { headers } from "next/headers";

async function getStripeCustomerId() {
  const user = await requireAuth();
  const client = await prisma.client.findFirst({
    where: { clerkUserId: user.clerkUserId },
    select: { stripeCustomerId: true },
  });
  return client?.stripeCustomerId ?? null;
}

export async function getBillingData() {
  try {
    const customerId = await getStripeCustomerId();

    if (!stripeLib.isConfigured()) {
      return { success: false as const, error: "Billing system not configured." };
    }

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
    const customerId = await getStripeCustomerId();

    if (!stripeLib.isConfigured() || !customerId) {
      return { success: false, error: "Billing not available." };
    }

    const headerList = await headers();
    const origin = headerList.get("origin") || "http://localhost:3000";
    const session = await stripeLib.createBillingPortalSession(
      customerId,
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
