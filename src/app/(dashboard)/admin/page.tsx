import { requireStaff } from "@/lib/auth";
import { getAdminOverview } from "@/actions/admin/overview";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, UserCheck, FileText, BookOpen } from "lucide-react";
import Link from "next/link";

export default async function AdminOverviewPage() {
  await requireStaff();
  const result = await getAdminOverview();

  if (!result.success) {
    return <p className="text-destructive">{result.error}</p>;
  }

  const { totalClients, activeClients, totalArticles, publishedArticles } =
    result.data;

  const stats = [
    {
      label: "Total Clients",
      value: totalClients,
      icon: Users,
      href: "/admin/clients",
    },
    {
      label: "Active Clients",
      value: activeClients,
      icon: UserCheck,
      href: "/admin/clients",
    },
    {
      label: "Total Articles",
      value: totalArticles,
      icon: FileText,
      href: "/admin/knowledge-base",
    },
    {
      label: "Published Articles",
      value: publishedArticles,
      icon: BookOpen,
      href: "/admin/knowledge-base",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Admin Overview</h1>
        <p className="text-muted-foreground">
          Manage clients, content, and services.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Link key={stat.label} href={stat.href}>
            <Card className="transition-colors hover:border-primary/50">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.label}
                </CardTitle>
                <stat.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{stat.value}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
