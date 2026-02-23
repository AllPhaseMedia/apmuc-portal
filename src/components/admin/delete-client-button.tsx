"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { archiveClient, deleteClient } from "@/actions/admin/clients";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Archive, Trash2, ChevronDown } from "lucide-react";

type Props = {
  clientId: string;
  clientName: string;
};

export function DeleteClientButton({ clientId, clientName }: Props) {
  const router = useRouter();
  const [action, setAction] = useState<"archive" | "delete" | null>(null);
  const [loading, setLoading] = useState(false);

  async function onConfirm() {
    setLoading(true);
    const result =
      action === "delete"
        ? await deleteClient(clientId)
        : await archiveClient(clientId);

    if (result.success) {
      toast.success(action === "delete" ? "Client permanently deleted" : "Client archived");
      router.push("/admin/clients");
      router.refresh();
    } else {
      toast.error(result.error);
    }
    setLoading(false);
    setAction(null);
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="destructive" size="sm">
            <Trash2 className="mr-2 h-4 w-4" />
            Remove
            <ChevronDown className="ml-1 h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setAction("archive")}>
            <Archive className="mr-2 h-4 w-4" />
            Archive
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setAction("delete")}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete permanently
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={action !== null} onOpenChange={(open) => !open && setAction(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {action === "delete" ? "Delete Client Permanently" : "Archive Client"}
            </DialogTitle>
            <DialogDescription>
              {action === "delete"
                ? `Are you sure you want to permanently delete "${clientName}"? This will remove all associated contacts, services, and site checks. This cannot be undone.`
                : `Archive "${clientName}"? The client will be hidden from the active list but can be restored later.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAction(null)}>
              Cancel
            </Button>
            <Button
              variant={action === "delete" ? "destructive" : "default"}
              onClick={onConfirm}
              disabled={loading}
            >
              {loading
                ? action === "delete" ? "Deleting..." : "Archiving..."
                : action === "delete" ? "Delete permanently" : "Archive"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
