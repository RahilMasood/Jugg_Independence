import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/MainLayout";
import { EngagementCard } from "@/components/engagement/EngagementCard";
import { ChecklistView } from "@/components/checklist/ChecklistView";
import { Engagement, ChecklistResponse } from "@/types";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CheckCircle2, FileText, Loader2 } from "lucide-react";
import { independenceApi } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

export default function SubmittedDashboard() {
  const [selectedEngagement, setSelectedEngagement] = useState<Engagement | null>(null);
  const { user } = useAuth();

  const { data: submittedEngagements = [], isLoading, error } = useQuery({
    queryKey: ["independence", "submitted-engagements"],
    queryFn: async () => {
      const data = await independenceApi.getMySubmittedEngagements();
      return data.map((eng: any) => ({
        id: eng.id,
        engagement_name: eng.engagement_name,
        entityName: eng.engagement_name || eng.client_name,
        entityCode: eng.id,
        client_name: eng.client_name,
        audit_client_id: eng.audit_client_id,
        status: "submitted" as const,
        dueDate: "", // not needed for submitted tab
        teamMembers: [],
        created_at: eng.created_at,
        updated_at: eng.updated_at
      } as Engagement));
    }
  });

  // When an engagement is selected, fetch its responses JSON from SharePoint via backend
  const { data: responsesJson, isLoading: isLoadingResponses } = useQuery({
    queryKey: ["independence", "responses-file", selectedEngagement?.id],
    queryFn: async () => {
      if (!selectedEngagement?.id) return null;
      return await independenceApi.getResponsesFile(selectedEngagement.id);
    },
    enabled: !!selectedEngagement?.id
  });

  // Derive the current user's responses from the JSON file
  let selectedResponses: ChecklistResponse[] = [];
  if (selectedEngagement && responsesJson && typeof responsesJson === "object") {
    const entries = Object.values(responsesJson || {}) as any[];
    const currentUserId = user?.id;
    const currentEmail = user?.email;

    let match =
      entries.find(e => e?.user?.id === currentUserId) ||
      entries.find(e => e?.user?.email === currentEmail) ||
      entries[0];

    if (match && Array.isArray(match.responses)) {
      selectedResponses = match.responses as ChecklistResponse[];
    }
  }

  // Detail view: show uneditable checklist with loaded responses
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
              {selectedEngagement.entityName} ({selectedEngagement.entityCode})
            </p>
          </div>

          {isLoadingResponses ? (
            <div className="text-center py-16 bg-card rounded-xl border">
              <Loader2 className="h-12 w-12 text-muted-foreground mx-auto mb-4 animate-spin" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Loading declaration responses...
              </h3>
            </div>
          ) : !selectedResponses.length ? (
            <div className="text-center py-16 bg-card rounded-xl border">
              <CheckCircle2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                No responses found
              </h3>
              <p className="text-muted-foreground">
                This engagement has no saved responses in SharePoint yet.
              </p>
            </div>
          ) : (
            <ChecklistView
              engagement={selectedEngagement}
              responses={selectedResponses}
            />
          )}
        </div>
      </MainLayout>
    );
  }

  // List view
  return (
    <MainLayout>
      <div>
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <CheckCircle2 className="h-6 w-6 text-success" />
            <h1 className="text-2xl font-bold text-foreground">Submitted Declarations</h1>
          </div>
          <p className="text-muted-foreground">
            View your completed independence declarations
          </p>
        </div>

        {isLoading ? (
          <div className="text-center py-16 bg-card rounded-xl border">
            <Loader2 className="h-12 w-12 text-muted-foreground mx-auto mb-4 animate-spin" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Loading submitted engagements...
            </h3>
          </div>
        ) : error ? (
          <div className="text-center py-16 bg-card rounded-xl border">
            <CheckCircle2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Error loading submitted engagements
            </h3>
            <p className="text-muted-foreground">
              {error instanceof Error ? error.message : "An error occurred"}
            </p>
          </div>
        ) : submittedEngagements.length === 0 ? (
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
