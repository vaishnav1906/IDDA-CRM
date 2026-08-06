import { useCallback, useEffect, useRef, useState } from 'react';

import { styled } from '@linaria/react';
import { t } from '@lingui/core/macro';
import { isDefined } from 'twenty-shared/utils';
import { themeCssVariables } from 'twenty-ui/theme-constants';

import { useDecisionRegisterApi } from '@/decision-register/hooks/useDecisionRegisterApi';
import { DecisionComment } from '@/decision-register/types/decision.type';

// ─── colour palette for author avatars ───────────────────────────────────────
const AVATAR_COLORS = [
  '#4f6ef7', '#e05c97', '#f59e0b', '#10b981', '#8b5cf6',
  '#ef4444', '#06b6d4', '#84cc16', '#f97316', '#ec4899',
];

function avatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function relativeTime(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

// ─── styled primitives ────────────────────────────────────────────────────────
const StyledSection = styled.div`
  border: 1px solid ${themeCssVariables.border.color.light};
  border-radius: ${themeCssVariables.border.radius.md};
  margin-top: ${themeCssVariables.spacing[6]};
  overflow: hidden;
`;

const StyledSectionHeader = styled.div`
  align-items: center;
  background: ${themeCssVariables.background.secondary};
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  display: flex;
  gap: ${themeCssVariables.spacing[2]};
  justify-content: space-between;
  padding: ${themeCssVariables.spacing[3]} ${themeCssVariables.spacing[4]};
`;

const StyledSectionTitle = styled.span`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.xs};
  font-weight: ${themeCssVariables.font.weight.medium};
  letter-spacing: 0.05em;
  text-transform: uppercase;
`;

const StyledCount = styled.span`
  background: ${themeCssVariables.background.tertiary};
  border-radius: 9999px;
  color: ${themeCssVariables.font.color.secondary};
  font-size: ${themeCssVariables.font.size.xs};
  font-weight: ${themeCssVariables.font.weight.medium};
  padding: 1px 8px;
`;

const StyledCommentList = styled.div`
  display: flex;
  flex-direction: column;
`;

const StyledEmpty = styled.div`
  color: ${themeCssVariables.font.color.light};
  font-size: ${themeCssVariables.font.size.sm};
  padding: ${themeCssVariables.spacing[8]} ${themeCssVariables.spacing[4]};
  text-align: center;
`;

const StyledCommentItem = styled.div<{ isReply?: boolean }>`
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  padding: ${themeCssVariables.spacing[4]};
  padding-left: ${({ isReply }) => (isReply ? themeCssVariables.spacing[8] : themeCssVariables.spacing[4])};
  position: relative;

  &:last-child {
    border-bottom: none;
  }
`;

const StyledReplyThread = styled.div`
  border-left: 2px solid ${themeCssVariables.border.color.light};
  margin-left: ${themeCssVariables.spacing[5]};
  margin-top: 2px;
`;

const StyledCommentRow = styled.div`
  align-items: flex-start;
  display: flex;
  gap: ${themeCssVariables.spacing[3]};
`;

const StyledAvatar = styled.div<{ color: string }>`
  align-items: center;
  background: ${({ color }) => color}22;
  border-radius: 50%;
  color: ${({ color }) => color};
  display: flex;
  flex-shrink: 0;
  font-size: ${themeCssVariables.font.size.xs};
  font-weight: ${themeCssVariables.font.weight.semiBold};
  height: 32px;
  justify-content: center;
  width: 32px;
`;

const StyledCommentBody = styled.div`
  flex: 1;
  min-width: 0;
`;

const StyledCommentMeta = styled.div`
  align-items: center;
  display: flex;
  gap: ${themeCssVariables.spacing[2]};
  margin-bottom: 4px;
`;

const StyledAuthorName = styled.span`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.sm};
  font-weight: ${themeCssVariables.font.weight.medium};
`;

const StyledTimestamp = styled.span`
  color: ${themeCssVariables.font.color.light};
  font-size: ${themeCssVariables.font.size.xs};
`;

const StyledCommentText = styled.p`
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.sm};
  line-height: 1.6;
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
`;

const StyledActions = styled.div`
  align-items: center;
  display: flex;
  gap: ${themeCssVariables.spacing[3]};
  margin-top: ${themeCssVariables.spacing[2]};
`;

const StyledActionBtn = styled.button<{ danger?: boolean }>`
  background: none;
  border: none;
  color: ${({ danger }) =>
    danger ? themeCssVariables.color.red : themeCssVariables.font.color.light};
  cursor: pointer;
  font-size: ${themeCssVariables.font.size.xs};
  font-weight: ${themeCssVariables.font.weight.medium};
  padding: 0;
  transition: color 0.15s;

  &:hover {
    color: ${({ danger }) =>
      danger ? themeCssVariables.color.red : themeCssVariables.font.color.secondary};
    text-decoration: underline;
  }
`;

// ─── composer ────────────────────────────────────────────────────────────────
const StyledComposerWrap = styled.div<{ isReply?: boolean }>`
  border-top: ${({ isReply }) => (isReply ? 'none' : `1px solid ${themeCssVariables.border.color.light}`)};
  padding: ${({ isReply }) => (isReply ? `${themeCssVariables.spacing[3]} 0 0 0` : themeCssVariables.spacing[4])};
`;

const StyledComposerInner = styled.div`
  align-items: flex-start;
  display: flex;
  gap: ${themeCssVariables.spacing[3]};
`;

const StyledTextarea = styled.textarea`
  background: ${themeCssVariables.background.primary};
  border: 1px solid ${themeCssVariables.border.color.medium};
  border-radius: ${themeCssVariables.border.radius.sm};
  color: ${themeCssVariables.font.color.primary};
  flex: 1;
  font-family: inherit;
  font-size: ${themeCssVariables.font.size.sm};
  line-height: 1.5;
  min-height: 72px;
  outline: none;
  padding: ${themeCssVariables.spacing[2]} ${themeCssVariables.spacing[3]};
  resize: vertical;
  transition: border-color 0.15s;

  &:focus {
    border-color: ${themeCssVariables.color.blue};
  }

  &::placeholder {
    color: ${themeCssVariables.font.color.light};
  }
`;

const StyledComposerFooter = styled.div`
  display: flex;
  justify-content: flex-end;
  margin-top: ${themeCssVariables.spacing[2]};
  gap: ${themeCssVariables.spacing[2]};
`;

const StyledPostBtn = styled.button`
  background: ${themeCssVariables.color.blue};
  border: none;
  border-radius: ${themeCssVariables.border.radius.sm};
  color: #fff;
  cursor: pointer;
  font-size: ${themeCssVariables.font.size.xs};
  font-weight: ${themeCssVariables.font.weight.semiBold};
  padding: ${themeCssVariables.spacing[1]} ${themeCssVariables.spacing[3]};
  transition: opacity 0.15s;

  &:disabled {
    opacity: 0.4;
    cursor: default;
  }

  &:hover:not(:disabled) {
    opacity: 0.85;
  }
`;

const StyledCancelBtn = styled.button`
  background: none;
  border: 1px solid ${themeCssVariables.border.color.medium};
  border-radius: ${themeCssVariables.border.radius.sm};
  color: ${themeCssVariables.font.color.secondary};
  cursor: pointer;
  font-size: ${themeCssVariables.font.size.xs};
  padding: ${themeCssVariables.spacing[1]} ${themeCssVariables.spacing[3]};

  &:hover {
    background: ${themeCssVariables.background.secondary};
  }
`;

// ─── sub-components ──────────────────────────────────────────────────────────
type ComposerProps = {
  placeholder: string;
  onSubmit: (body: string) => Promise<void>;
  onCancel?: () => void;
  isReply?: boolean;
  autoFocus?: boolean;
};

const Composer = ({ placeholder, onSubmit, onCancel, isReply, autoFocus }: ComposerProps) => {
  const [value, setValue] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (autoFocus) ref.current?.focus();
  }, [autoFocus]);

  const handleSubmit = async () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    setSubmitting(true);
    try {
      await onSubmit(trimmed);
      setValue('');
    } finally {
      setSubmitting(false);
    }
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      void handleSubmit();
    }
    if (e.key === 'Escape' && onCancel) {
      onCancel();
    }
  };

  return (
    <StyledComposerWrap isReply={isReply}>
      <StyledComposerInner>
        <StyledTextarea
          ref={ref}
          placeholder={placeholder}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKey}
          rows={isReply ? 2 : 3}
        />
      </StyledComposerInner>
      <StyledComposerFooter>
        {isDefined(onCancel) && (
          <StyledCancelBtn onClick={onCancel}>{t`Cancel`}</StyledCancelBtn>
        )}
        <StyledPostBtn onClick={handleSubmit} disabled={!value.trim() || submitting}>
          {submitting ? t`Posting…` : isReply ? t`Reply` : t`Post`}
        </StyledPostBtn>
      </StyledComposerFooter>
    </StyledComposerWrap>
  );
};

