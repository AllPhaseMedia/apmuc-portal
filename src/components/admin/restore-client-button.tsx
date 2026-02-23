"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { restoreClient } from "@/actions/admin/clients";
import { Button } from "@/components/ui/button";
import { ArchiveRestore } from "lucide-react";

type Props = {
  clientId: string;
};

export function RestoreClientButton({ clientId }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function onRestore() {
    setLoading(true);
    const result = await restoreClient(clientId);
    if (result.success) {
      toast.success("Client restored");
      router.refresh();
    } else {
      toast.error(result.error);
    }
    setLoading(false);
  }

  return (
    <Button variant="outline" size="sm" onClick={onRestore} disabled={loading}>
      <ArchiveRestore className="mr-2 h-4 w-4" />
      {loading ? "Restoring..." : "Restore"}
    </Button>
  );
}
