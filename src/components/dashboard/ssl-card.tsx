import type { SiteCheck } from "@prisma/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, ShieldX } from "lucide-react";
import { differenceInDays, format } from "date-fns";

type Props = {
  siteCheck: SiteCheck | null;
  websiteUrl: string | null;
};

export function SSLCard({ siteCheck, websiteUrl }: Props) {
  if (!websiteUrl) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">SSL Certificate</CardTitle>
          <ShieldCheck className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No website URL configured.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!siteCheck || siteCheck.sslValid == null) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">SSL Certificate</CardTitle>
          <ShieldCheck className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            SSL data will be available after the next scan.
          </p>
        </CardContent>
      </Card>
    );
  }

  const daysRemaining = siteCheck.sslExpiresAt
    ? differenceInDays(new Date(siteCheck.sslExpiresAt), new Date())
    : null;

  const Icon = siteCheck.sslValid ? ShieldCheck : ShieldX;
  const expiryWarning = daysRemaining != null && daysRemaining <= 30;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">SSL Certificate</CardTitle>
        <Icon
          className={`h-4 w-4 ${siteCheck.sslValid ? "text-green-500" : "text-red-500"}`}
        />
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-center gap-2">
          <Badge variant={siteCheck.sslValid ? "default" : "destructive"}>
            {siteCheck.sslValid ? "Valid" : "Invalid"}
          </Badge>
          {expiryWarning && (
            <Badge variant="outline" className="text-orange-600 border-orange-300">
              Expires soon
            </Badge>
          )}
        </div>

        {siteCheck.sslIssuer && (
          <p className="text-sm text-muted-foreground">
            Issuer: {siteCheck.sslIssuer}
          </p>
        )}

        {siteCheck.sslExpiresAt && (
          <p className="text-sm text-muted-foreground">
            Expires: {format(new Date(siteCheck.sslExpiresAt), "MMM d, yyyy")}
            {daysRemaining != null && ` (${daysRemaining} days)`}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
