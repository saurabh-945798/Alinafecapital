import { Icons } from "./icons";

export function buildSidebarGroups(counters = {}) {
  const navConfig = [
    {
      group: "Overview",
      items: [
        { id: "overview", label: "Overview", icon: Icons.Home, onClickKey: "overview" },
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
      ],
    },
  ];

  return navConfig.map((g) => ({ ...g, items: g.items.map((it) => ({ ...it, badgeCount: 0 })) }));
}
