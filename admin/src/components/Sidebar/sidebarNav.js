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
        roles: ["SUPER_ADMIN", "LOAN_OPERATIONS", "VERIFIER", "RISK_ANALYST", "APPROVAL", "AUTHORIZED", "DISBURSED", "CUSTOMER_SERVICE", "AUDITOR"],
      },
    ],
  },
  {
    section: "Operations",
    items: [
      { label: "Risk Assessment", to: "/admin/risk-assessment", icon: ShieldCheck, roles: ["SUPER_ADMIN", "RISK_ANALYST", "APPROVAL", "AUTHORIZED", "AUDITOR"] },
      { label: "Payment Verification", to: "/admin/payment-verification", icon: ClipboardCheck, roles: ["SUPER_ADMIN", "PAYMENT_VERIFIER", "FINANCE_RECON", "AUDITOR"] },
      { label: "Payments", to: "/admin/payments", icon: Wallet, roles: ["SUPER_ADMIN", "DISBURSED", "PAYMENT_VERIFIER", "FINANCE_RECON", "COLLECTIONS", "REPORTING_MIS", "AUDITOR"] },
      { label: "Financial Journal", to: "/admin/financial-journal", icon: BookOpenCheck, roles: ["SUPER_ADMIN", "FINANCE_RECON", "AUDITOR"] },
      { label: "Audit Trail", to: "/admin/audit-trail", icon: History, roles: ["SUPER_ADMIN", "AUDITOR"] },
      { label: "Customers", to: "/admin/customers", icon: Users, roles: ["SUPER_ADMIN", "LOAN_OPERATIONS", "VERIFIER", "RISK_ANALYST", "APPROVAL", "AUTHORIZED", "DISBURSED", "COLLECTIONS", "CUSTOMER_SERVICE", "AUDITOR"] },
      { label: "KYC Review", to: "/admin/compliance", icon: FileText, roles: ["SUPER_ADMIN", "VERIFIER"] },
      { label: "Reports", to: "/admin/reports", icon: BarChart3, roles: ["SUPER_ADMIN", "REPORTING_MIS", "AUDITOR"] },
      { label: "Analytics", to: "/admin/analytics", icon: BarChart3, roles: ["SUPER_ADMIN", "REPORTING_MIS", "AUDITOR"] },
      { label: "Loan Products", to: "/admin/loan-products", icon: Package, roles: ["SUPER_ADMIN"] },
      { label: "Complaints", to: "/admin/complaints", icon: MessageSquareWarning, roles: ["SUPER_ADMIN", "CUSTOMER_SERVICE", "AUDITOR"] },
    ],
  },
  {
    section: "System",
    items: [
      { label: "User Access", to: "/admin/user-access", icon: Users, roles: ["SUPER_ADMIN"] },
      { label: "Settings", to: "/admin/settings", icon: Settings, roles: ["SUPER_ADMIN", "TECH_SUPPORT"] },
    ],
  },
];
