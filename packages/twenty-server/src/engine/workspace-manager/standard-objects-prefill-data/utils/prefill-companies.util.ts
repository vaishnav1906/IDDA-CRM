import { type EntityManager } from 'typeorm';

export const prefillCompanies = async (
  _entityManager: EntityManager,
  _schemaName: string,
): Promise<void> => {
  // No demo companies seeded for IDDA CRM production workspaces.
  // Add clinics via the CRM after workspace activation.
};
