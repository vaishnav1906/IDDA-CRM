import { t } from '@lingui/core/macro';

export const getStandardApplicationDescription =
  (): string => t`The base data model every IDDA CRM workspace runs on.

#### What "foundation" means

Every IDDA CRM workspace starts with this set of objects. They define the shape of your CRM, including relationships, activity, and reporting. Everything else, including custom apps, AI agents, and custom objects, plugs into them.

#### Included objects
- **Clinics & Doctors**: your accounts and contacts
- **Leads**: your sales pipeline
- **Notes & Tasks**: activity and follow-ups
- **Workflows & Dashboards**: automation and reporting

Remove this app and the rest of IDDA CRM has nothing to hang off.`;
