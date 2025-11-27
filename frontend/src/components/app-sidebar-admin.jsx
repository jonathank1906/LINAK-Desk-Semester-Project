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
      url: "#",
      icon: IconLayoutDashboardFilled,
      onClick: () => onSectionSelect?.("dashboard"),
      active: activeSection === "dashboard",
    },
    {
      title: "Analytics",
      url: "#",
      icon: IconChartBar,
      onClick: () => onSectionSelect?.("analytics"),
      active: activeSection === "analytics",
    },
    {
      title: "Users",
      url: "#",
      icon: IconUsers,
      onClick: () => onSectionSelect?.("users"),
      active: activeSection === "users",
    },
    {
      title: "Logs",
      url: "#",
      icon: IconLogs,
      onClick: () => onSectionSelect?.("logs"),
      active: activeSection === "logs",
    },
  ];

  const documents = [
    {
      name: "Data Library",
      url: "#",
      icon: IconDatabase,
    },
    {
      name: "Reports",
      url: "#",
      icon: IconReport,
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
        <NavMain
          items={navMain.map((item) => ({
            ...item,
            className: item.active ? "bg-accent text-primary font-bold" : "",
          }))}
        />
        <NavDocuments items={documents} />
      </SidebarContent>
    </Sidebar>
  );
}