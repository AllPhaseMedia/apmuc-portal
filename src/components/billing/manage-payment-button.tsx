"use client";

import { useState } from "react";
import { toast } from "sonner";
import { createPortalSession } from "@/actions/billing";
import { Button } from "@/components/ui/button";
import { CreditCard } from "lucide-react";

export function ManagePaymentButton() {
  const [loading, setLoading] = useState(false);

  async function onClick() {
    setLoading(true);
    const result = await createPortalSession();
    if (result.success) {
      window.location.href = result.data;
    } else {
      toast.error(result.error);
      setLoading(false);
    }
  }

  return (
    <Button variant="outline" onClick={onClick} disabled={loading}>
      <CreditCard className="mr-2 h-4 w-4" />
      {loading ? "Redirecting..." : "Manage Payment Method"}
    </Button>
  );
}
