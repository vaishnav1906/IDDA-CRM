import { type EntityManager } from 'typeorm';

export const prefillPeople = async (
  _entityManager: EntityManager,
  _schemaName: string,
): Promise<void> => {
  // No demo people seeded for IDDA CRM production workspaces.
  // Add doctors via the CRM after workspace activation.
};
