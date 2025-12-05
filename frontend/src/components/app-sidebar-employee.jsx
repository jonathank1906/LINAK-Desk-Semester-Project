import * as React from "react"
import {
  IconCalendarEvent,
  IconDesk,
  IconLayoutDashboardFilled,
  IconBoltFilled,
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
  activeSection = "dashboard",
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
      title: "My Desk",
      section: "mydesk",
      url: "#",
      icon: IconDesk,
      onClick: () => onSectionSelect?.("mydesk"),
    },
    {
      title: "Hot Desk",
      section: "hotdesk",
      url: "#",
      icon: IconBoltFilled,
      onClick: () => onSectionSelect?.("hotdesk"),
    },
    {
      title: "Reservations",
      section: "reservations",
      url: "#",
      icon: IconCalendarEvent,
      onClick: () => onSectionSelect?.("reservations"),
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