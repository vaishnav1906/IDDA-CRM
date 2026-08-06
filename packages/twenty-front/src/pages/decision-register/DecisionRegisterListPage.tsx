import { useCallback, useEffect, useState } from 'react';

import { styled } from '@linaria/react';
import { t } from '@lingui/core/macro';
import { useNavigate } from 'react-router-dom';
import { isDefined } from 'twenty-shared/utils';
import { themeCssVariables } from 'twenty-ui/theme-constants';
import { H2Title } from 'twenty-ui/typography';
import { Button } from 'twenty-ui/input';
import { IconPlus, IconSearch, IconTrash } from 'twenty-ui/icon';

import { useDecisionRegisterApi } from '@/decision-register/hooks/useDecisionRegisterApi';
import {
  Decision,
  DECISION_CATEGORIES,
} from '@/decision-register/types/decision.type';

const StyledPage = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  max-width: 1024px;
  margin: 0 auto;
  padding: ${themeCssVariables.spacing[6]};
`;

const StyledHeader = styled.div`
  align-items: center;
  display: flex;
  justify-content: space-between;
  margin-bottom: ${themeCssVariables.spacing[6]};
`;

const StyledToolbar = styled.div`
  display: flex;
  gap: ${themeCssVariables.spacing[3]};
  margin-bottom: ${themeCssVariables.spacing[5]};
  flex-wrap: wrap;
`;

const StyledSearchInput = styled.div`
  position: relative;
  flex: 1;
  min-width: 200px;

  input {
    width: 100%;
    padding: ${themeCssVariables.spacing[2]} ${themeCssVariables.spacing[3]};
    padding-left: ${themeCssVariables.spacing[8]};
    border: 1px solid ${themeCssVariables.border.color.medium};
    border-radius: ${themeCssVariables.border.radius.sm};
    background: ${themeCssVariables.background.primary};
    color: ${themeCssVariables.font.color.primary};
    font-size: ${themeCssVariables.font.size.sm};
    outline: none;
    box-sizing: border-box;

    &:focus {
      border-color: ${themeCssVariables.color.blue};
    }
  }

  svg {
    position: absolute;
    left: ${themeCssVariables.spacing[2]};
    top: 50%;
    transform: translateY(-50%);
    color: ${themeCssVariables.font.color.tertiary};
  }
`;

const StyledSelect = styled.select`
  padding: ${themeCssVariables.spacing[2]} ${themeCssVariables.spacing[3]};
  border: 1px solid ${themeCssVariables.border.color.medium};
  border-radius: ${themeCssVariables.border.radius.sm};
  background: ${themeCssVariables.background.primary};
  color: ${themeCssVariables.font.color.primary};
  font-size: ${themeCssVariables.font.size.sm};
  cursor: pointer;
  outline: none;
`;

const StyledTable = styled.table`
  width: 100%;
  border-collapse: collapse;
`;

const StyledTh = styled.th`
  text-align: left;
  font-size: ${themeCssVariables.font.size.xs};
  font-weight: ${themeCssVariables.font.weight.medium};
  color: ${themeCssVariables.font.color.tertiary};
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding: ${themeCssVariables.spacing[2]} ${themeCssVariables.spacing[3]};
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
`;

const StyledTd = styled.td`
  padding: ${themeCssVariables.spacing[3]};
  font-size: ${themeCssVariables.font.size.sm};
  color: ${themeCssVariables.font.color.primary};
  border-bottom: 1px solid ${themeCssVariables.border.color.light};
  vertical-align: top;
`;

const StyledRow = styled.tr`
  cursor: pointer;

  &:hover td {
    background: ${themeCssVariables.background.tertiary};
  }
`;

const StyledChip = styled.span`
  display: inline-block;
  padding: 2px ${themeCssVariables.spacing[2]};
  border-radius: 9999px;
  background: ${themeCssVariables.color.blue}20;
  color: ${themeCssVariables.color.blue};
  font-size: ${themeCssVariables.font.size.xs};
  font-weight: ${themeCssVariables.font.weight.medium};
