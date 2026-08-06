export type ImportContactsPreviewCompany = {
  id: string;
  name: string;
  domainName: string;
};

export const IMPORT_CONTACTS_PREVIEW_COMPANIES = [
  { id: 'apollo-hospitals', name: 'Apollo Hospitals', domainName: 'apollohospitals.com' },
  { id: 'fortis', name: 'Fortis Healthcare', domainName: 'fortishealthcare.com' },
  { id: 'max-healthcare', name: 'Max Healthcare', domainName: 'maxhealthcare.in' },
  { id: 'medicover', name: 'Medicover Hospitals', domainName: 'medicoverhospitals.in' },
  { id: 'narayana', name: 'Narayana Health', domainName: 'narayanahealth.org' },
  { id: 'manipal', name: 'Manipal Hospitals', domainName: 'manipalhospitals.com' },
] satisfies ImportContactsPreviewCompany[];
