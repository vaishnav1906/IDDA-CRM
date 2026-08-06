export const STANDARD_ROLE = {
  admin: { universalIdentifier: '20202020-02c2-43f2-b94d-cab1f2b532eb' },
  ceo: { universalIdentifier: 'a1d40001-0000-4000-8000-000000000001' },
  cto: { universalIdentifier: 'a1d40002-0000-4000-8000-000000000002' },
  salesManager: { universalIdentifier: 'a1d40003-0000-4000-8000-000000000003' },
  salesExecutive: { universalIdentifier: 'a1d40004-0000-4000-8000-000000000004' },
  researchTeam: { universalIdentifier: 'a1d40005-0000-4000-8000-000000000005' },
  operations: { universalIdentifier: 'a1d40006-0000-4000-8000-000000000006' },
  hr: { universalIdentifier: 'a1d40007-0000-4000-8000-000000000007' },
  tech: { universalIdentifier: 'a1d40008-0000-4000-8000-000000000008' },
  businessDevelopment: { universalIdentifier: 'a1d40009-0000-4000-8000-000000000009' },
  brandCommunication: { universalIdentifier: 'a1d4000a-0000-4000-8000-00000000000a' },
} as const satisfies Record<string, { universalIdentifier: string }>;
