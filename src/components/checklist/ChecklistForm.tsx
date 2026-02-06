import { useState } from "react";
import { checklistQuestions } from "@/data/checklistQuestions";
import { Engagement, ChecklistResponse } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { CheckCircle2, XCircle, AlertCircle, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface ChecklistFormProps {
  engagement: Engagement;
  onSubmit: (responses: ChecklistResponse[]) => void;
  onCancel: () => void;
}

export function ChecklistForm({ engagement, onSubmit, onCancel }: ChecklistFormProps) {
  const [responses, setResponses] = useState<Record<string, 'confirm' | 'reject' | null>>({});

  const handleResponseChange = (questionId: string, value: 'confirm' | 'reject') => {
    setResponses(prev => ({ ...prev, [questionId]: value }));
  };

  const handleSubmit = () => {
    const unanswered = checklistQuestions.filter(q => !responses[q.id]);
    
    if (unanswered.length > 0) {
      toast.error(`Please answer all questions. ${unanswered.length} question(s) remaining.`);
      return;
    }

    const formattedResponses: ChecklistResponse[] = checklistQuestions.map(q => ({
      questionId: q.id,
      response: responses[q.id] || null
    }));

    onSubmit(formattedResponses);
  };

  // Group questions by category
  const groupedQuestions = checklistQuestions.reduce((acc, question) => {
    if (!acc[question.category]) {
      acc[question.category] = [];
    }
    acc[question.category].push(question);
    return acc;
  }, {} as Record<string, typeof checklistQuestions>);

  const answeredCount = Object.keys(responses).length;
  const totalCount = checklistQuestions.length;
  const progress = (answeredCount / totalCount) * 100;

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

  return (
    <div className="space-y-6">
      {/* Progress Header */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-muted-foreground">
              Progress: {answeredCount} of {totalCount} questions answered
            </span>
            <span className="text-sm font-semibold text-primary">
              {Math.round(progress)}%
            </span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div 
              className="h-full bg-accent transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
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
          <CardContent className="space-y-6">
            {questions.map((question, index) => (
              <div 
                key={question.id}
                className={cn(
                  "p-4 rounded-lg border transition-all duration-200",
                  responses[question.id] 
                    ? responses[question.id] === 'confirm' 
                      ? "border-success/30 bg-success/5"
                      : "border-destructive/30 bg-destructive/5"
                    : "border-border bg-muted/30"
                )}
              >
                <p className="text-sm text-foreground mb-4 whitespace-pre-line leading-relaxed">
                  <span className="font-semibold text-muted-foreground mr-2">
                    {index + 1}.
                  </span>
                  {formatQuestion(question.question)}
                </p>

                <RadioGroup
                  value={responses[question.id] || ""}
                  onValueChange={(value) => handleResponseChange(question.id, value as 'confirm' | 'reject')}
                  className="flex gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem 
                      value="confirm" 
                      id={`${question.id}-confirm`}
                      className="border-success text-success"
                    />
                    <Label 
                      htmlFor={`${question.id}-confirm`}
                      className="flex items-center gap-1.5 cursor-pointer text-sm font-medium"
                    >
                      <CheckCircle2 className="h-4 w-4 text-success" />
                      Confirm
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem 
                      value="reject" 
                      id={`${question.id}-reject`}
                      className="border-destructive text-destructive"
                    />
                    <Label 
                      htmlFor={`${question.id}-reject`}
                      className="flex items-center gap-1.5 cursor-pointer text-sm font-medium"
                    >
                      <XCircle className="h-4 w-4 text-destructive" />
                      Reject
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}

      {/* Submit Actions */}
      <div className="sticky bottom-0 bg-background/95 backdrop-blur-sm border-t py-4 -mx-8 px-8 flex items-center justify-between">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button 
          onClick={handleSubmit}
          disabled={answeredCount < totalCount}
          className="gap-2"
        >
          <Send className="h-4 w-4" />
          Submit Declaration
        </Button>
      </div>
    </div>
  );
}
