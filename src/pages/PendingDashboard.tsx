import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/MainLayout";
import { EngagementCard } from "@/components/engagement/EngagementCard";
import { ChecklistForm } from "@/components/checklist/ChecklistForm";
import { Engagement, ChecklistResponse } from "@/types";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Clock, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { independenceApi } from "@/lib/api";

export default function PendingDashboard() {
  const [selectedEngagement, setSelectedEngagement] = useState<Engagement | null>(null);

  const { data: pendingEngagements = [], isLoading, error } = useQuery({
    queryKey: ["independence", "pending-engagements"],
    queryFn: async () => {
      const data = await independenceApi.getMyPendingEngagements();
      return data.map((eng: any) => ({
        id: eng.id,
        engagement_name: eng.engagement_name,
        entityName: eng.engagement_name || eng.client_name,
        entityCode: eng.id,
        client_name: eng.client_name,
        audit_client_id: eng.audit_client_id,
        status: "pending" as const,
        dueDate: "", // no due date from backend for now
        teamMembers: [],
        created_at: eng.created_at,
        updated_at: eng.updated_at
      } as Engagement));
    }
  });

  const handleSubmitDeclaration = async (responses: ChecklistResponse[]) => {
    if (!selectedEngagement) return;

    try {
      await independenceApi.submitFromTool(selectedEngagement.id, responses);
      toast.success("Declaration submitted successfully!");
      setSelectedEngagement(null);
    } catch (error: any) {
      toast.error(error?.message || "Failed to submit declaration");
    }
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
      <div>
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Clock className="h-6 w-6 text-warning" />
            <h1 className="text-2xl font-bold text-foreground">Pending Declarations</h1>
          </div>
          <p className="text-muted-foreground">
            Complete your independence declarations for the following engagements
          </p>
        </div>

        {isLoading ? (
          <div className="text-center py-16 bg-card rounded-xl border">
            <Loader2 className="h-12 w-12 text-muted-foreground mx-auto mb-4 animate-spin" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Loading pending engagements...
            </h3>
          </div>
        ) : error ? (
          <div className="text-center py-16 bg-card rounded-xl border">
            <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Error loading pending engagements
            </h3>
            <p className="text-muted-foreground">
              {error instanceof Error ? error.message : "An error occurred"}
            </p>
          </div>
        ) : pendingEngagements.length === 0 ? (
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
