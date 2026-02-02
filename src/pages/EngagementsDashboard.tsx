import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { EngagementCard } from "@/components/engagement/EngagementCard";
import { AddUserDialog } from "@/components/engagement/AddUserDialog";
import { mockEngagements, currentUser } from "@/data/mockData";
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
  Trash2
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function EngagementsDashboard() {
  const [engagements, setEngagements] = useState(mockEngagements);
  const [selectedEngagement, setSelectedEngagement] = useState<Engagement | null>(null);
  const [showAddUserDialog, setShowAddUserDialog] = useState(false);

  // Filter engagements where current user is a partner or manager
  const userEngagements = engagements.filter(
    eng => eng.teamMembers.some(
      member => member.id === currentUser.id && (member.role === "partner" || member.role === "manager")
    )
  );

  const handleAddUsers = (users: User[]) => {
    if (!selectedEngagement) return;

    setEngagements(prev =>
      prev.map(eng =>
        eng.id === selectedEngagement.id
          ? { ...eng, teamMembers: [...eng.teamMembers, ...users] }
          : eng
      )
    );

    // Update selected engagement
    setSelectedEngagement(prev =>
      prev ? { ...prev, teamMembers: [...prev.teamMembers, ...users] } : null
    );

    toast.success(`Added ${users.length} team member(s) successfully!`);
  };

  const handleRemoveUser = (userId: string) => {
    if (!selectedEngagement) return;

    // Prevent removing partners/managers
    const userToRemove = selectedEngagement.teamMembers.find(m => m.id === userId);
    if (userToRemove?.role === "partner" || userToRemove?.role === "manager") {
      toast.error("Cannot remove partners or managers from the engagement");
      return;
    }

    setEngagements(prev =>
      prev.map(eng =>
        eng.id === selectedEngagement.id
          ? { ...eng, teamMembers: eng.teamMembers.filter(m => m.id !== userId) }
          : eng
      )
    );

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
                      {selectedEngagement.entityName}
                    </h1>
                    <p className="text-muted-foreground">
                      {selectedEngagement.entityCode} • FY {selectedEngagement.financialYear}
                    </p>
                  </div>
                </div>
                <StatusBadge status={selectedEngagement.status} />
              </div>

              <div className="flex items-center gap-6 mt-6 pt-6 border-t">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>Due: {format(parseISO(selectedEngagement.dueDate), "MMM d, yyyy")}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="h-4 w-4" />
                  <span>{selectedEngagement.teamMembers.length} team members</span>
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
                        {member.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{member.name}</p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Mail className="h-3 w-3" />
                          {member.email}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={cn(
                        "text-xs font-medium px-2.5 py-1 rounded-full capitalize",
                        member.role === "partner" && "bg-accent/10 text-accent",
                        member.role === "manager" && "bg-primary/10 text-primary",
                        member.role === "staff" && "bg-muted text-muted-foreground"
                      )}>
                        {member.role}
                      </span>
                      {member.role === "staff" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => handleRemoveUser(member.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <AddUserDialog
            open={showAddUserDialog}
            onOpenChange={setShowAddUserDialog}
            existingUserIds={selectedEngagement.teamMembers.map(m => m.id)}
            onAddUsers={handleAddUsers}
          />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Briefcase className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">Engagements</h1>
          </div>
          <p className="text-muted-foreground">
            Manage your engagement teams and member access
          </p>
        </div>

        {userEngagements.length === 0 ? (
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
            {userEngagements.map((engagement) => (
              <EngagementCard
                key={engagement.id}
                engagement={engagement}
                onClick={() => setSelectedEngagement(engagement)}
                showTeamCount
              />
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
