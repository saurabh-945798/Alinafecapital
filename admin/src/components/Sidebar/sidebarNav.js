import {
  LayoutDashboard,
  FileText,
  Users,
  Settings,
  ShieldCheck,
  Package,
  MessageSquare,
} from "lucide-react";

export const sidebarNav = [
  {
    section: "Core",
    items: [
      { label: "Dashboard", to: "/admin", icon: LayoutDashboard },
      { label: "Applications", to: "/admin/applications", icon: FileText },
    ],
  },
  {
    section: "Operations",
    items: [
      { label: "Loan Products", to: "/admin/loan-products", icon: Package },
      { label: "Loan Inquiries", to: "/admin/inquiries", icon: MessageSquare },
      { label: "Customers", to: "/admin/customers", icon: Users },
      { label: "KYC Review", to: "/admin/compliance", icon: ShieldCheck },
    ],
  },
  {
    section: "System",
    items: [{ label: "Settings", to: "/admin/settings", icon: Settings }],
  },
];
