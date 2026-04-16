import {
  LayoutDashboard,
  FileText,
  Settings,
  Package,
  Wallet,
  MessageSquareWarning,
} from "lucide-react";

export const sidebarNav = [
  {
    section: "Core",
    items: [
      { label: "Dashboard", to: "/admin", icon: LayoutDashboard },
      { key: "applications", label: "Applications", to: "/admin/applications", icon: FileText },
    ],
  },
  {
    section: "Operations",
    items: [
      { label: "Payments", to: "/admin/payments", icon: Wallet },
      { label: "Loan Products", to: "/admin/loan-products", icon: Package },
      { label: "Complaints", to: "/admin/complaints", icon: MessageSquareWarning },
    ],
  },
  {
    section: "System",
    items: [{ label: "Settings", to: "/admin/settings", icon: Settings }],
  },
];
