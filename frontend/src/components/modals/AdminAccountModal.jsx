import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/useAuth";

export default function AdminAccountModal({ open, onClose }) {
  const { user } = useAuth();

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Admin Account</DialogTitle>
          <DialogDescription>Account details for admin user</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div><strong>Name:</strong> {user?.first_name} {user?.last_name}</div>
          <div><strong>Email:</strong> {user?.email}</div>
          <div><strong>Username:</strong> {user?.username}</div>
          <div><strong>Role:</strong> Admin</div>
        </div>
        <DialogFooter className="mt-4">
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
