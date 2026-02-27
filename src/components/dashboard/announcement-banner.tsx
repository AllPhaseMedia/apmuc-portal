"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Info, X } from "lucide-react";

type Props = {
  message: string;
  messageId: string;
};

const DISMISS_KEY = "dismissed-announcement";

export function AnnouncementBanner({ message, messageId }: Props) {
  const [dismissed, setDismissed] = useState(true); // default hidden to avoid flash

  useEffect(() => {
    const stored = localStorage.getItem(DISMISS_KEY);
    setDismissed(stored === messageId);
  }, [messageId]);

  if (!message || dismissed) return null;

  function handleDismiss() {
    localStorage.setItem(DISMISS_KEY, messageId);
    setDismissed(true);
  }

  // Simple markdown-ish rendering: handle **bold** and [links](url)
  function renderContent(text: string) {
    return text.split("\n").map((line, i) => {
      // Process **bold** and [link](url)
      const parts = line.split(/(\*\*.*?\*\*|\[.*?\]\(.*?\))/g);
      const rendered = parts.map((part, j) => {
        // Bold
        const boldMatch = part.match(/^\*\*(.*?)\*\*$/);
        if (boldMatch) return <strong key={j}>{boldMatch[1]}</strong>;
        // Link
        const linkMatch = part.match(/^\[(.*?)\]\((.*?)\)$/);
        if (linkMatch) {
          return (
            <a
              key={j}
              href={linkMatch[2]}
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-medium hover:text-primary"
            >
              {linkMatch[1]}
            </a>
          );
        }
        return <span key={j}>{part}</span>;
      });
      return (
        <span key={i}>
          {i > 0 && <br />}
          {rendered}
        </span>
      );
    });
  }

  return (
    <Card className="border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/50">
      <CardContent className="flex items-start gap-3 py-3">
        <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
        <div className="flex-1 text-sm text-blue-900 dark:text-blue-100">
          {renderContent(message)}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 shrink-0 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 hover:bg-blue-100 dark:hover:bg-blue-900"
          onClick={handleDismiss}
        >
          <X className="h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );
}
