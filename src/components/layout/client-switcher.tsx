"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { switchActiveClient } from "@/actions/client-switcher";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronsUpDown, Check, Building2 } from "lucide-react";

type ClientOption = {
  id: string;
  name: string;
  accessType: "primary" | "contact";
};

type Props = {
  clients: ClientOption[];
  activeClientId: string;
};

export function ClientSwitcher({ clients, activeClientId }: Props) {
  const router = useRouter();
  const [switching, setSwitching] = useState(false);

  if (clients.length < 2) return null;

  const active = clients.find((c) => c.id === activeClientId) ?? clients[0];

  async function handleSwitch(clientId: string) {
    if (clientId === activeClientId) return;
    setSwitching(true);
    await switchActiveClient(clientId);
    router.refresh();
    setSwitching(false);
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="w-full justify-between px-3 py-2 h-auto"
          disabled={switching}
        >
          <div className="flex items-center gap-2 min-w-0">
            <Building2 className="h-4 w-4 shrink-0 text-sidebar-foreground/60" />
            <span className="text-xs font-medium truncate max-w-[140px]">
              {active.name}
            </span>
          </div>
          <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-sidebar-foreground/50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel>Switch Client</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {clients.map((client) => (
          <DropdownMenuItem
            key={client.id}
            onClick={() => handleSwitch(client.id)}
            className="flex items-center justify-between"
          >
            <span className="truncate font-medium">
              {client.name}
            </span>
            {client.id === activeClientId && (
              <Check className="h-4 w-4 shrink-0" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
