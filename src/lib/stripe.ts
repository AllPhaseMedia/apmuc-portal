import "server-only";
import Stripe from "stripe";

export function isConfigured(): boolean {
  return !!process.env.STRIPE_SECRET_KEY;
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_placeholder", {
  apiVersion: "2026-01-28.clover",
  typescript: true,
});

export async function getCustomerSubscriptions(customerId: string) {
  const subs = await stripe.subscriptions.list({
    customer: customerId,
    status: "all",
    limit: 10,
    expand: ["data.default_payment_method", "data.plan.product"],
  });
  return subs.data;
}

export async function getCustomerInvoices(customerId: string) {
  const invoices = await stripe.invoices.list({
    customer: customerId,
    limit: 24,
  });
  return invoices.data;
}

export async function getCustomerPaymentMethods(customerId: string) {
  const methods = await stripe.paymentMethods.list({
    customer: customerId,
    type: "card",
  });
  return methods.data;
}

export async function createBillingPortalSession(
  customerId: string,
  returnUrl: string
) {
  // Customer Portal — payment method management only, NO cancellation
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });
  return session;
}
