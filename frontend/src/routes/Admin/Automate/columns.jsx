import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { IconEdit, IconTrash, IconLoader2, IconX, IconCheck } from "@tabler/icons-react";
import { MoreHorizontal, Play } from "lucide-react";


const formatTime = (timeString) => {
  if (!timeString) return "—";
  return timeString;
};

const formatDays = (weekdayNames) => {
  if (!weekdayNames || weekdayNames.length === 0) return "—";
  if (weekdayNames.length === 7) return "Every day";
  if (weekdayNames.length === 5 &&
      !weekdayNames.includes('Saturday') && 
      !weekdayNames.includes('Sunday')) {
    return "Weekdays";
  }
  if (weekdayNames.length === 2 && 
      weekdayNames.includes('Saturday') && 
      weekdayNames.includes('Sunday')) {
    return "Weekends";
  }
  return weekdayNames.join(", ");
};

export const columns = ({ 
  handleExecuteNow, 
  openEditDialog, 
  setDeleteScheduleId, 
  executingScheduleId, 
  toggleActive 
}) => [
  {
    accessorKey: "name",
    header: "Schedule Name",
    cell: ({ row }) => (
      <div className="font-medium">{row.original.name}</div>
    ),
  },
  {
    accessorKey: "time",
    header: "Time",
    cell: ({ row }) => (
      <span>{formatTime(row.original.time)}</span>
    ),
  },
  {
    accessorKey: "weekdays",
    header: "Frequency",
    cell: ({ row }) => (
      <span className="text-sm">{formatDays(row.original.weekday_names)}</span>
    ),
  },
  {
    accessorKey: "target_height",
    header: "Target Height",
    cell: ({ row }) => (
      <span className="font-medium">{row.original.target_height} cm</span>
    ),
  },
  {
    accessorKey: "is_active",
    header: "Status",
    cell: ({ row }) => {
      const schedule = row.original;
      return (
        <Badge 
          variant={schedule.is_active ? "default" : "secondary"}
          className={schedule.is_active ? "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20" : ""}
        >
          {schedule.is_active ? "Active" : "Inactive"}
        </Badge>
      );
    },
  },
  {
    accessorKey: "last_executed",
    header: "Last Executed",
    cell: ({ row }) => {
      const lastExecuted = row.original.last_executed;
      if (!lastExecuted) {
        return (
          <span className="text-muted-foreground text-sm">Never</span>
        );
      }
      const date = new Date(lastExecuted);
      return (
        <span className="text-sm">
          {date.toLocaleDateString()} {date.toLocaleTimeString('en-US', { hour12: false })}
        </span>
      );
    },
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => {
      const schedule = row.original;
      return (
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExecuteNow(schedule.id, schedule.name)}
            disabled={executingScheduleId === schedule.id || !schedule.is_active}
            className="gap-2"
          >
            {executingScheduleId === schedule.id ? (
              <>
                <IconLoader2 className="h-4 w-4 animate-spin" />
                Executing...
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                Run Now
              </>
            )}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => openEditDialog(schedule)}>
                <IconEdit className="mr-2 h-4 w-4" />
                Edit Schedule
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => toggleActive(schedule.id, !schedule.is_active)}
                disabled={executingScheduleId === schedule.id}
              >
                {schedule.is_active ? (
                  <>
                    <IconX className="mr-2 h-4 w-4" />
                    Deactivate
                  </>
                ) : (
                  <>
                    <IconCheck className="mr-2 h-4 w-4" />
                    Activate
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => setDeleteScheduleId(schedule.id)}
                className="text-destructive focus:text-destructive"
              >
                <IconTrash className="mr-2 h-4 w-4" />
                Delete Schedule
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      );
    },
  },
];

