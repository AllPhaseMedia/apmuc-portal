"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <Card className="max-w-md w-full">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
          <h1 className="text-xl font-bold mb-2">Something went wrong</h1>
          <p className="text-sm text-muted-foreground mb-6">
            {error.message || "An unexpected error occurred. Please try again."}
          </p>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => window.history.back()}>
              Go Back
            </Button>
            <Button onClick={reset}>Try Again</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
