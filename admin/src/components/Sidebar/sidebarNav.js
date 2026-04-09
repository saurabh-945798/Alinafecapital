import {
  LayoutDashboard,
  FileText,
  Settings,
  Package,
  Wallet,
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
      { label: "Accounts", to: "/admin/accounts", icon: Wallet },
      { label: "Loan Products", to: "/admin/loan-products", icon: Package },
    ],
  },
  {
    section: "System",
    items: [{ label: "Settings", to: "/admin/settings", icon: Settings }],
  },
];
