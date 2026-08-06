export type DecisionOption = {
  id: string;
  optionText: string;
};

export type Decision = {
  id: string;
  title: string;
  context: string;
  decisionSummary: string;
  outcome: string | null;
  category: string | null;
  tags: string[] | null;
  createdById: string;
  updatedById: string;
  entityType: string | null;
  entityId: string | null;
  createdAt: string;
  updatedAt: string;
  options: DecisionOption[];
};

export type ListDecisionsResponse = {
  data: Decision[];
  total: number;
  page: number;
  pageSize: number;
};

export type CreateDecisionInput = {
  title: string;
  context: string;
  decisionSummary: string;
  category?: string;
  tags?: string[];
  options?: string[];
  outcome?: string;
};

export type UpdateDecisionInput = {
  context?: string;
  decisionSummary?: string;
  options?: string[];
  tags?: string[];
  outcome?: string;
  category?: string;
};

export type DecisionComment = {
  id: string;
  decisionId: string;
  parentId: string | null;
  authorId: string;
  authorName: string;
  authorInitials: string;
  body: string;
  createdAt: string;
  replies: DecisionComment[];
};

export const DECISION_CATEGORIES = [
  'Architecture',
  'Technology',
  'Product',
  'Business',
  'Process',
  'Operations',
  'Security',
  'Other',
] as const;
