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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, UserPlus, Loader2 } from "lucide-react";
import { toast } from "sonner";

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

  // External user form state (UI only for now, no behavior wired yet)
  const [externalEmail, setExternalEmail] = useState("");
  const [externalName, setExternalName] = useState("");
  const [externalDesignation, setExternalDesignation] = useState("");
  const [isSearchingExternal, setIsSearchingExternal] = useState(false);
  const [externalUserExists, setExternalUserExists] = useState<boolean | null>(null);
  const [showCreateExternalUser, setShowCreateExternalUser] = useState(false);

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

  // Load / create external user similar to Confirmation Tool's client user flow
  const AUTH_API_URL =
    import.meta.env.VITE_AUTH_API_URL ||
    "https://juggernautuserauth-production.up.railway.app/api/v1";

  const handleSearchExternal = async () => {
    if (!externalEmail) {
      toast.error("Please enter an email address");
      return;
    }

    setIsSearchingExternal(true);
    setExternalUserExists(null);
    setShowCreateExternalUser(false);

    try {
      const authToken = localStorage.getItem("accessToken");
      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };
      if (authToken) {
        headers["Authorization"] = `Bearer ${authToken}`;
      }

      const response = await fetch(
        `${AUTH_API_URL}/external-users/search?email=${encodeURIComponent(
          externalEmail
        )}`,
        {
          headers,
          method: "GET",
        }
      );

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data?.user) {
          const user = result.data.user;
          setExternalName(user.name || "");
          setExternalDesignation(user.designation || "");
          setExternalUserExists(true);
          setShowCreateExternalUser(false);
          toast.success("External user found.");
        } else {
          setExternalUserExists(false);
          setShowCreateExternalUser(true);
        }
      } else if (response.status === 404) {
        setExternalUserExists(false);
        setShowCreateExternalUser(true);
      } else {
        throw new Error("Failed to search external user");
      }
    } catch (error: any) {
      console.error("Error searching external user:", error);
      toast.error(`Failed to search external user: ${error.message}`);
      setExternalUserExists(false);
      setShowCreateExternalUser(true);
    } finally {
      setIsSearchingExternal(false);
    }
  };

  const handleCreateExternalUser = async () => {
    if (!externalEmail || !externalName) {
      toast.error("Email and name are required to create external user");
      return;
    }

    try {
      const authToken = localStorage.getItem("accessToken");
      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };
      if (authToken) {
        headers["Authorization"] = `Bearer ${authToken}`;
      }

      const response = await fetch(`${AUTH_API_URL}/external-users`, {
        headers,
        method: "POST",
        body: JSON.stringify({
          email: externalEmail,
          name: externalName,
          designation: externalDesignation || "",
        }),
      });

      const result = await response.json();

      if (result.success) {
        setExternalUserExists(true);
        setShowCreateExternalUser(false);
        toast.success("External user created successfully");
      } else {
        throw new Error(result.error?.message || "Failed to create external user");
      }
    } catch (error: any) {
      console.error("Error creating external user:", error);
      toast.error(`Failed to create external user: ${error.message}`);
    }
  };

  const handleAddExternalToIndependence = async () => {
    if (!engagementId) {
      toast.error("Engagement ID is required");
      return;
    }
    if (!externalEmail) {
      toast.error("Please enter an email and search/create the external user");
      return;
    }

    // Require that user has been searched/created first
    if (externalUserExists === null) {
      toast.error("Please search the external user first");
      return;
    }

    // If user doesn't exist yet, create first
    if (externalUserExists === false) {
      await handleCreateExternalUser();
    }

    try {
      const authToken = localStorage.getItem("accessToken");
      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };
      if (authToken) {
        headers["Authorization"] = `Bearer ${authToken}`;
      }

      const response = await fetch(
        `${AUTH_API_URL}/external-users/${encodeURIComponent(
          externalEmail
        )}/add-independence`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({
            engagement_id: engagementId,
          }),
        }
      );

      const result = await response.json();

      if (response.ok && result.success) {
        toast.success("External user added to independence tool for this engagement");
        // Reset external form but keep dialog open
        setExternalName("");
        setExternalDesignation("");
        setExternalUserExists(null);
        setShowCreateExternalUser(false);
      } else {
        throw new Error(result.error?.message || "Failed to add external user");
      }
    } catch (error: any) {
      console.error("Error adding external user to independence:", error);
      toast.error(`Failed to add external user: ${error.message}`);
    }
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

        <Tabs defaultValue="auditor" className="w-full py-2">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="auditor">Auditor</TabsTrigger>
            <TabsTrigger value="external">External User</TabsTrigger>
          </TabsList>

          {/* Auditor tab - keep existing behavior */}
          <TabsContent value="auditor">
            <div className="space-y-4">
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
          </TabsContent>

          {/* External user tab - UI modeled after Confirmation Tool client add form */}
          <TabsContent value="external">
            <div className="space-y-4">
              <div>
                <Label htmlFor="external-email">Email</Label>
                <div className="flex gap-2 mt-2">
                  <Input
                    id="external-email"
                    placeholder="email@company.com"
                    value={externalEmail}
                    onChange={(e) => {
                      setExternalEmail(e.target.value);
                      setExternalUserExists(null);
                      setShowCreateExternalUser(false);
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleSearchExternal}
                    disabled={!externalEmail || isSearchingExternal}
                  >
                    {isSearchingExternal ? "Searching..." : "Search"}
                  </Button>
                </div>
              </div>
              {(externalUserExists === true || showCreateExternalUser) && (
                <>
                  <div>
                    <Label htmlFor="external-name">Name</Label>
                    <Input
                      id="external-name"
                      placeholder="Full Name"
                      className="mt-2"
                      value={externalName}
                      onChange={(e) => setExternalName(e.target.value)}
                      disabled={externalUserExists === true && !showCreateExternalUser}
                    />
                  </div>
                  <div>
                    <Label htmlFor="external-designation">Designation</Label>
                    <Input
                      id="external-designation"
                      placeholder="e.g., CFO"
                      className="mt-2"
                      value={externalDesignation}
                      onChange={(e) => setExternalDesignation(e.target.value)}
                    />
                  </div>
                  {externalUserExists === false && showCreateExternalUser && (
                    <Button
                      type="button"
                      variant="default"
                      className="w-full"
                      onClick={handleCreateExternalUser}
                    >
                      Create External User
                    </Button>
                  )}
                </>
              )}

              <Button
                type="button"
                className="w-full"
                onClick={handleAddExternalToIndependence}
                disabled={!externalEmail || !engagementId}
              >
                Add External User to Independence
              </Button>
            </div>
          </TabsContent>
        </Tabs>

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
