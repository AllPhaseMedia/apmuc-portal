import { requireAuth } from "@/lib/auth";
import { getBillingData } from "@/actions/billing";
import { resolveClientContext } from "@/lib/client-context";
import { isConfigured } from "@/lib/stripe";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ManagePaymentButton } from "@/components/billing/manage-payment-button";
import { CreditCard, Receipt, FileDown, Wallet, ShieldX } from "lucide-react";
import { format } from "date-fns";

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amount / 100);
}

export default async function BillingPage() {
  await requireAuth();

  const ctx = await resolveClientContext();
  if (ctx && !ctx.permissions.billing) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Billing</h1>
          <p className="text-muted-foreground">
            Manage your subscription and invoices.
          </p>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <ShieldX className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-muted-foreground">
              You don&apos;t have permission to view billing information.
              Contact your account administrator for access.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isConfigured()) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Billing</h1>
          <p className="text-muted-foreground">
            Manage your subscription and invoices.
          </p>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Wallet className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-muted-foreground">
              Billing is being set up. Contact us for billing inquiries.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const result = await getBillingData();

  if (!result.success) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Billing</h1>
          <p className="text-muted-foreground">
            Manage your subscription and invoices.
          </p>
        </div>
        <Card>
          <CardContent className="py-6">
            <p className="text-sm text-muted-foreground">{result.error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { subscriptions, invoices, paymentMethods } = result.data;
  const activeSub = subscriptions.find(
    (s) => s.status === "active" || s.status === "trialing"
  );
  const primaryCard = paymentMethods[0];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Billing</h1>
        <p className="text-muted-foreground">
          Manage your subscription and invoices.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Subscription Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Subscription</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-2">
            {activeSub ? (
              <>
                <div className="flex items-center gap-2">
                  <p className="text-xl font-bold">
                    {(() => {
                      const item = activeSub.items?.data?.[0];
                      const product = item?.price?.product;
                      return product &&
                        typeof product === "object" &&
                        "name" in product
                        ? product.name
                        : "Active Plan";
                    })()}
                  </p>
                  <Badge variant="default">
                    {activeSub.status === "trialing" ? "Trial" : "Active"}
                  </Badge>
                </div>
                {(() => {
                  const periodEnd = (activeSub as unknown as Record<string, unknown>).current_period_end;
                  if (typeof periodEnd !== "number") return null;
                  return (
                    <p className="text-sm text-muted-foreground">
                      Next billing:{" "}
                      {format(new Date(periodEnd * 1000), "MMMM d, yyyy")}
                    </p>
                  );
                })()}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                No active subscription.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Payment Method Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Payment Method
            </CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-3">
            {primaryCard?.card ? (
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium capitalize">
                  {primaryCard.card.brand}
                </span>
                <span className="text-sm text-muted-foreground">
                  &bull;&bull;&bull;&bull; {primaryCard.card.last4}
                </span>
                <span className="text-xs text-muted-foreground">
                  Exp {primaryCard.card.exp_month}/{primaryCard.card.exp_year}
                </span>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No payment method on file.
              </p>
            )}
            <ManagePaymentButton />
          </CardContent>
        </Card>
      </div>

      {/* Invoice History */}
      <Card>
        <CardHeader>
          <CardTitle>Invoice History</CardTitle>
        </CardHeader>
        <CardContent>
          {invoices.length === 0 ? (
            <p className="text-sm text-muted-foreground">No invoices yet.</p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[80px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="text-muted-foreground">
                        {invoice.created
                          ? format(
                              new Date(invoice.created * 1000),
                              "MMM d, yyyy"
                            )
                          : "—"}
                      </TableCell>
                      <TableCell>
                        {invoice.lines?.data?.[0]?.description ||
                          invoice.number ||
                          "Invoice"}
                      </TableCell>
                      <TableCell>
                        {invoice.amount_due != null && invoice.currency
                          ? formatCurrency(
                              invoice.amount_due,
                              invoice.currency
                            )
                          : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            invoice.status === "paid"
                              ? "default"
                              : invoice.status === "open"
                                ? "secondary"
                                : "outline"
                          }
                        >
                          {invoice.status ?? "unknown"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {invoice.invoice_pdf && (
                          <Button variant="ghost" size="sm" asChild>
                            <a
                              href={invoice.invoice_pdf}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <FileDown className="h-4 w-4" />
                            </a>
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
