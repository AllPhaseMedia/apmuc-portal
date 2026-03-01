import { requireStaff } from "@/lib/auth";
import { listTags } from "@/actions/admin/tags";
import { listCampaigns } from "@/actions/admin/email-campaigns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmailCompose } from "@/components/admin/email-compose";
import { EmailHistory } from "@/components/admin/email-history";

export default async function AdminEmailPage() {
  await requireStaff();
  const [allTags, campaignsResult] = await Promise.all([
    listTags(),
    listCampaigns(),
  ]);

  const campaigns = campaignsResult.success ? campaignsResult.data : [];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Email</h1>
        <p className="text-muted-foreground">
          Send mass emails and view campaign history.
        </p>
      </div>

      <Tabs defaultValue="compose">
        <TabsList>
          <TabsTrigger value="compose">Compose</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>
        <TabsContent value="compose" className="mt-4">
          <EmailCompose allTags={allTags} />
        </TabsContent>
        <TabsContent value="history" className="mt-4">
          <EmailHistory campaigns={campaigns} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
