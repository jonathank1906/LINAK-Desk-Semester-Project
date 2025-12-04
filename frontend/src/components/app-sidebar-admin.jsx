import * as React from "react"
import {
  IconCamera,
  IconChartBar,
  IconDashboard,
  IconDatabase,
  IconFileAi,
  IconFileDescription,
  IconFileWord,
  IconFolder,
  IconHelp,
  IconInnerShadowTop,
  IconListDetails,
  IconReport,
  IconSearch,
  IconSettings,
  IconLogs,
  IconUsers,
  IconDesk,
  IconLayoutDashboardFilled,
} from "@tabler/icons-react"

import { NavDocuments } from "@/components/nav-documents"
import { NavMain } from "@/components/nav-main"
import Logo from "../assets/Logo.svg";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"



export function AppSidebar({
  activeSection,
  onSectionSelect,
  ...props
}) {
  const navMain = [
    {
      title: "Dashboard",
      section: "dashboard",
      url: "#",
      icon: IconLayoutDashboardFilled,
      onClick: () => onSectionSelect?.("dashboard"),
    },
    {
      title: "Analytics",
      section: "analytics",
      url: "#",
      icon: IconChartBar,
      onClick: () => onSectionSelect?.("analytics"),
    },
    {
      title: "Users",
      section: "users",
      url: "#",
      icon: IconUsers,
      onClick: () => onSectionSelect?.("users"),
    },
    {
      title: "Logs",
      section: "logs",
      url: "#",
      icon: IconLogs,
      onClick: () => onSectionSelect?.("logs"),
    },
    {
      title: "Automate",
      section: "automate",
      url: "#",
      icon: IconSettings,
      onClick: () => onSectionSelect?.("automate"),
    },
    {
      title: "Desks",
      section: "desks",
      url: "#",
      icon: IconDesk,
      onClick: () => onSectionSelect?.("desks"),
    },
  ];

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex items-center min-h-[48px] px-2">
              <img
                src={Logo}
                alt="Logo"
                className="h-8 w-8 object-contain align-middle"
                style={{ display: "inline-block" }}
              />
              <span className="text-base font-semibold ml-2">Sevanta</span>
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMain} activeSection={activeSection} />
      </SidebarContent>
    </Sidebar>
  );
}