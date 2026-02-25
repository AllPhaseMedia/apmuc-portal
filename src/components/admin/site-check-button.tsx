"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { triggerSiteCheck } from "@/actions/admin/clients";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

type Props = {
  clientId: string;
  hasWebsiteUrl: boolean;
};

export function SiteCheckButton({ clientId, hasWebsiteUrl }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  if (!hasWebsiteUrl) return null;

  async function onClick() {
    setLoading(true);
    const result = await triggerSiteCheck(clientId);
    if (result.success) {
      toast.success("Site check complete — SSL and domain data updated");
      router.refresh();
    } else {
      toast.error(result.error);
    }
    setLoading(false);
  }

  return (
    <Button variant="outline" size="sm" onClick={onClick} disabled={loading}>
      <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
      {loading ? "Checking..." : "Run Site Check"}
    </Button>
  );
}
