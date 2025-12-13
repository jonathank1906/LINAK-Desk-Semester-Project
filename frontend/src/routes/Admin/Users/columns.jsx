import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ArrowUpDown, MoreHorizontal } from "lucide-react";
import { Sparklines, SparklinesLine } from "react-sparklines";

export const columns = ({ setUsers, openViewDialog, openEditDialog }) => [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "name",
    header: ({ column }) => (
      <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
        Name <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
  },
  {
    accessorKey: "email",
    header: ({ column }) => (
      <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
        Email <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
  },
  {
    accessorKey: "department",
    header: "Department",
  },
  {
  accessorKey: "role",
  header: "Role",
  cell: ({ row }) => (
    <div className="text-sm font-medium">{row.original.role}</div>
  ),
},
  {
    accessorKey: "lastLogin",
    header: "Last login",
  },
  {
    accessorKey: "deskUsage",
    header: "Weekly Usage (hrs)",
    cell: ({ row }) => <div className="text-right">{row.original.deskUsage}</div>,
  },
  {
    accessorKey: "deskUsageGraph",
    header: "Weekly Usage Chart",
    cell: ({ row }) => (
      <Sparklines data={row.original.deskUsageHistory || [3, 4, 2, 5, 3, 6]}>
        <SparklinesLine color="blue" />
      </Sparklines>
    ),
  },
  {
    accessorKey: "favoriteDesk",
    header: "Favorite desk",
  },
  {
    accessorKey: "status",
    header: "Account status",
    cell: ({ row }) => (
      <Badge 
        variant={row.original.status === "Active" ? "default" : "secondary"}
        className={row.original.status === "Active" ? "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20" : ""}
      >
        {row.original.status}
      </Badge>
    ),
  },
  {
    accessorKey: "created",
    header: "Created date",
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const user = row.original;
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => navigator.clipboard.writeText(user.email)}>
              Copy Email
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => openViewDialog(user)}>View</DropdownMenuItem>
            <DropdownMenuItem onClick={() => openEditDialog(user)}>Edit</DropdownMenuItem>
            <DropdownMenuItem
  onClick={() => {
    const isDisabled = user.status === "Disabled";
    const action = isDisabled ? "Activate" : "Disable";

    if (confirm(`${action} ${user.name}?`)) {
      setUsers((prev) =>
        prev.map((u) =>
          u.id === user.id
            ? { ...u, status: isDisabled ? "Active" : "Disabled" }
            : u
        )
      );
    }
  }}
>
  {user.status === "Disabled" ? "Activate" : "Disable"}
</DropdownMenuItem>

          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
