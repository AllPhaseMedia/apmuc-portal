import type { SiteCheck } from "@prisma/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Globe } from "lucide-react";
import { differenceInDays, format } from "date-fns";

type Props = {
  siteCheck: SiteCheck | null;
  websiteUrl: string | null;
};

export function DomainCard({ siteCheck, websiteUrl }: Props) {
  if (!websiteUrl) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Domain</CardTitle>
          <Globe className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No website URL configured.</p>
        </CardContent>
      </Card>
    );
  }

  if (!siteCheck?.domainRegistrar && !siteCheck?.domainExpiresAt) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Domain</CardTitle>
          <Globe className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Domain info will be available after the next scan.
          </p>
        </CardContent>
      </Card>
    );
  }

  const daysRemaining = siteCheck.domainExpiresAt
    ? differenceInDays(new Date(siteCheck.domainExpiresAt), new Date())
    : null;
  const expiryWarning = daysRemaining != null && daysRemaining <= 30;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">Domain</CardTitle>
        <Globe className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent className="space-y-2">
        {siteCheck.domainRegistrar && (
          <p className="text-sm text-muted-foreground">
            Registrar: {siteCheck.domainRegistrar}
          </p>
        )}
        {siteCheck.domainExpiresAt && (
          <div className="flex items-center gap-2">
            <p className="text-sm text-muted-foreground">
              Expires: {format(new Date(siteCheck.domainExpiresAt), "MMM d, yyyy")}
              {daysRemaining != null && ` (${daysRemaining} days)`}
            </p>
            {expiryWarning && (
              <Badge variant="outline" className="text-orange-600 border-orange-300">
                Expires soon
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
