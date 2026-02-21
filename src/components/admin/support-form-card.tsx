"use client";

import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Pencil, Plus } from "lucide-react";

interface SupportFormCardProps {
  supportForm: { id: string; isActive: boolean; name: string } | null;
}

export function SupportFormCard({ supportForm }: SupportFormCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          <CardTitle>Support Request Form</CardTitle>
        </div>
        <CardDescription>
          The support ticket page at <code className="text-xs bg-muted px-1 py-0.5 rounded">/support/new</code> can
          use a dynamic form from the form builder. Create a form with
          slug <code className="text-xs bg-muted px-1 py-0.5 rounded">support-request</code> and
          set its handler to Help Scout.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {supportForm ? (
          <div className="flex items-center gap-3">
            <Badge variant={supportForm.isActive ? "default" : "secondary"}>
              {supportForm.isActive ? "Active" : "Inactive"}
            </Badge>
            <span className="text-sm">{supportForm.name}</span>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/admin/forms/${supportForm.id}`}>
                <Pencil className="h-3.5 w-3.5 mr-1.5" />
                Edit Form
              </Link>
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <Badge variant="secondary">Not Created</Badge>
            <span className="text-sm text-muted-foreground">
              Using default hardcoded form
            </span>
            <Button variant="outline" size="sm" asChild>
              <Link href="/admin/forms/new">
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                Create Support Form
              </Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
