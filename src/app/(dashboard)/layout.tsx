import { getAuthUser, getRealAuthUser } from "@/lib/auth";
import { getBranding, getClientNavLinks } from "@/lib/branding";
import { resolveClientContext, getAccessibleClients } from "@/lib/client-context";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { Header } from "@/components/layout/header";
import { ImpersonationBanner } from "@/components/layout/impersonation-banner";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [effectiveUser, realUser, branding, clientCtx, accessibleClients, clientNavLinks] =
    await Promise.all([
      getAuthUser(),
      getRealAuthUser(),
      getBranding(),
      resolveClientContext(),
      getAccessibleClients(),
      getClientNavLinks(),
    ]);

  const isImpersonating = !!effectiveUser?.impersonating;

  // When impersonating, show admin nav based on the impersonated user's role
  const impersonatedRole = effectiveUser?.impersonating?.role;
  const isStaff = isImpersonating
    ? (impersonatedRole === "admin" || impersonatedRole === "team_member")
    : (realUser?.isStaff ?? false);
  const isAdmin = isImpersonating
    ? (impersonatedRole === "admin")
    : (realUser?.isAdmin ?? false);

  return (
    <SidebarProvider>
      <AppSidebar
        isStaff={isStaff}
        isAdmin={isAdmin}
        brandName={branding.name}
        brandTagline={branding.tagline}
        logoLight={branding.logoLight}
        logoDark={branding.logoDark}
        permissions={clientCtx?.permissions ?? null}
        accessibleClients={accessibleClients}
        activeClientId={clientCtx?.client.id ?? null}
        customLinks={clientNavLinks}
      />
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
