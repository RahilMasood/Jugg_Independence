import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { User } from "@/types";
import { engagementApi } from "@/lib/api";
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
import { Search, UserPlus, Loader2 } from "lucide-react";

interface AddUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  engagementId: string;
  existingUserIds: string[];
  onAddUsers: (users: User[]) => void;
}

export function AddUserDialog({ open, onOpenChange, engagementId, existingUserIds, onAddUsers }: AddUserDialogProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

  // Fetch users with main access for this engagement
  const { data: availableUsers = [], isLoading } = useQuery({
    queryKey: ['users', 'main-access', engagementId],
    queryFn: async () => {
      const users = await engagementApi.getUsersWithMainAccess(engagementId);
      // Filter out users already in independence tool (existingUserIds)
      return users.filter(user => !existingUserIds.includes(user.id));
    },
    enabled: open && !!engagementId,
  });
  
  const filteredUsers = availableUsers.filter(user =>
    (user.name || user.user_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
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
    const selectedUsers = availableUsers.filter(user => selectedUserIds.includes(user.id));
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
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredUsers.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-8">
                {availableUsers.length === 0 
                  ? "All users with main access are already added to independence tool"
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
                    <p className="font-medium text-sm">{user.name || user.user_name}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </Label>
                  <span className="text-xs text-muted-foreground capitalize bg-muted px-2 py-1 rounded">
                    {user.role?.replace('_', ' ') || 'member'}
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
