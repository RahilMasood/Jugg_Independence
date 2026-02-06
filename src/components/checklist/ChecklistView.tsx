import { checklistQuestions } from "@/data/checklistQuestions";
import { Engagement, ChecklistResponse } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChecklistViewProps {
  engagement: Engagement;
  responses: ChecklistResponse[];
}

export function ChecklistView({ engagement, responses }: ChecklistViewProps) {
  // Group questions by category
  const groupedQuestions = checklistQuestions.reduce((acc, question) => {
    if (!acc[question.category]) {
      acc[question.category] = [];
    }
    acc[question.category].push(question);
    return acc;
  }, {} as Record<string, typeof checklistQuestions>);

  // Create a map for quick response lookup
  const responseMap = responses.reduce((acc, r) => {
    acc[r.questionId] = r.response;
    return acc;
  }, {} as Record<string, 'confirm' | 'reject' | null>);

  // Replace entity placeholders
  // Use client_name for questions (as per requirement), but engagement_name for display elsewhere
  const formatQuestion = (text: string) => {
    const entityName = engagement.client_name || engagement.entityName || "";
    const entityCode = engagement.entityCode || "";
    const yearStart = engagement.financialYear?.split("-")[0] || "";

    return text
      .replace(/\[Entity Name and Code\]/g, `${entityName} (${entityCode})`)
      .replace(/\[Year\]/g, yearStart);
  };

  const confirmCount = responses.filter(r => r.response === 'confirm').length;
  const rejectCount = responses.filter(r => r.response === 'reject').length;

  return (
    <div className="space-y-6">
      {/* Summary */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-success" />
              <span className="text-sm font-medium">{confirmCount} Confirmed</span>
            </div>
            <div className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-destructive" />
              <span className="text-sm font-medium">{rejectCount} Rejected</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Questions by Category */}
      {Object.entries(groupedQuestions).map(([category, questions], categoryIndex) => (
        <Card key={category} className="animate-fade-in" style={{ animationDelay: `${categoryIndex * 50}ms` }}>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-accent" />
              {category}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {questions.map((question, index) => {
              const response = responseMap[question.id];
              
              return (
                <div 
                  key={question.id}
                  className={cn(
                    "p-4 rounded-lg border",
                    response === 'confirm' 
                      ? "border-success/30 bg-success/5"
                      : "border-destructive/30 bg-destructive/5"
                  )}
                >
                  <div className="flex items-start justify-between gap-4">
                    <p className="text-sm text-foreground whitespace-pre-line leading-relaxed flex-1">
                      <span className="font-semibold text-muted-foreground mr-2">
                        {index + 1}.
                      </span>
                      {formatQuestion(question.question)}
                    </p>
                    <div className={cn(
                      "flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium shrink-0",
                      response === 'confirm'
                        ? "bg-success/10 text-success"
                        : "bg-destructive/10 text-destructive"
                    )}>
                      {response === 'confirm' ? (
                        <>
                          <CheckCircle2 className="h-4 w-4" />
                          Confirmed
                        </>
                      ) : (
                        <>
                          <XCircle className="h-4 w-4" />
                          Rejected
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
