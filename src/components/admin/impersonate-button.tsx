"use client";

import { useRouter } from "next/navigation";
import { startImpersonation } from "@/actions/admin/impersonate";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";

type Props = {
  userId: string;
  userName: string;
};

export function ImpersonateButton({ userId, userName }: Props) {
  const router = useRouter();

  async function onClick() {
    await startImpersonation(userId);
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <Button variant="ghost" size="sm" onClick={onClick} title={`View as ${userName}`}>
      <Eye className="mr-2 h-4 w-4" />
      Impersonate
    </Button>
  );
}
