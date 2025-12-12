import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowUpDown } from "lucide-react";


const ACTION_BADGE_VARIANTS = {
  hotdesk_started: "default",
  reservation_checked_in: "default",
  hotdesk_ended: "outline",
  reservation_checked_out: "outline",
  desk_report_submitted: "outline",
  desk_released: "destructive",
};

export const columns = [
  {
    accessorKey: "user_full_name",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        User
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <div className="font-medium">{row.original.user_full_name}</div>
    ),
  },
  {
    accessorKey: "desk_name",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Desk
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
  },
  {
    accessorKey: "action",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Action
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const action = row.original.action;
      const variant = ACTION_BADGE_VARIANTS[action] ?? "outline";
      return (
        <Badge variant={variant}>
          {action.replace(/_/g, ' ').toUpperCase()}
        </Badge>
      );
    },
  },
  {
    accessorKey: "report_category",
    header: "Category",
    cell: ({ row }) => {
      const category = row.original.report_category;
      return category ? (
        <Badge variant="outline">{category}</Badge>
      ) : (
        <span className="text-muted-foreground">—</span>
      );
    },
  },
  {
    accessorKey: "height",
    header: "Height",
    cell: ({ row }) => {
      const height = row.original.height;
      return height ? (
        <span>{height}cm</span>
      ) : (
        <span className="text-muted-foreground">—</span>
      );
    },
  },
  {
    accessorKey: "timestamp_formatted",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Date & Time
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <div className="text-xs whitespace-nowrap text-muted-foreground">
        {row.original.timestamp_formatted}
      </div>
    ),
  },
];