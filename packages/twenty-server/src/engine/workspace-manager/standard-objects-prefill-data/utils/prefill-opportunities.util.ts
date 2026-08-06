import { type EntityManager } from 'typeorm';

export const prefillOpportunities = async (
  _entityManager: EntityManager,
  _schemaName: string,
): Promise<void> => {
  // No demo opportunities seeded for IDDA CRM production workspaces.
};
