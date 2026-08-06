import { useMemo, useState } from 'react';

import { useQuery } from '@apollo/client/react';
import { styled } from '@linaria/react';
import { Trans, useLingui } from '@lingui/react/macro';
import { formatDistanceToNow } from 'date-fns';

import { useAtomStateValue } from '@/ui/utilities/state/jotai/hooks/useAtomStateValue';
import { useSnackBarOnQueryError } from '@/apollo/hooks/useSnackBarOnQueryError';
import { useSettingsAllRoles } from '@/settings/roles/hooks/useSettingsAllRoles';
import { Select } from '@/ui/input/components/Select';
import { Table } from '@/ui/layout/table/components/Table';
import { TableCell } from '@/ui/layout/table/components/TableCell';
import { TableHeader } from '@/ui/layout/table/components/TableHeader';
import { TableRow } from '@/ui/layout/table/components/TableRow';
import { useApproveWorkspaceJoinRequest } from '@/workspace-join-request/hooks/useApproveWorkspaceJoinRequest';
import { useRejectWorkspaceJoinRequest } from '@/workspace-join-request/hooks/useRejectWorkspaceJoinRequest';
import { GET_WORKSPACE_JOIN_REQUESTS } from '@/workspace-join-request/graphql/queries/getWorkspaceJoinRequests';
import { isDefined } from 'twenty-shared/utils';
import { Button } from 'twenty-ui/input';
import { H2Title } from 'twenty-ui/typography';
import { Section } from 'twenty-ui/layout';
import { themeCssVariables } from 'twenty-ui/theme-constants';
import { dateLocaleState } from '~/localization/states/dateLocaleState';

type JoinRequest = {
  id: string;
  email: string;
  firstName: string;
  lastName?: string | null;
  message?: string | null;
  status: string;
  createdAt: string;
};

const StyledTableContainer = styled.div`
  > div {
    border-bottom: 1px solid ${themeCssVariables.border.color.light};
  }
`;

const StyledTableRows = styled.div`
  padding-bottom: ${themeCssVariables.spacing[2]};
  padding-top: ${themeCssVariables.spacing[2]};
`;

const StyledActionsContainer = styled.div`
  align-items: center;
  display: flex;
  flex-direction: row;
  flex-shrink: 0;
  gap: ${themeCssVariables.spacing[1]};
`;

const StyledRoleContainer = styled.div`
  min-width: 110px;
`;

const StyledMessageText = styled.div`
  color: ${themeCssVariables.font.color.tertiary};
  font-size: ${themeCssVariables.font.size.sm};
  font-style: italic;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const StyledNameCell = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${themeCssVariables.spacing[1]};
  min-width: 0;
  overflow: hidden;
`;

const StyledEmptyState = styled.div`
  color: ${themeCssVariables.font.color.tertiary};
  padding: ${themeCssVariables.spacing[4]} 0;
  text-align: center;
`;

export const WorkspaceJoinRequests = () => {
  const { t } = useLingui();
  const roles = useSettingsAllRoles();
  const { localeCatalog } = useAtomStateValue(dateLocaleState);
  const [selectedRoles, setSelectedRoles] = useState<Record<string, string>>(
    {},
  );

  const roleOptions = useMemo(
    () => [
      { label: t`Default role`, value: '' },
      ...roles.map((role) => ({ label: role.label, value: role.id })),
    ],
    [roles, t],
  );

  const { data, error } = useQuery<{ workspaceJoinRequests: JoinRequest[] }>(
    GET_WORKSPACE_JOIN_REQUESTS,
  );

  useSnackBarOnQueryError(error);

  const { approveRequest, loading: approveLoading } =
    useApproveWorkspaceJoinRequest();
  const { rejectRequest, loading: rejectLoading } =
    useRejectWorkspaceJoinRequest();

  const joinRequests: JoinRequest[] = data?.workspaceJoinRequests ?? [];

  const handleApprove = async (requestId: string) => {
    const roleId = selectedRoles[requestId] || null;
    await approveRequest(requestId, roleId);
  };

  const handleReject = async (requestId: string) => {
    await rejectRequest(requestId);
  };

  return (
    <Section>
      <H2Title
        title={t`Join Requests`}
        description={t`Pending requests from people who want to join this workspace`}
      />
      {joinRequests.length === 0 ? (
        <StyledEmptyState>
          <Trans>No pending join requests</Trans>
        </StyledEmptyState>
      ) : (
        <StyledTableContainer>
          <Table>
            <TableRow gridAutoColumns="2fr 2fr 2fr 140px 180px">
              <TableHeader>
                <Trans>Name</Trans>
              </TableHeader>
              <TableHeader>
                <Trans>Email</Trans>
              </TableHeader>
              <TableHeader>
                <Trans>Requested</Trans>
              </TableHeader>
              <TableHeader>
                <Trans>Role</Trans>
              </TableHeader>
              <TableHeader></TableHeader>
            </TableRow>
            <StyledTableRows>
              {joinRequests.map((request) => (
                <TableRow
                  gridAutoColumns="2fr 2fr 2fr 140px 180px"
                  key={request.id}
                >
                  <TableCell minWidth="0" overflow="hidden">
                    <StyledNameCell>
                      <span>
                        {request.firstName}
                        {isDefined(request.lastName) &&
                          request.lastName !== '' &&
                          ` ${request.lastName}`}
                      </span>
                      {isDefined(request.message) && request.message !== '' && (
                        <StyledMessageText title={request.message}>
                          {request.message}
                        </StyledMessageText>
                      )}
                    </StyledNameCell>
                  </TableCell>
                  <TableCell minWidth="0" overflow="hidden">
                    {request.email}
                  </TableCell>
                  <TableCell>
                    {formatDistanceToNow(new Date(request.createdAt), {
                      addSuffix: true,
                      locale: localeCatalog,
                    })}
                  </TableCell>
                  <TableCell>
                    <StyledRoleContainer>
                      <Select
                        dropdownId={`join-request-role-${request.id}`}
                        options={roleOptions}
                        value={selectedRoles[request.id] ?? ''}
                        onChange={(value) =>
                          setSelectedRoles((prev) => ({
                            ...prev,
                            [request.id]: value,
                          }))
                        }
                      />
                    </StyledRoleContainer>
                  </TableCell>
                  <TableCell align="right">
                    <StyledActionsContainer>
                      <Button
                        title={t`Approve`}
                        variant="secondary"
                        size="small"
                        onClick={() => handleApprove(request.id)}
                        disabled={approveLoading}
                      />
                      <Button
                        title={t`Reject`}
                        variant="tertiary"
                        size="small"
                        onClick={() => handleReject(request.id)}
                        disabled={rejectLoading}
                      />
                    </StyledActionsContainer>
                  </TableCell>
                </TableRow>
              ))}
            </StyledTableRows>
          </Table>
        </StyledTableContainer>
      )}
    </Section>
  );
};
