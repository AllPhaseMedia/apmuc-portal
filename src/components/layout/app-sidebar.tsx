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
  Settings,
  UserCog,
} from "lucide-react";
import { UserButton } from "@clerk/nextjs";

import { BRAND } from "@/lib/constants";
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
  Settings,
  UserCog,
} as const;

const clientNav = [
  { label: "Dashboard", href: "/dashboard", icon: "LayoutDashboard" },
  { label: "Support", href: "/support", icon: "MessageSquare" },
  { label: "Billing", href: "/billing", icon: "CreditCard" },
  { label: "Knowledge Base", href: "/knowledge-base", icon: "BookOpen" },
] as const;

const staffNav = [
  { label: "Overview", href: "/admin", icon: "BarChart3" },
  { label: "Clients", href: "/admin/clients", icon: "Users" },
  { label: "Knowledge Base", href: "/admin/knowledge-base", icon: "FileText" },
  { label: "Services", href: "/admin/services", icon: "Package" },
] as const;

// Admin-only nav items (not shown to employees)
const adminOnlyNav = [
  { label: "Users", href: "/admin/users", icon: "UserCog" },
] as const;

type Props = {
  isStaff: boolean;
  isAdmin: boolean;
};

export function AppSidebar({ isStaff, isAdmin }: Props) {
  const pathname = usePathname();

  return (
    <Sidebar>
      <SidebarHeader className="px-4 py-5">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground font-bold text-sm">
            A
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-sidebar-foreground">
              {BRAND.name}
            </span>
            <span className="text-xs text-sidebar-foreground/60">
              {BRAND.tagline}
            </span>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarSeparator />

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {clientNav.map((item) => {
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