type CommentItemProps = {
  comment: DecisionComment;
  currentUserId: string;
  canModerate: boolean;
  decisionId: string;
  onReload: () => void;
  depth?: number;
};

const CommentItem = ({
  comment,
  currentUserId,
  canModerate,
  decisionId,
  onReload,
  depth = 0,
}: CommentItemProps) => {
  const [replyOpen, setReplyOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { addComment, deleteComment } = useDecisionRegisterApi();
  const color = avatarColor(comment.authorName);
  const isOwn = comment.authorId === currentUserId;

  const handleReply = async (body: string) => {
    await addComment(decisionId, body, comment.id);
    setReplyOpen(false);
    onReload();
  };

  const handleDelete = async () => {
    if (!window.confirm(t`Delete this comment?`)) return;
    setDeleting(true);
    try {
      await deleteComment(comment.id);
      onReload();
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <StyledCommentItem isReply={depth > 0}>
        <StyledCommentRow>
          <StyledAvatar color={color}>{comment.authorInitials}</StyledAvatar>
          <StyledCommentBody>
            <StyledCommentMeta>
              <StyledAuthorName>{comment.authorName}</StyledAuthorName>
              <StyledTimestamp>{relativeTime(comment.createdAt)}</StyledTimestamp>
            </StyledCommentMeta>
            <StyledCommentText>{comment.body}</StyledCommentText>
            <StyledActions>
              {depth === 0 && (
                <StyledActionBtn onClick={() => setReplyOpen((v) => !v)}>
                  {replyOpen ? t`Cancel` : t`Reply`}
                </StyledActionBtn>
              )}
              {(isOwn || canModerate) && (
                <StyledActionBtn danger onClick={handleDelete} disabled={deleting}>
                  {deleting ? t`Deleting…` : t`Delete`}
                </StyledActionBtn>
              )}
            </StyledActions>
            {replyOpen && (
              <Composer
                placeholder={t`Reply to ${comment.authorName}…`}
                onSubmit={handleReply}
                onCancel={() => setReplyOpen(false)}
                isReply
                autoFocus
              />
            )}
          </StyledCommentBody>
        </StyledCommentRow>
      </StyledCommentItem>

      {comment.replies.length > 0 && (
        <StyledReplyThread>
          {comment.replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              currentUserId={currentUserId}
              canModerate={canModerate}
              decisionId={decisionId}
              onReload={onReload}
              depth={depth + 1}
            />
          ))}
        </StyledReplyThread>
      )}
    </>
  );
};

