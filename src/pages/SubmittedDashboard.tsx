import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { EngagementCard } from "@/components/engagement/EngagementCard";
import { ChecklistView } from "@/components/checklist/ChecklistView";
import { mockEngagements, mockDeclarations, currentUser } from "@/data/mockData";
import { Engagement } from "@/types";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CheckCircle2, FileText } from "lucide-react";
import { format, parseISO } from "date-fns";

export default function SubmittedDashboard() {
  const [selectedEngagement, setSelectedEngagement] = useState<Engagement | null>(null);

  // Filter engagements where current user is a team member and status is submitted
  const submittedEngagements = mockEngagements.filter(
    eng => eng.status === "submitted" && eng.teamMembers.some(member => member.id === currentUser.id)
  );

  // Get declaration for selected engagement
  const selectedDeclaration = selectedEngagement
    ? mockDeclarations.find(d => d.engagementId === selectedEngagement.id && d.userId === currentUser.id)
    : null;

  if (selectedEngagement && selectedDeclaration) {
    return (
      <MainLayout>
        <div className="max-w-4xl mx-auto">
          <Button
            variant="ghost"
            onClick={() => setSelectedEngagement(null)}
            className="mb-6 gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Submitted
          </Button>

          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <FileText className="h-6 w-6 text-success" />
              <h1 className="text-2xl font-bold text-foreground">
                Declaration Details
              </h1>
            </div>
            <p className="text-muted-foreground">
              {selectedEngagement.entityName} ({selectedEngagement.entityCode}) • FY {selectedEngagement.financialYear}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Submitted on {format(parseISO(selectedDeclaration.submittedAt), "MMMM d, yyyy 'at' h:mm a")}
            </p>
          </div>

          <ChecklistView
            engagement={selectedEngagement}
            responses={selectedDeclaration.responses}
          />

          <div className="mt-8">
            <Button variant="outline" onClick={() => setSelectedEngagement(null)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Submitted
            </Button>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <CheckCircle2 className="h-6 w-6 text-success" />
            <h1 className="text-2xl font-bold text-foreground">Submitted Declarations</h1>
          </div>
          <p className="text-muted-foreground">
            View your completed independence declarations
          </p>
        </div>

        {submittedEngagements.length === 0 ? (
          <div className="text-center py-16 bg-card rounded-xl border">
            <CheckCircle2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              No submitted declarations
            </h3>
            <p className="text-muted-foreground">
              Completed declarations will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {submittedEngagements.map((engagement) => (
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
