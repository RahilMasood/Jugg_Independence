export interface User {
  id: string;
  name?: string;
  user_name?: string;
  email: string;
  role?: 'partner' | 'manager' | 'staff' | 'engagement_partner' | 'engagement_manager' | 'associate' | 'article';
  type?: string;
  main?: boolean;
  independence_tool?: boolean;
  confirmation_tool?: boolean;
  sampling_tool?: boolean;
}

export interface Engagement {
  id: string;
  entityName?: string;
  engagement_name?: string;
  entityCode?: string;
  audit_client_id?: string;
  client_name?: string;
  financialYear?: string;
  fy_year?: string;
  status: 'pending' | 'submitted' | 'Active' | 'Archived';
  dueDate?: string;
  submittedDate?: string;
  created_at?: string;
  updated_at?: string;
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
