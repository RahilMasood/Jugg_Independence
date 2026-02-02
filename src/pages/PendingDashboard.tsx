import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { EngagementCard } from "@/components/engagement/EngagementCard";
import { ChecklistForm } from "@/components/checklist/ChecklistForm";
import { mockEngagements, currentUser } from "@/data/mockData";
import { Engagement, ChecklistResponse } from "@/types";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Clock, FileText } from "lucide-react";
import { toast } from "sonner";

export default function PendingDashboard() {
  const [selectedEngagement, setSelectedEngagement] = useState<Engagement | null>(null);
  const [engagements, setEngagements] = useState(mockEngagements);

  // Filter engagements where current user is a team member and status is pending
  const pendingEngagements = engagements.filter(
    eng => eng.status === "pending" && eng.teamMembers.some(member => member.id === currentUser.id)
  );

  const handleSubmitDeclaration = (responses: ChecklistResponse[]) => {
    if (!selectedEngagement) return;

    // Update engagement status
    setEngagements(prev =>
      prev.map(eng =>
        eng.id === selectedEngagement.id
          ? { ...eng, status: "submitted" as const, submittedDate: new Date().toISOString() }
          : eng
      )
    );

    toast.success("Declaration submitted successfully!");
    setSelectedEngagement(null);
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
            Back to Pending
          </Button>

          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <FileText className="h-6 w-6 text-accent" />
              <h1 className="text-2xl font-bold text-foreground">
                Independence Declaration
              </h1>
            </div>
            <p className="text-muted-foreground">
              {selectedEngagement.entityName} ({selectedEngagement.entityCode}) • FY {selectedEngagement.financialYear}
            </p>
          </div>

          <ChecklistForm
            engagement={selectedEngagement}
            onSubmit={handleSubmitDeclaration}
            onCancel={() => setSelectedEngagement(null)}
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
            <Clock className="h-6 w-6 text-warning" />
            <h1 className="text-2xl font-bold text-foreground">Pending Declarations</h1>
          </div>
          <p className="text-muted-foreground">
            Complete your independence declarations for the following engagements
          </p>
        </div>

        {pendingEngagements.length === 0 ? (
          <div className="text-center py-16 bg-card rounded-xl border">
            <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              All caught up!
            </h3>
            <p className="text-muted-foreground">
              You have no pending declarations at this time.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {pendingEngagements.map((engagement) => (
              <EngagementCard
                key={engagement.id}
                engagement={engagement}
                onClick={() => setSelectedEngagement(engagement)}
              />
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
