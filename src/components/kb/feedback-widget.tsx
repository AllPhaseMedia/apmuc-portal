"use client";

import { useState } from "react";
import { toast } from "sonner";
import { submitFeedback } from "@/actions/knowledge-base";
import { Button } from "@/components/ui/button";
import { ThumbsUp, ThumbsDown } from "lucide-react";

type Props = {
  articleId: string;
  helpfulCount: number;
  notHelpfulCount: number;
};

export function FeedbackWidget({
  articleId,
  helpfulCount,
  notHelpfulCount,
}: Props) {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onFeedback(helpful: boolean) {
    setLoading(true);
    const result = await submitFeedback(articleId, helpful);
    if (result.success) {
      setSubmitted(true);
      toast.success("Thanks for your feedback!");
    } else {
      toast.error(result.error);
    }
    setLoading(false);
  }

  if (submitted) {
    return (
      <div className="rounded-lg border bg-muted/50 p-4 text-center">
        <p className="text-sm text-muted-foreground">
          Thank you for your feedback!
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-muted/50 p-4">
      <p className="text-sm font-medium mb-3">Was this article helpful?</p>
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onFeedback(true)}
          disabled={loading}
        >
          <ThumbsUp className="mr-2 h-4 w-4" />
          Yes ({helpfulCount})
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onFeedback(false)}
          disabled={loading}
        >
          <ThumbsDown className="mr-2 h-4 w-4" />
          No ({notHelpfulCount})
        </Button>
      </div>
    </div>
  );
}
