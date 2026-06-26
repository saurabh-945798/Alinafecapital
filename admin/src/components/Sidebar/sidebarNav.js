import {
  LayoutDashboard,
  FileText,
  Settings,
  Package,
  Wallet,
  BarChart3,
  MessageSquareWarning,
  Users,
} from "lucide-react";

export const sidebarNav = [
  {
    section: "Core",
    items: [
      { label: "Dashboard", to: "/admin", icon: LayoutDashboard },
      {
        key: "applications",
        label: "Applications",
        to: "/admin/applications",
        icon: FileText,
        roles: ["SUPER_ADMIN", "VERIFIER", "APPROVAL", "AUTHORIZED", "DISBURSED"],
      },
    ],
  },
  {
    section: "Operations",
    items: [
      { label: "Payments", to: "/admin/payments", icon: Wallet, roles: ["SUPER_ADMIN", "DISBURSED"] },
      { label: "Reports", to: "/admin/reports", icon: BarChart3, roles: ["SUPER_ADMIN"] },
      { label: "Analytics", to: "/admin/analytics", icon: BarChart3, roles: ["SUPER_ADMIN"] },
      { label: "Loan Products", to: "/admin/loan-products", icon: Package, roles: ["SUPER_ADMIN"] },
      { label: "Complaints", to: "/admin/complaints", icon: MessageSquareWarning, roles: ["SUPER_ADMIN", "VERIFIER"] },
    ],
  },
  {
    section: "System",
    items: [
      { label: "User Access", to: "/admin/user-access", icon: Users, roles: ["SUPER_ADMIN"] },
      { label: "Settings", to: "/admin/settings", icon: Settings, roles: ["SUPER_ADMIN"] },
    ],
  },
];


