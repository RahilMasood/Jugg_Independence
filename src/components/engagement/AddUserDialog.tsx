import { useState } from "react";
import { User } from "@/types";
import { mockUsers } from "@/data/mockData";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Search, UserPlus } from "lucide-react";

interface AddUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingUserIds: string[];
  onAddUsers: (users: User[]) => void;
}

export function AddUserDialog({ open, onOpenChange, existingUserIds, onAddUsers }: AddUserDialogProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

  const availableUsers = mockUsers.filter(user => !existingUserIds.includes(user.id));
  
  const filteredUsers = availableUsers.filter(user =>
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleToggleUser = (userId: string) => {
    setSelectedUserIds(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleAddUsers = () => {
    const selectedUsers = mockUsers.filter(user => selectedUserIds.includes(user.id));
    onAddUsers(selectedUsers);
    setSelectedUserIds([]);
    setSearchQuery("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-accent" />
            Add Team Members
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="max-h-64 space-y-2 overflow-y-auto scrollbar-thin">
            {filteredUsers.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-8">
                {availableUsers.length === 0 
                  ? "All users are already added to this engagement"
                  : "No users found matching your search"
                }
              </p>
            ) : (
              filteredUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center space-x-3 rounded-lg border p-3 hover:bg-muted/50 transition-colors"
                >
                  <Checkbox
                    id={user.id}
                    checked={selectedUserIds.includes(user.id)}
                    onCheckedChange={() => handleToggleUser(user.id)}
                  />
                  <Label htmlFor={user.id} className="flex-1 cursor-pointer">
                    <p className="font-medium text-sm">{user.name}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </Label>
                  <span className="text-xs text-muted-foreground capitalize bg-muted px-2 py-1 rounded">
                    {user.role}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleAddUsers} 
            disabled={selectedUserIds.length === 0}
            className="gap-2"
          >
            <UserPlus className="h-4 w-4" />
            Add {selectedUserIds.length > 0 ? `(${selectedUserIds.length})` : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
