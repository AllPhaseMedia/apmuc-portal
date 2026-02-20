export const BRAND = {
  name: "APM | UC Support",
  fullName: "All Phase Media & UnionCoded",
  tagline: "Client Support Portal",
  description:
    "Manage your website, support requests, and billing in one place.",
  url: "https://clientsupport.app",
  company: {
    name: "All Phase Media",
    location: "Long Island, NY",
  },
} as const;

export const SERVICE_TYPE_LABELS: Record<string, string> = {
  HOSTING: "Hosting",
  MAINTENANCE: "Maintenance",
  SEO: "SEO",
  GOOGLE_ADS: "Google Ads",
  SOCIAL_MEDIA: "Social Media",
  WEB_DESIGN: "Web Design",
  EMAIL_MARKETING: "Email Marketing",
  CONTENT_WRITING: "Content Writing",
  BRANDING: "Branding",
  OTHER: "Other",
} as const;

export const NAV_ITEMS = {
  client: [
    { label: "Dashboard", href: "/dashboard", icon: "LayoutDashboard" },
    { label: "Support", href: "/support", icon: "MessageSquare" },
    { label: "Billing", href: "/billing", icon: "CreditCard" },
    { label: "Knowledge Base", href: "/knowledge-base", icon: "BookOpen" },
  ],
  admin: [
    { label: "Overview", href: "/admin", icon: "BarChart3" },
    { label: "Clients", href: "/admin/clients", icon: "Users" },
    { label: "Knowledge Base", href: "/admin/knowledge-base", icon: "FileText" },
    { label: "Services", href: "/admin/services", icon: "Package" },
  ],
} as const;
