"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { replyToTicket } from "@/actions/support";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send } from "lucide-react";

type Props = {
  conversationId: number;
};

export function ReplyForm({ conversationId }: Props) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;

    setLoading(true);
    const result = await replyToTicket(conversationId, body);
    if (result.success) {
      toast.success("Reply sent");
      setBody("");
      router.refresh();
    } else {
      toast.error(result.error);
    }
    setLoading(false);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <Textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={4}
        placeholder="Type your reply..."
        required
      />
      <div className="flex justify-end">
        <Button type="submit" disabled={loading || !body.trim()}>
          <Send className="mr-2 h-4 w-4" />
          {loading ? "Sending..." : "Send Reply"}
        </Button>
      </div>
    </form>
  );
}
