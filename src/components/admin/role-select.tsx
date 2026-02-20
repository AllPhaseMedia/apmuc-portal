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
  employee: "secondary",
  client: "outline",
};

type Props = {
  userId: string;
  currentRole: string;
  isCurrentUser: boolean;
};

export function RoleSelect({ userId, currentRole, isCurrentUser }: Props) {
  const router = useRouter();

  if (isCurrentUser) {
    return (
      <Badge variant={ROLE_VARIANT[currentRole] ?? "outline"}>
        {currentRole}
      </Badge>
    );
  }

  async function onChange(value: string) {
    const result = await setUserRole(userId, value as "admin" | "employee" | "client");
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
        <SelectItem value="employee">Employee</SelectItem>
        <SelectItem value="client">Client</SelectItem>
      </SelectContent>
    </Select>
  );
}
