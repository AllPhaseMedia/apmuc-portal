"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { setUserRole } from "@/actions/admin/impersonate";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ROLE_VARIANT: Record<string, "default" | "secondary" | "outline"> = {
  admin: "default",
  team_member: "secondary",
  client: "outline",
};

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  team_member: "Team Member",
  client: "Client",
};

type Props = {
  userId: string;
  currentRole: string;
  isCurrentUser: boolean;
  isAdmin?: boolean;
};

export function RoleSelect({ userId, currentRole, isCurrentUser, isAdmin = false }: Props) {
  const router = useRouter();

  if (isCurrentUser || !isAdmin) {
    return (
      <Badge variant={ROLE_VARIANT[currentRole] ?? "outline"}>
        {ROLE_LABELS[currentRole] ?? currentRole}
      </Badge>
    );
  }

  async function onChange(value: string) {
    const result = await setUserRole(userId, value as "admin" | "team_member" | "client");
    if (result.success) {
      toast.success("Role updated");
      router.refresh();
    }
  }

  return (
    <Select defaultValue={currentRole} onValueChange={onChange}>
      <SelectTrigger className="w-[120px] h-8">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="admin">Admin</SelectItem>
        <SelectItem value="team_member">Team Member</SelectItem>
        <SelectItem value="client">Client</SelectItem>
      </SelectContent>
    </Select>
  );
}
