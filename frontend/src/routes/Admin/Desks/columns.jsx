import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { IconEdit, IconTrash, IconRefresh, IconX, IconAlertCircle } from "@tabler/icons-react";

export const columns = [
  {
    accessorKey: "name",
    header: "Name",
    cell: ({ row }) => row.original.name,
  },
  {
    accessorKey: "location",
    header: "Location",
    cell: ({ row }) => row.original.location,
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => (
      <Badge variant={
        row.original.status === "available"
          ? "default"
          : row.original.status === "occupied"
          ? "secondary"
          : "destructive"
      }>
        {row.original.status.replace(/_/g, " ")}
      </Badge>
    ),
  },
  {
    accessorKey: "isActive",
    header: "Active",
    cell: ({ row }) =>
      row.original.isActive ? (
        <Badge variant="default">Active</Badge>
      ) : (
        <Badge variant="destructive">Inactive</Badge>
      ),
  },
  {
    accessorKey: "current_user",
    header: "Current User",
    cell: ({ row }) => row.original.current_user || "—",
  },
  {
    accessorKey: "reservations",
    header: "Reservations",
    cell: ({ row }) => row.original.reservations,
  },
  {
    accessorKey: "error",
    header: "Error",
    cell: ({ row }) =>
      row.original.error ? (
        <span className="flex items-center gap-1 text-red-600">
          <IconAlertCircle size={16} /> {row.original.error}
        </span>
      ) : (
        <span className="text-muted-foreground">None</span>
      ),
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => (
      <div className="flex gap-2">
        <Button size="icon" variant="outline">
          <IconEdit size={16} />
        </Button>
        <Button size="icon" variant="outline">
          <IconRefresh size={16} />
        </Button>
        <Button size="icon" variant="outline">
          <IconX size={16} />
        </Button>
        <Button size="icon" variant="destructive">
          <IconTrash size={16} />
        </Button>
      </div>
    ),
  },
];