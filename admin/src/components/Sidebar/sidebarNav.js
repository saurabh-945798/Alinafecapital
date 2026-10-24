
import {
  LayoutDashboard,
  FileText,
  Settings,
  Package,
  Wallet,
  BarChart3,
  MessageSquareWarning,
  Users,
  ShieldCheck,
  ClipboardCheck,
  BookOpenCheck,
  History,
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
        roles: ["SUPER_ADMIN", "VERIFIER", "RISK_ANALYST", "APPROVAL", "AUTHORIZED", "DISBURSED", "AUDITOR"],
      },
    ],
  },
  {
    section: "Operations",
    items: [
      { label: "Risk Assessment", to: "/admin/risk-assessment", icon: ShieldCheck, roles: ["SUPER_ADMIN", "RISK_ANALYST", "APPROVAL", "AUTHORIZED", "AUDITOR"] },
      { label: "Disbursement", to: "/admin/disbursement", icon: Wallet, roles: ["SUPER_ADMIN", "DISBURSED"] },
      { label: "Payment Verification", to: "/admin/payment-verification", icon: ClipboardCheck, roles: ["SUPER_ADMIN", "PAYMENT_VERIFIER", "AUDITOR"] },
      { label: "Payments", to: "/admin/payments", icon: Wallet, roles: ["SUPER_ADMIN", "DISBURSED", "PAYMENT_VERIFIER", "AUDITOR"] },
      { label: "Financial Journal", to: "/admin/financial-journal", icon: BookOpenCheck, roles: ["SUPER_ADMIN", "PAYMENT_VERIFIER", "AUDITOR"] },
      { label: "Audit Trail", to: "/admin/audit-trail", icon: History, roles: ["SUPER_ADMIN", "AUDITOR"] },
      { label: "Customers", to: "/admin/customers", icon: Users, roles: ["SUPER_ADMIN", "VERIFIER", "RISK_ANALYST", "APPROVAL", "AUTHORIZED", "DISBURSED", "AUDITOR"] },
      { label: "KYC Review", to: "/admin/compliance", icon: FileText, roles: ["SUPER_ADMIN", "VERIFIER"] },
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
