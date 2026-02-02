import { User, Engagement, Declaration } from "@/types";

export const currentUser: User = {
  id: "user-1",
  name: "Rajesh Kumar",
  email: "rajesh.kumar@auditfirm.com",
  role: "partner"
};

export const mockUsers: User[] = [
  currentUser,
  {
    id: "user-2",
    name: "Priya Sharma",
    email: "priya.sharma@auditfirm.com",
    role: "manager"
  },
  {
    id: "user-3",
    name: "Amit Patel",
    email: "amit.patel@auditfirm.com",
    role: "staff"
  },
  {
    id: "user-4",
    name: "Sneha Gupta",
    email: "sneha.gupta@auditfirm.com",
    role: "staff"
  },
  {
    id: "user-5",
    name: "Vikram Singh",
    email: "vikram.singh@auditfirm.com",
    role: "staff"
  }
];

export const mockEngagements: Engagement[] = [
  {
    id: "eng-1",
    entityName: "Reliance Industries Limited",
    entityCode: "RIL",
    financialYear: "2025-26",
    status: "pending",
    dueDate: "2026-03-15",
    teamMembers: [mockUsers[0], mockUsers[1], mockUsers[2]]
  },
  {
    id: "eng-2",
    entityName: "Tata Consultancy Services",
    entityCode: "TCS",
    financialYear: "2025-26",
    status: "pending",
    dueDate: "2026-03-20",
    teamMembers: [mockUsers[0], mockUsers[3]]
  },
  {
    id: "eng-3",
    entityName: "Infosys Limited",
    entityCode: "INFY",
    financialYear: "2025-26",
    status: "submitted",
    dueDate: "2026-02-28",
    submittedDate: "2026-01-15",
    teamMembers: [mockUsers[0], mockUsers[1], mockUsers[4]]
  },
  {
    id: "eng-4",
    entityName: "HDFC Bank Limited",
    entityCode: "HDFCBANK",
    financialYear: "2025-26",
    status: "submitted",
    dueDate: "2026-03-10",
    submittedDate: "2026-01-20",
    teamMembers: [mockUsers[0], mockUsers[2], mockUsers[3]]
  },
  {
    id: "eng-5",
    entityName: "Bharti Airtel Limited",
    entityCode: "BHARTIARTL",
    financialYear: "2025-26",
    status: "pending",
    dueDate: "2026-04-01",
    teamMembers: [mockUsers[1], mockUsers[4]]
  }
];

export const mockDeclarations: Declaration[] = [
  {
    id: "dec-1",
    engagementId: "eng-3",
    userId: "user-1",
    responses: Array.from({ length: 18 }, (_, i) => ({
      questionId: `q-${i + 1}`,
      response: "confirm" as const
    })),
    submittedAt: "2026-01-15T10:30:00Z"
  },
  {
    id: "dec-2",
    engagementId: "eng-4",
    userId: "user-1",
    responses: Array.from({ length: 18 }, (_, i) => ({
      questionId: `q-${i + 1}`,
      response: "confirm" as const
    })),
    submittedAt: "2026-01-20T14:45:00Z"
  }
];
