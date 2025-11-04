// components/UserProfileDialog.jsx
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Sparklines, SparklinesLine } from "react-sparklines";
import { Button } from "@/components/ui/button";

export function UserProfileDialog({ user, onClose }) {
  if (!user) return null;

  return (
    <Dialog open={!!user} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{user.name}</DialogTitle>
          <DialogDescription>{user.email}</DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-4">
          <div className="flex justify-between">
            <span className="font-medium">Status:</span>
            <Badge variant={user.status === "Active" ? "default" : "destructive"}>
              {user.status}
            </Badge>
          </div>

          <div className="flex justify-between">
            <span className="font-medium">Role:</span>
            <span>{user.role}</span>
          </div>

          <div className="flex justify-between">
            <span className="font-medium">Department:</span>
            <span>{user.department}</span>
          </div>

          <div className="flex justify-between">
            <span className="font-medium">Favorite Desk:</span>
            <span>{user.favoriteDesk}</span>
          </div>

          <div className="flex justify-between">
            <span className="font-medium">Last Login:</span>
            <span>{user.lastLogin}</span>
          </div>

          <div className="flex justify-between">
            <span className="font-medium">Created:</span>
            <span>{user.created}</span>
          </div>

          <div className="space-y-1">
            <div className="font-medium">Desk Usage This Week:</div>
            <Sparklines data={user.deskUsageHistory || [3, 4, 2, 5, 3, 6]}>
              <SparklinesLine color="blue" />
            </Sparklines>
            <div className="text-sm text-muted-foreground">
              Total: {user.deskUsage} hours
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
