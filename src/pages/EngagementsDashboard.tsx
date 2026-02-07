import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/MainLayout";
import { EngagementCard } from "@/components/engagement/EngagementCard";
import { AddUserDialog } from "@/components/engagement/AddUserDialog";
import { useAuth } from "@/contexts/AuthContext";
import { engagementApi } from "@/lib/api";
import { Engagement, User } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { 
  ArrowLeft, 
  Briefcase, 
  Building2, 
  Calendar, 
  UserPlus, 
  Users,
  Mail,
  Trash2,
  Loader2,
  LogOut
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function EngagementsDashboard() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const queryClient = useQueryClient();
  const [selectedEngagement, setSelectedEngagement] = useState<Engagement | null>(null);
  const [showAddUserDialog, setShowAddUserDialog] = useState(false);

  // Check authentication on mount
  useEffect(() => {
    const accessToken = localStorage.getItem("accessToken");
    if (!accessToken) {
      navigate("/");
      return;
    }
  }, [navigate]);

  // Fetch engagements for independence tool (partner/manager only)
  const { data: engagements = [], isLoading, error } = useQuery({
    queryKey: ['engagements', 'independence-tool'],
    queryFn: async () => {
      const data = await engagementApi.getEngagementsForIndependenceTool();
      // Transform backend format to frontend format
      return data.map((eng: any) => ({
        id: eng.id,
        engagement_name: eng.engagement_name,
        entityName: eng.engagement_name || eng.client_name,
        entityCode: eng.id,
        client_name: eng.client_name,
        audit_client_id: eng.audit_client_id,
        status: eng.status === 'Active' ? 'pending' : 'submitted',
        teamMembers: eng.teamMembers || [],
        created_at: eng.created_at,
        updated_at: eng.updated_at
      }));
    },
    // Enable whenever we have an access token; backend will enforce auth
    enabled: !!localStorage.getItem("accessToken"),
  });

  // Fetch selected engagement details
  const { data: engagementDetails } = useQuery({
    queryKey: ['engagement', selectedEngagement?.id, 'independence-tool'],
    queryFn: async () => {
      if (!selectedEngagement?.id) return null;
      // Use the independence tool specific endpoint that filters team members by independence_tool=true
      const data = await engagementApi.getEngagementForIndependenceTool(selectedEngagement.id);
      return {
        ...selectedEngagement,
        teamMembers: data.teamMembers || []
      };
    },
    enabled: !!selectedEngagement?.id && !!localStorage.getItem("accessToken"),
  });

  // Update selected engagement when details are loaded
  useEffect(() => {
    if (engagementDetails) {
      setSelectedEngagement(engagementDetails);
    }
  }, [engagementDetails]);

  // Add users to independence tool mutation (batch)
  const addUsersMutation = useMutation({
    mutationFn: async ({ engagementId, userIds }: { engagementId: string; userIds: string[] }) => {
      return await engagementApi.addUsersToIndependenceTool(engagementId, userIds);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['engagement', selectedEngagement?.id] });
      queryClient.invalidateQueries({ queryKey: ['engagements', 'independence-tool'] });
      const count = data?.updated_count || 0;
      toast.success(`${count} user(s) added to independence tool successfully!`);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to add users');
    }
  });

  const handleAddUsers = async (users: User[]) => {
    if (!selectedEngagement) return;

    // Add all selected users to independence tool in one batch request
    const userIds = users.map(user => user.id);
    await addUsersMutation.mutateAsync({
      engagementId: selectedEngagement.id,
      userIds: userIds
    });

    // Refresh engagement details
    queryClient.invalidateQueries({ queryKey: ['engagement', selectedEngagement.id] });
  };

  const handleRemoveUser = (userId: string) => {
    if (!selectedEngagement) return;

    // Prevent removing partners/managers
    const userToRemove = selectedEngagement.teamMembers.find(m => m.id === userId);
    const role = userToRemove?.role || '';
    if (role === "engagement_partner" || role === "engagement_manager" || role === "partner" || role === "manager") {
      toast.error("Cannot remove partners or managers from the engagement");
      return;
    }

    // TODO: Implement remove user API call if needed
    // For now, just update local state
    setSelectedEngagement(prev =>
      prev ? { ...prev, teamMembers: prev.teamMembers.filter(m => m.id !== userId) } : null
    );

    toast.success("Team member removed successfully");
  };

  if (selectedEngagement) {
    return (
      <MainLayout>
        <div className="max-w-4xl mx-auto">
          <Button
            variant="ghost"
            onClick={() => setSelectedEngagement(null)}
            className="mb-6 gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Engagements
          </Button>

          {/* Engagement Header */}
          <Card className="mb-6">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10">
                    <Building2 className="h-7 w-7 text-primary" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-foreground">
                      {selectedEngagement.entityName || selectedEngagement.engagement_name || selectedEngagement.client_name}
                    </h1>
                    <p className="text-muted-foreground">
                      {selectedEngagement.entityCode || selectedEngagement.id}
                      {selectedEngagement.fy_year && ` • FY ${selectedEngagement.fy_year}`}
                    </p>
                  </div>
                </div>
                <StatusBadge status={selectedEngagement.status} />
              </div>

              <div className="flex items-center gap-6 mt-6 pt-6 border-t">
                {selectedEngagement.dueDate && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>Due: {format(parseISO(selectedEngagement.dueDate), "MMM d, yyyy")}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="h-4 w-4" />
                  <span>{selectedEngagement.teamMembers.length} users in independence tool</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Team Members */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="h-5 w-5 text-accent" />
                Team Members
              </CardTitle>
              <Button onClick={() => setShowAddUserDialog(true)} size="sm" className="gap-2">
                <UserPlus className="h-4 w-4" />
                Add Member
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {selectedEngagement.teamMembers.map((member, index) => (
                  <div
                    key={member.id}
                    className={cn(
                      "flex items-center justify-between p-4 rounded-lg border bg-card animate-fade-in",
                    )}
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                        {(member.name || member.user_name || '').split(' ').map(n => n[0]).join('') || 'U'}
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{member.name || member.user_name}</p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Mail className="h-3 w-3" />
                          {member.email}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                        In Tool
                      </span>
                      <span className={cn(
                        "text-xs font-medium px-2.5 py-1 rounded-full capitalize",
                        (member.role === "engagement_partner" || member.role === "partner") && "bg-accent/10 text-accent",
                        (member.role === "engagement_manager" || member.role === "manager") && "bg-primary/10 text-primary",
                        (member.role === "associate" || member.role === "article" || member.role === "staff") && "bg-muted text-muted-foreground"
                      )}>
                        {member.role?.replace('_', ' ') || 'member'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <AddUserDialog
            open={showAddUserDialog}
            onOpenChange={setShowAddUserDialog}
            engagementId={selectedEngagement.id}
            existingUserIds={selectedEngagement.teamMembers.filter(m => m.independence_tool).map(m => m.id)}
            onAddUsers={handleAddUsers}
          />
        </div>
      </MainLayout>
    );
  }

  const handleLogout = async () => {
    const refreshToken = localStorage.getItem("refreshToken");
    const AUTH_API_URL = import.meta.env.VITE_AUTH_API_URL || "https://userauth.verityaudit.in/api/v1";
    
    // Try to call backend logout endpoint if refresh token exists
    if (refreshToken) {
      try {
        await fetch(`${AUTH_API_URL}/auth/logout`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ refreshToken }),
        }).catch(() => {
          // Ignore errors during logout
        });
      } catch (error) {
        // Ignore errors during logout
      }
    }
    
    // Clear local storage
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
    
    // Update API client
    const { apiClient } = await import("@/lib/api");
    apiClient.setToken(null);
    
    if (logout) {
      logout();
    }
    
    toast.success("Logged out successfully");
    navigate("/");
  };

  return (
    <MainLayout>
      <div>
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <Briefcase className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-bold text-foreground">Engagements</h1>
            </div>
            <Button onClick={handleLogout} variant="outline" size="sm">
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </div>
          <p className="text-muted-foreground">
            Manage your engagement teams and member access
          </p>
        </div>

        {isLoading ? (
          <div className="text-center py-16 bg-card rounded-xl border">
            <Loader2 className="h-12 w-12 text-muted-foreground mx-auto mb-4 animate-spin" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Loading engagements...
            </h3>
          </div>
        ) : error ? (
          <div className="text-center py-16 bg-card rounded-xl border">
            <Briefcase className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Error loading engagements
            </h3>
            <p className="text-muted-foreground">
              {error instanceof Error ? error.message : 'An error occurred'}
            </p>
          </div>
        ) : engagements.length === 0 ? (
          <div className="text-center py-16 bg-card rounded-xl border">
            <Briefcase className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              No engagements found
            </h3>
            <p className="text-muted-foreground">
              You don't have any engagements as a partner or manager.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {engagements.map((engagement) => (
              <EngagementCard
                key={engagement.id}
                engagement={engagement}
                onClick={() => setSelectedEngagement(engagement)}
                showTeamCount
                showStatus={false}
              />
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
