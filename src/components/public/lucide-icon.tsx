"use client";

import {
  MessageSquare,
  CreditCard,
  BookOpen,
  Shield,
  Zap,
  Globe,
  HeadphonesIcon,
  BarChart3,
  Settings,
  Lock,
  Mail,
  Phone,
  Clock,
  CheckCircle,
  Star,
  Heart,
  Users,
  FileText,
  Search,
  Bell,
  Lightbulb,
  Rocket,
  Code,
  Database,
  Cloud,
  Palette,
  Wrench,
  TrendingUp,
  Award,
  HelpCircle,
  type LucideIcon,
} from "lucide-react";

export const ICON_MAP: Record<string, LucideIcon> = {
  MessageSquare,
  CreditCard,
  BookOpen,
  Shield,
  Zap,
  Globe,
  Headphones: HeadphonesIcon,
  BarChart3,
  Settings,
  Lock,
  Mail,
  Phone,
  Clock,
  CheckCircle,
  Star,
  Heart,
  Users,
  FileText,
  Search,
  Bell,
  Lightbulb,
  Rocket,
  Code,
  Database,
  Cloud,
  Palette,
  Wrench,
  TrendingUp,
  Award,
  HelpCircle,
};

export const ICON_NAMES = Object.keys(ICON_MAP);

type Props = {
  name: string;
  className?: string;
};

export function LucideIcon({ name, className = "h-6 w-6" }: Props) {
  const Icon = ICON_MAP[name] || HelpCircle;
  return <Icon className={className} />;
}
