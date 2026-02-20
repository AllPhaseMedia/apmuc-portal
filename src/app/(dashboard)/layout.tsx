import { getAuthUser, getRealAuthUser } from "@/lib/auth";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { Header } from "@/components/layout/header";
import { ImpersonationBanner } from "@/components/layout/impersonation-banner";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [effectiveUser, realUser] = await Promise.all([
    getAuthUser(),
    getRealAuthUser(),
  ]);

  // Show admin nav if the REAL user is staff (admin or employee)
  const isStaff = realUser?.isStaff ?? false;
  const isAdmin = realUser?.isAdmin ?? false;
  const isImpersonating = !!effectiveUser?.impersonating;

  return (
    <SidebarProvider>
      <AppSidebar isStaff={isStaff} isAdmin={isAdmin} />
      <SidebarInset>
        {isImpersonating && effectiveUser?.impersonating && (
          <ImpersonationBanner
            userName={effectiveUser.impersonating.name}
            userEmail={effectiveUser.impersonating.email}
            userRole={effectiveUser.impersonating.role}
          />
        )}
        <Header />
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