`;

const StyledPagination = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: ${themeCssVariables.spacing[5]};
  font-size: ${themeCssVariables.font.size.sm};
  color: ${themeCssVariables.font.color.secondary};
`;

const StyledEmpty = styled.div`
  text-align: center;
  padding: ${themeCssVariables.spacing[12]} 0;
  color: ${themeCssVariables.font.color.light};
  font-size: ${themeCssVariables.font.size.sm};
`;

const PAGE_SIZE = 20;

export const DecisionRegisterListPage = () => {
  const navigate = useNavigate();
  const { listDecisions, deleteDecision } = useDecisionRegisterApi();

  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listDecisions({
        search: search || undefined,
        category: category || undefined,
        page,
        pageSize: PAGE_SIZE,
      });

      setDecisions(res.data);
      setTotal(res.total);
    } catch {
      // keep existing state on error
    } finally {
      setLoading(false);
    }
  }, [listDecisions, search, category, page]);

  useEffect(() => {
    setPage(1);
  }, [search, category]);

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!window.confirm(t`Delete this decision?`)) return;
    await deleteDecision(id);
    load();
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <StyledPage>
      <StyledHeader>
        <H2Title
          title={t`Decision Register`}
          description={t`${total} decisions`}
        />
        <Button
          title={t`New Decision`}
          Icon={IconPlus}
          size="small"
          variant="primary"
          onClick={() => navigate('/decision-register/new')}
        />
      </StyledHeader>

      <StyledToolbar>
        <StyledSearchInput>
          <IconSearch size={16} />
          <input
            placeholder={t`Search decisions…`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </StyledSearchInput>
        <StyledSelect
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="">{t`All categories`}</option>
          {DECISION_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </StyledSelect>
      </StyledToolbar>

      {loading ? (
        <StyledEmpty>{t`Loading…`}</StyledEmpty>
      ) : decisions.length === 0 ? (
        <StyledEmpty>{t`No decisions found.`}</StyledEmpty>
      ) : (
        <>
          <StyledTable>
            <thead>
              <tr>
                <StyledTh>{t`Title`}</StyledTh>
                <StyledTh>{t`Category`}</StyledTh>
                <StyledTh>{t`Tags`}</StyledTh>
                <StyledTh>{t`Created`}</StyledTh>
                <StyledTh />
              </tr>
            </thead>
            <tbody>
              {decisions.map((d) => (
                <StyledRow
                  key={d.id}
                  onClick={() => navigate(`/decision-register/${d.id}`)}
                >
                  <StyledTd>{d.title}</StyledTd>
                  <StyledTd>
                    {isDefined(d.category) ? (
                      <StyledChip>{d.category}</StyledChip>
                    ) : (
                      '—'
                    )}
                  </StyledTd>
                  <StyledTd>
                    {d.tags && d.tags.length > 0
                      ? d.tags.slice(0, 3).join(', ')
                      : '—'}
                  </StyledTd>
                  <StyledTd>
                    {new Date(d.createdAt).toLocaleDateString()}
                  </StyledTd>
                  <StyledTd>
                    <Button
                      title=""
                      Icon={IconTrash}
                      size="small"
                      variant="tertiary"
                      onClick={(e) => handleDelete(e, d.id)}
                    />
                  </StyledTd>
                </StyledRow>
              ))}
            </tbody>
          </StyledTable>

          {totalPages > 1 && (
            <StyledPagination>
              <span>{t`Page ${page} of ${totalPages}`}</span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <Button
                  title={t`Previous`}
                  size="small"
                  variant="secondary"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                />
                <Button
                  title={t`Next`}
                  size="small"
                  variant="secondary"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                />
              </div>
            </StyledPagination>
          )}
        </>
      )}
    </StyledPage>
  );
};
