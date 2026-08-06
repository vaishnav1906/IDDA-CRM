export type DecisionOptionResponse = {
  id: string;
  optionText: string;
};

export type DecisionResponse = {
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
  options: DecisionOptionResponse[];
  status: 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';
  requestedApproverIds: string[];
  requestedApproverNames: string[];
  approvedById: string | null;
  approvedAt: string | null;
  createdByName: string;
  attachments: AttachmentResponse[];
};

export type AttachmentResponse = {
  id: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  uploadedById: string;
  uploadedAt: string;
  downloadUrl: string;
};

export type MemberResponse = {
  id: string;
  name: string;
  email: string;
};

export type DecisionPermissionsResponse = {
  userId: string;
  userEmail: string;
  userName: string;
  canApprove: boolean;
  role: string;
};

export type ListDecisionsResponse = {
  data: DecisionResponse[];
  total: number;
  page: number;
  pageSize: number;
};

export type CommentResponse = {
  id: string;
  decisionId: string;
  parentId: string | null;
  authorId: string;
  authorName: string;
  authorInitials: string;
  body: string;
  createdAt: string;
  replies: CommentResponse[];
};
