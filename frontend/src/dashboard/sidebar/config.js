import { Icons } from "./icons";

export function buildSidebarGroups(counters = {}) {
  const unpaidInstallments = Number(counters?.unpaidInstallments || 0);

  const navConfig = [
    {
      group: "Overview",
      items: [
        { id: "overview", label: "Overview", icon: Icons.Home, onClickKey: "overview" },
      ],
    },
    {
      group: "Loans",
      items: [
        {
          id: "my-applications",
          label: "My Applications",
          icon: Icons.FileText,
          onClickKey: "my-applications",
        },
        {
          id: "apply-loan",
          label: "Apply Loan",
          icon: Icons.PlusCircle,
          onClickKey: "apply-loan",
        },
        {
          id: "repayments",
          label: "Repayments",
          icon: Icons.CreditCard,
          onClickKey: "repayments",
          badgeCount: unpaidInstallments,
        },
        {
          id: "schedule",
          label: "Repayment Schedule",
          icon: Icons.Calendar,
          onClickKey: "schedule",
        },
      ],
    },
    {
      group: "KYC",
      items: [
        {
          id: "profile-completion",
          label: "Profile Completion",
          icon: Icons.User,
          onClickKey: "profile-completion",
        },
        {
          id: "kyc-status",
          label: "KYC Status",
          icon: Icons.Shield,
          onClickKey: "kyc-status",
        },
      ],
    },
    {
      group: "Support",
      items: [
        {
          id: "updates",
          label: "Updates",
          icon: Icons.Bell,
          onClickKey: "updates",
        },
        {
          id: "help-center",
          label: "Help Center",
          icon: Icons.HelpCircle,
          onClickKey: "help-center",
        },
        {
          id: "contact-officer",
          label: "Contact Officer",
          icon: Icons.Phone,
          onClickKey: "contact-officer",
        },
        {
          id: "account-info",
          label: "Account Info",
          icon: Icons.Settings,
          onClickKey: "account-info",
        },
      ],
    },
  ];

  return navConfig.map((group) => ({
    ...group,
    items: group.items.map((item) => ({
      ...item,
      badgeCount: Number(item.badgeCount || 0),
    })),
  }));
}
