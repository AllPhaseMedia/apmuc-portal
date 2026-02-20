import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import type Stripe from "stripe";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Verification failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        // Log subscription changes — the portal fetches live data from Stripe
        // so we don't need to cache subscription status locally.
        // This webhook is here for future use (e.g., send notifications).
        const subscription = event.data.object as Stripe.Subscription;
        console.log(
          `Stripe: subscription ${subscription.id} ${subscription.status}`
        );
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        console.log(
          `Stripe: invoice ${invoice.id} paid — ${invoice.amount_paid}`
        );
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        console.log(
          `Stripe: invoice ${invoice.id} payment failed for customer ${invoice.customer}`
        );
        // TODO: Send notification to admin about failed payment
        break;
      }

      case "customer.updated": {
        // Sync email changes from Stripe back to our DB
        const customer = event.data.object as Stripe.Customer;
        if (customer.email) {
          await prisma.client.updateMany({
            where: { stripeCustomerId: customer.id },
            data: { email: customer.email },
          });
        }
        break;
      }
    }
  } catch (error) {
    console.error("Stripe webhook processing error:", error);
    // Return 200 anyway to prevent Stripe from retrying
  }

  return NextResponse.json({ received: true });
}
