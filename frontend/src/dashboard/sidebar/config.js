import { Icons } from "./icons";

export function buildSidebarGroups(counters = {}) {
  const badgeByKey = {
    pendingTasks: counters?.pendingTasks ?? 0,
    newUpdates: counters?.newUpdates ?? 0,
    unpaidInstallments: counters?.unpaidInstallments ?? 0,
  };

  const navConfig = [
    {
      group: "Overview",
      items: [
        { id: "overview", label: "Overview", icon: Icons.Home, onClickKey: "overview" },
        {
          id: "quick-actions",
          label: "Quick Actions",
          icon: Icons.Zap,
          onClickKey: "quick-actions",
          badgeKey: "pendingTasks",
        },
        {
          id: "updates",
          label: "Updates",
          icon: Icons.Bell,
          onClickKey: "updates",
          badgeKey: "newUpdates",
        },
      ],
    },
    {
      group: "Applications",
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
      group: "Repayments",
      items: [
        {
          id: "repayments",
          label: "Repayments",
          icon: Icons.CreditCard,
          onClickKey: "repayments",
          badgeKey: "unpaidInstallments",
        },
        {
          id: "schedule",
          label: "Schedule",
          icon: Icons.Calendar,
          onClickKey: "schedule",
        },
      ],
    },
    {
      group: "Support",
      items: [
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
      ],
    },
    {
      group: "Settings",
      items: [
        {
          id: "account-info",
          label: "Account Info",
          icon: Icons.Settings,
          onClickKey: "account-info",
        },
        {
          id: "security",
          label: "Security",
          icon: Icons.Lock,
          onClickKey: "security",
        },
      ],
    },
  ];

  return navConfig.map((g) => ({
    ...g,
    items: g.items.map((it) => ({
      ...it,
      badgeCount: it.badgeKey ? badgeByKey[it.badgeKey] || 0 : 0,
    })),
  }));
}
