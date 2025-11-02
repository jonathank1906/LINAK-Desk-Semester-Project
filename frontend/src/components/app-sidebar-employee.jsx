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

import Logo from "../assets/Logo.svg";
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
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-2 flex items-center min-h-[48px]"
            >
              <a href="#" onClick={() => onSectionSelect?.("dashboard")}>
                <img
                  src={Logo}
                  alt="Logo"
                  className="h-8 w-8 object-contain align-middle"
                  style={{ display: "inline-block" }}
                />
                <span className="text-base font-semibold ml-2">Sevanta</span>
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