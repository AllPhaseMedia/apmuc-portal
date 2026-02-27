"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import {
  getDashboardMessage,
  saveDashboardMessage,
} from "@/actions/admin/branding";

export function DashboardTab() {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getDashboardMessage().then((result) => {
      if (result.success) {
        setMessage(result.data.message);
      }
      setLoading(false);
    });
  }, []);

  async function handleSave() {
    setSaving(true);
    const result = await saveDashboardMessage(message);
    if (result.success) toast.success(result.data.message);
    else toast.error(result.error);
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-8 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading dashboard settings...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Dashboard Announcement</CardTitle>
          <CardDescription>
            Display a message banner at the top of the dashboard for all
            logged-in users.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="dashboard-message">Message</Label>
            <Textarea
              id="dashboard-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={6}
              placeholder="Enter an announcement message..."
            />
            <p className="text-sm text-muted-foreground">
              Supports markdown formatting (bold, links, etc). Leave blank to
              hide the banner.
            </p>
          </div>
          <Button onClick={handleSave} disabled={saving} size="sm">
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Message
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
