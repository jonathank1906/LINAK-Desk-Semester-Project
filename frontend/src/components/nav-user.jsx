import {
  IconLogout,
  IconUserCircle,
  IconSettings,
} from "@tabler/icons-react"
import { useState } from "react";


import AdminAccountModal from "@/components/modals/AdminAccountModal";
import EmployeeAccountModal from "@/components/modals/EmployeeAccountModal";


import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"

import { useAuth } from "@/contexts/useAuth";


export function NavUser({ user }) {
  const { isMobile } = useSidebar()
  const { logoutUser } = useAuth();
  const [showAccount, setShowAccount] = useState(false);

  const handleLogout = async () => {
    await logoutUser();
  };

  return (
    <>
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground">
              <Avatar className="h-8 w-8 rounded-lg">
                <AvatarImage src={user.avatar} alt={user.name} />
                <AvatarFallback className="rounded-lg">
                  {user.first_name && user.last_name
                    ? `${user.first_name[0]}${user.last_name[0]}`.toUpperCase()
                    : user.username
                      ? user.username.slice(0, 2).toUpperCase()
                      : "?"}
                </AvatarFallback>
              </Avatar>
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side="bottom"
            align="end"
            sideOffset={4}>
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-3 px-3 py-2 text-left">
                <Avatar className="h-9 w-9 rounded-lg">
                  <AvatarImage src={user.avatar} alt={user.name} />
                  <AvatarFallback className="rounded-lg">
                    {user.first_name && user.last_name
                      ? `${user.first_name[0]}${user.last_name[0]}`.toUpperCase()
                      : user.username
                        ? user.username.slice(0, 2).toUpperCase()
                        : "?"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                  <span className="text-sm font-medium">
                    {user.first_name && user.last_name
                      ? `${user.first_name} ${user.last_name}`
                      : user.username}
                  </span>
                  <span className="text-xs text-muted-foreground truncate">{user.email}</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={() => setShowAccount(true)}>
                <IconUserCircle />
                Account
              </DropdownMenuItem>
              <DropdownMenuItem>
                <IconSettings />
                Settings
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={handleLogout}>
              <IconLogout />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
{showAccount && (
  user?.is_admin
    ? <AdminAccountModal open={showAccount} onClose={() => setShowAccount(false)} />
    : <EmployeeAccountModal open={showAccount} onClose={() => setShowAccount(false)} />
)}

</>
    
  );
}