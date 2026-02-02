export interface User {
  id: string;
  name: string;
  email: string;
  role: 'partner' | 'manager' | 'staff';
}

export interface Engagement {
  id: string;
  entityName: string;
  entityCode: string;
  financialYear: string;
  status: 'pending' | 'submitted';
  dueDate: string;
  submittedDate?: string;
  teamMembers: User[];
}

export interface ChecklistResponse {
  questionId: string;
  response: 'confirm' | 'reject' | null;
}

export interface Declaration {
  id: string;
  engagementId: string;
  userId: string;
  responses: ChecklistResponse[];
  submittedAt: string;
}

export interface ChecklistQuestion {
  id: string;
  category: string;
  question: string;
}
