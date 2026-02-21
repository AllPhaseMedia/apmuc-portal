"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  MessageSquare,
  CreditCard,
  BookOpen,
  BarChart3,
  Users,
  FileText,
  Package,
  ClipboardList,
  Settings,
  UserCog,
} from "lucide-react";
import { UserButton } from "@clerk/nextjs";

import { BrandLogo } from "@/components/branding/brand-logo";
import { ClientSwitcher } from "@/components/layout/client-switcher";
import type { ContactPermissions } from "@/types";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";

const icons = {
  LayoutDashboard,
  MessageSquare,
  CreditCard,
  BookOpen,
  BarChart3,
  Users,
  FileText,
  Package,
  ClipboardList,
  Settings,
  UserCog,
} as const;

type NavItem = {
  label: string;
  href: string;
  icon: keyof typeof icons;
  permission?: keyof ContactPermissions;
};

const clientNav: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: "LayoutDashboard", permission: "dashboard" },
  { label: "Support", href: "/support", icon: "MessageSquare", permission: "support" },
  { label: "Billing", href: "/billing", icon: "CreditCard", permission: "billing" },
  { label: "Knowledge Base", href: "/knowledge-base", icon: "BookOpen" },
];

const staffNav = [
  { label: "Overview", href: "/admin", icon: "BarChart3" },
  { label: "Clients", href: "/admin/clients", icon: "Users" },
  { label: "Knowledge Base", href: "/admin/knowledge-base", icon: "FileText" },
  { label: "Services", href: "/admin/services", icon: "Package" },
  { label: "Forms", href: "/admin/forms", icon: "ClipboardList" },
  { label: "Settings", href: "/admin/settings", icon: "Settings" },
] as const;

// Admin-only nav items (not shown to team members)
const adminOnlyNav = [
  { label: "Users", href: "/admin/users", icon: "UserCog" },
] as const;

type ClientOption = {
  id: string;
  name: string;
  accessType: "primary" | "contact";
};

type Props = {
  isStaff: boolean;
  isAdmin: boolean;
  brandName?: string;
  brandTagline?: string;
  logoLight?: string;
  logoDark?: string;
  permissions?: ContactPermissions | null;
  accessibleClients?: ClientOption[];
  activeClientId?: string | null;
};

export function AppSidebar({
  isStaff,
  isAdmin,
  brandName = "APM | UC Support",
  brandTagline = "Client Support Portal",
  logoLight = "",
  logoDark = "",
  permissions = null,
  accessibleClients = [],
  activeClientId = null,
}: Props) {
  const pathname = usePathname();

  // Filter client nav by permissions (null permissions = staff/admin, show all)
  const filteredClientNav = clientNav.filter((item) => {
    if (!item.permission) return true;
    if (!permissions) return true; // no client context (admin) → show all
    return permissions[item.permission];
  });

  return (
    <Sidebar>
      <SidebarHeader className="px-4 py-5">
        <Link href="/dashboard" className="flex items-center gap-2">
          <BrandLogo
            logoLight={logoLight}
            logoDark={logoDark}
            brandName={brandName}
            size={32}
          />
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-sidebar-foreground">
              {brandName}
            </span>
            <span className="text-xs text-sidebar-foreground/60">
              {brandTagline}
            </span>
          </div>
        </Link>
        {accessibleClients.length >= 2 && activeClientId && (
          <div className="mt-3">
            <ClientSwitcher
              clients={accessibleClients}
              activeClientId={activeClientId}
            />
          </div>
        )}
      </SidebarHeader>

      <SidebarSeparator />

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {filteredClientNav.map((item) => {
                const Icon = icons[item.icon];
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/dashboard" &&
                    pathname.startsWith(item.href));
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={isActive} tooltip={item.label}>
                      <Link href={item.href}>
                        <Icon />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {isStaff && (
          <>
            <SidebarSeparator />
            <SidebarGroup>
              <SidebarGroupLabel>Admin</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {staffNav.map((item) => {
                    const Icon = icons[item.icon];
                    const isActive =
                      item.href === "/admin"
                        ? pathname === "/admin"
                        : pathname.startsWith(item.href);
                    return (
                      <SidebarMenuItem key={item.href}>
                        <SidebarMenuButton asChild isActive={isActive} tooltip={item.label}>
                          <Link href={item.href}>
                            <Icon />
                            <span>{item.label}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                  {isAdmin &&
                    adminOnlyNav.map((item) => {
                      const Icon = icons[item.icon];
                      const isActive = pathname.startsWith(item.href);
                      return (
                        <SidebarMenuItem key={item.href}>
                          <SidebarMenuButton asChild isActive={isActive} tooltip={item.label}>
                            <Link href={item.href}>
                              <Icon />
                              <span>{item.label}</span>
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      );
                    })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        )}
      </SidebarContent>

      <SidebarFooter>
        <SidebarSeparator />
        <div className="flex items-center gap-3 px-2 py-2">
          <UserButton
            afterSignOutUrl="/sign-in"
            appearance={{
              elements: {
                avatarBox: "h-8 w-8",
              },
            }}
          />
          <div className="flex flex-col overflow-hidden">
            <span className="truncate text-sm font-medium text-sidebar-foreground">
              Account
            </span>
            <Link
              href="/settings"
              className="truncate text-xs text-sidebar-foreground/60 hover:text-sidebar-foreground/80"
            >
              Settings
            </Link>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
