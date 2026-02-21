"use client";

import { useRouter } from "next/navigation";
import { stopImpersonation } from "@/actions/admin/impersonate";
import { Button } from "@/components/ui/button";
import { Eye, X } from "lucide-react";

type Props = {
  userName: string;
  userEmail: string;
  userRole: string;
};

export function ImpersonationBanner({ userName, userEmail, userRole }: Props) {
  const router = useRouter();

  async function onStop() {
    await stopImpersonation();
    router.refresh();
  }

  return (
    <div className="bg-orange-500 text-white px-4 py-2 flex items-center justify-between gap-4 text-sm">
      <div className="flex items-center gap-2">
        <Eye className="h-4 w-4" />
        <span>
          Viewing as <strong>{userName}</strong> ({userEmail}) — {userRole === "team_member" ? "Team Member" : userRole}
        </span>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={onStop}
        className="text-white hover:bg-orange-600 hover:text-white h-7 px-2"
      >
        <X className="h-4 w-4 mr-1" />
        Stop
      </Button>
    </div>
  );
}
