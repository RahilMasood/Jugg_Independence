import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/MainLayout";
import { EngagementCard } from "@/components/engagement/EngagementCard";
import { ChecklistForm } from "@/components/checklist/ChecklistForm";
import { Engagement, ChecklistResponse } from "@/types";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CheckCircle2, FileText, Loader2, Edit } from "lucide-react";
import { independenceApi } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export default function SubmittedDashboard() {
  const [selectedEngagement, setSelectedEngagement] = useState<Engagement | null>(null);
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: submittedEngagements = [], isLoading, error } = useQuery({
    queryKey: ["independence", "submitted-engagements", user?.id],
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
    },
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    staleTime: 0, // Always consider data stale to ensure fresh data on navigation
  });

  // When an engagement is selected, fetch its responses JSON from SharePoint via backend
  const { data: responsesJson, isLoading: isLoadingResponses, error: responsesError } = useQuery({
    queryKey: ["independence", "responses-file", selectedEngagement?.id, user?.id],
    queryFn: async () => {
      if (!selectedEngagement?.id) return null;
      try {
        const result = await independenceApi.getResponsesFile(selectedEngagement.id);
        return result;
      } catch (error) {
        console.error("Error fetching responses file:", error);
        throw error;
      }
    },
    enabled: !!selectedEngagement?.id,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    staleTime: 0, // Always refetch to get latest responses
    retry: 1, // Retry once on failure
  });

  // Derive the current user's responses from the JSON file
  let selectedResponses: ChecklistResponse[] = [];
  if (selectedEngagement && responsesJson) {
    // responsesJson should already be the JSON object (extracted from response.data.json in api.ts)
    // But handle case where it might be wrapped
    let jsonData: any = responsesJson;
    if (responsesJson && typeof responsesJson === "object" && "json" in responsesJson && !Array.isArray(responsesJson)) {
      jsonData = (responsesJson as any).json;
    }

    if (jsonData && typeof jsonData === "object" && !Array.isArray(jsonData) && jsonData !== null) {
      // responsesJson is an object with keys like "Rahil M", "Hardik", etc.
      // Each value is an object with user, engagement_id, responses, etc.
      const entries = Object.entries(jsonData || {}) as [string, any][];
      
      // Get user identifiers - check multiple possible field names
      const currentUserId = user?.id || (user as any)?.user_id || (user as any)?.userId ? String(user.id || (user as any)?.user_id || (user as any)?.userId).toLowerCase().trim() : null;
      const currentEmail = (user?.email || "").toLowerCase().trim();
      const currentUserName = (user?.user_name || user?.name || (user as any)?.userName || "").toLowerCase().trim();
      const currentType = (user as any)?.type || (user as any)?.user_type || null;

      // Try to match by ID first (most reliable) - check multiple ID field names
      let match: [string, any] | undefined = currentUserId
        ? entries.find(([_, e]) => {
            const entryId = e?.user?.id ? String(e.user.id).toLowerCase().trim() : null;
            const entryUserId = e?.user?.user_id ? String(e.user.user_id).toLowerCase().trim() : null;
            return (entryId && entryId === currentUserId) || (entryUserId && entryUserId === currentUserId);
          })
        : undefined;

      // If no ID match, try email
      if (!match && currentEmail) {
        match = entries.find(([_, e]) => {
          const entryEmail = e?.user?.email ? String(e.user.email).toLowerCase().trim() : "";
          return entryEmail && entryEmail === currentEmail;
        });
      }

      // If no email match, try matching by JSON key (user name) or user.name in entry
      if (!match && currentUserName) {
        match = entries.find(([key, e]) => {
          const keyLower = key.toLowerCase().trim();
          const entryName = e?.user?.name ? String(e.user.name).toLowerCase().trim() : "";
          return (keyLower === currentUserName || entryName === currentUserName);
        });
      }

      // For external users, if there is exactly one entry with role === 'external', prefer that
      if (!match && currentType === "external") {
        const externals = entries.filter(([_, e]) => e?.user?.role === "external");
        if (externals.length === 1) {
          match = externals[0];
        }
      }

      // Final fallback: Try to match JSON key directly (case-insensitive, trimmed)
      // This handles cases where the key is the user's name but doesn't match exactly
      if (!match) {
        for (const [key, entry] of entries) {
          const keyLower = key.toLowerCase().trim();
          // Try matching key against user name variations
          if (currentUserName && keyLower === currentUserName) {
            match = [key, entry];
            break;
          }
          // Try partial match (key contains name or name contains key)
          if (currentUserName && (keyLower.includes(currentUserName) || currentUserName.includes(keyLower))) {
            match = [key, entry];
            break;
          }
        }
      }

      // Extract the entry data if match found
      if (match && Array.isArray(match[1]?.responses)) {
        selectedResponses = match[1].responses as ChecklistResponse[];
      }
    }
  }

  // Handle saving updated responses
  const handleSaveChanges = async (responses: ChecklistResponse[]) => {
    if (!selectedEngagement) return;

    try {
      // Use the same submit endpoint - it should update existing entries
      await independenceApi.submitFromTool(selectedEngagement.id, responses);
      
      // Invalidate queries to refetch updated data
      queryClient.invalidateQueries({ queryKey: ["independence", "responses-file", selectedEngagement.id] });
      queryClient.invalidateQueries({ queryKey: ["independence", "submitted-engagements", user?.id] });
      
      toast.success("Declaration updated successfully!");
    } catch (error: any) {
      toast.error(error?.message || "Failed to update declaration");
    }
  };

  // Detail view: show editable checklist with loaded responses
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
              <Edit className="h-6 w-6 text-success" />
              <h1 className="text-2xl font-bold text-foreground">
                Edit Declaration
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
          ) : responsesError ? (
            <div className="text-center py-16 bg-card rounded-xl border">
              <CheckCircle2 className="h-12 w-12 text-destructive mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Error loading responses
              </h3>
              <p className="text-muted-foreground">
                {responsesError instanceof Error ? responsesError.message : "Failed to load responses from SharePoint"}
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Please try refreshing the page or contact support if the issue persists.
              </p>
            </div>
          ) : !responsesJson || (typeof responsesJson === "object" && Object.keys(responsesJson).length === 0) ? (
            <div className="text-center py-16 bg-card rounded-xl border">
              <CheckCircle2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                No responses file found
              </h3>
              <p className="text-muted-foreground">
                This engagement has no saved responses in SharePoint yet.
              </p>
            </div>
          ) : !selectedResponses.length ? (
            <div className="text-center py-16 bg-card rounded-xl border">
              <CheckCircle2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                No responses found for your account
              </h3>
              <p className="text-muted-foreground">
                The responses file exists but no matching entry was found for your user account.
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                User: {user?.user_name || user?.name || user?.email || "Unknown"}
              </p>
            </div>
          ) : (
            <ChecklistForm
              engagement={selectedEngagement}
              onSubmit={handleSaveChanges}
              onCancel={() => setSelectedEngagement(null)}
              initialResponses={selectedResponses}
              submitButtonText="Save Changes"
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