// ─── main export ─────────────────────────────────────────────────────────────
type DecisionThreadSectionProps = {
  decisionId: string;
  currentUserId: string;
  canModerate: boolean;
};

export const DecisionThreadSection = ({
  decisionId,
  currentUserId,
  canModerate,
}: DecisionThreadSectionProps) => {
  const [comments, setComments] = useState<DecisionComment[]>([]);
  const [loading, setLoading] = useState(true);
  const { listComments, addComment } = useDecisionRegisterApi();

  const reload = useCallback(() => {
    setLoading(true);
    listComments(decisionId)
      .then(setComments)
      .catch(() => setComments([]))
      .finally(() => setLoading(false));
  }, [decisionId, listComments]);

  useEffect(() => {
    reload();
  }, [reload]);

  const totalCount = comments.reduce(
    (acc, c) => acc + 1 + c.replies.length,
    0,
  );

  const handleTopLevel = async (body: string) => {
    await addComment(decisionId, body);
    reload();
  };

  return (
    <StyledSection>
      <StyledSectionHeader>
        <StyledSectionTitle>{t`Discussion`}</StyledSectionTitle>
        {!loading && <StyledCount>{totalCount}</StyledCount>}
      </StyledSectionHeader>

      <StyledComposerWrap>
        <Composer
          placeholder={t`Share your thoughts on this decision…`}
          onSubmit={handleTopLevel}
        />
      </StyledComposerWrap>

      <StyledCommentList>
        {loading ? (
          <StyledEmpty>{t`Loading…`}</StyledEmpty>
        ) : comments.length === 0 ? (
          <StyledEmpty>{t`No comments yet. Be the first to share your thoughts.`}</StyledEmpty>
        ) : (
          comments.map((c) => (
            <CommentItem
              key={c.id}
              comment={c}
              currentUserId={currentUserId}
              canModerate={canModerate}
              decisionId={decisionId}
              onReload={reload}
            />
          ))
        )}
      </StyledCommentList>
    </StyledSection>
  );
};
