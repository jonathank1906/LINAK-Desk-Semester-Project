import { IconCirclePlusFilled, IconMail } from "@tabler/icons-react";

import { Button } from "@/components/ui/button"
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

export function NavMain({
  items,
  activeSection
}) {
  return (
    <SidebarGroup>
      <SidebarGroupContent className="flex flex-col gap-2">
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton
                tooltip={item.title}
                onClick={item.onClick}
                className={`bg-[#CECECE] dark:bg-[#323232]
                  hover:bg-[#CECECE] dark:hover:bg-[#323232]
                  ${activeSection === item.section
                    ? 'text-white dark:text-white hover:text-white dark:hover:text-white bg-[#1a3a5a] dark:bg-[#1a3a5a] hover:bg-[#1a3a5a] dark:hover:bg-[#1a3a5a] border-2 border-[#0078d7] hover:border-[#0078d7]'
                    : 'border-2 border-transparent hover:border-[#4e4e4e]'
                  }`
                }
              >
                {item.icon && <item.icon />}
                <span>{item.title}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}