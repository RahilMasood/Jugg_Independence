import { Engagement } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Calendar, Building2, Users, ChevronRight } from "lucide-react";
import { format, parseISO, isPast } from "date-fns";
import { cn } from "@/lib/utils";

interface EngagementCardProps {
  engagement: Engagement;
  onClick: () => void;
  showTeamCount?: boolean;
  showStatus?: boolean;
}

export function EngagementCard({ engagement, onClick, showTeamCount = false, showStatus = true }: EngagementCardProps) {
  const entityName = engagement.entityName || engagement.engagement_name || engagement.client_name || engagement.id;
  const entityCode = engagement.entityCode || engagement.id;
  const financialYear = engagement.financialYear || engagement.fy_year || '';
  const dueDate = engagement.dueDate;
  const isOverdue = engagement.status === "pending" && dueDate && isPast(parseISO(dueDate));
  const status = isOverdue ? "overdue" : engagement.status;
  const independenceToolCount = engagement.teamMembers?.filter(m => m.independence_tool).length || 0;

  return (
    <Card 
      className={cn(
        "group cursor-pointer transition-all duration-200 hover:shadow-md hover:border-primary/20",
        "animate-fade-in"
      )}
      onClick={onClick}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-foreground truncate">
                  {entityName}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {entityCode}{financialYear && ` • FY ${financialYear}`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 mt-4">
              {dueDate && (
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>
                    {engagement.status === "submitted" && engagement.submittedDate
                      ? `Submitted ${format(parseISO(engagement.submittedDate), "MMM d, yyyy")}`
                      : `Due ${format(parseISO(dueDate), "MMM d, yyyy")}`
                    }
                  </span>
                </div>
              )}

              {showTeamCount && (
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Users className="h-4 w-4" />
                  <span>{independenceToolCount} in independence tool</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {showStatus && <StatusBadge status={status} />}
            <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
