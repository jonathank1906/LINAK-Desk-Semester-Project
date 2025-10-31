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
  IconUsers,
  IconCalendarWeek,
  IconDesk,
  IconLayoutDashboardFilled,
  IconAtom,
} from "@tabler/icons-react"

import { NavMain } from "@/components/nav-main"

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
  onSectionSelect,
  ...props
}) {
  const navMain = [
    {
      title: "Dashboard",
      url: "#",
      icon: IconLayoutDashboardFilled,
      onClick: () => onSectionSelect?.("dashboard"),
    },
    {
      title: "My Desk",
      url: "#",
      icon: IconDesk,
      onClick: () => onSectionSelect?.("mydesk"),
    },
    {
      title: "Reservations",
      url: "#",
      icon: IconCalendarWeek,
      onClick: () => onSectionSelect?.("reservations"),
    },
    {
      title: "Health & Analytics",
      url: "#",
      icon: IconChartBar,
      onClick: () => onSectionSelect?.("analytics"),
    },
    {
      title: "Pico Lab",
      url: "#",
      icon: IconAtom,
      onClick: () => onSectionSelect?.("pico_lab"),
    },
  ];


  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild className="data-[slot=sidebar-menu-button]:!p-1.5">
              <a href="#" onClick={() => onSectionSelect?.("dashboard")}>
                <IconInnerShadowTop className="!size-5" />
                <span className="text-base font-semibold">Desk App</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMain} />
      </SidebarContent>
    </Sidebar>
  );
}