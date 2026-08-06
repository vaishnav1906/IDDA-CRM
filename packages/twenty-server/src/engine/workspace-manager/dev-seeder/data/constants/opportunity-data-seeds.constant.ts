import { isDefined } from 'twenty-shared/utils';

import { COMPANY_DATA_SEED_IDS } from 'src/engine/workspace-manager/dev-seeder/data/constants/company-data-seeds.constant';
import { PERSON_DATA_SEED_IDS } from 'src/engine/workspace-manager/dev-seeder/data/constants/person-data-seeds.constant';
import {
  WORKSPACE_MEMBER_DATA_SEED_IDS,
  WORKSPACE_MEMBER_DATA_SEEDS,
} from 'src/engine/workspace-manager/dev-seeder/data/constants/workspace-member-data-seeds.constant';

type OpportunityDataSeed = {
  id: string;
  name: string;
  amountAmountMicros: number;
  amountCurrencyCode: string;
  closeDate: Date;
  stage: string;
  position: number;
  pointOfContactId: string;
  companyId: string;
  ownerId: string;
  createdBySource: string;
  createdByWorkspaceMemberId: string;
  createdByName: string;
  updatedBySource: string;
  updatedByWorkspaceMemberId: string;
  updatedByName: string;
};

export const OPPORTUNITY_DATA_SEED_COLUMNS: (keyof OpportunityDataSeed)[] = [
  'id',
  'name',
  'amountAmountMicros',
  'amountCurrencyCode',
  'closeDate',
  'stage',
  'position',
  'pointOfContactId',
  'companyId',
  'ownerId',
  'createdBySource',
  'createdByWorkspaceMemberId',
  'createdByName',
  'updatedBySource',
  'updatedByWorkspaceMemberId',
  'updatedByName',
];

const OPPORTUNITY_DATA_SEED_COUNT = 150;

const GENERATE_OPPORTUNITY_IDS = (): Record<string, string> => {
  const OPPORTUNITY_IDS: Record<string, string> = {};

  for (let INDEX = 1; INDEX <= OPPORTUNITY_DATA_SEED_COUNT; INDEX++) {
    const HEX_INDEX = INDEX.toString(16).padStart(4, '0');

    OPPORTUNITY_IDS[`ID_${INDEX}`] =
      `50505050-${HEX_INDEX}-4e7c-8001-123456789abc`;
  }

  return OPPORTUNITY_IDS;
};

export const OPPORTUNITY_DATA_SEED_IDS = GENERATE_OPPORTUNITY_IDS();

// Medical device and healthcare sales opportunities for Indian clinics
const OPPORTUNITY_TEMPLATES = [
  { name: 'Cardiac Monitor Procurement', amount: 2800000, stage: 'PROPOSAL' },
  { name: 'MRI Machine Evaluation', amount: 45000000, stage: 'MEETING' },
  { name: 'Surgical Robot Demo', amount: 35000000, stage: 'SCREENING' },
  { name: 'ECG System Upgrade', amount: 1200000, stage: 'NEW' },
  { name: 'Ultrasound Fleet Renewal', amount: 8500000, stage: 'PROPOSAL' },
  { name: 'ICU Ventilator Package', amount: 6200000, stage: 'MEETING' },
  { name: 'Digital X-Ray Installation', amount: 3400000, stage: 'CUSTOMER' },
  { name: 'Patient Monitoring System', amount: 5100000, stage: 'PROPOSAL' },
  { name: 'Laparoscopy Tower Setup', amount: 4200000, stage: 'MEETING' },
  { name: 'Defibrillator Replacement', amount: 1800000, stage: 'NEW' },
  { name: 'Ophthalmology Equipment', amount: 2600000, stage: 'SCREENING' },
  { name: 'CT Scanner Maintenance Contract', amount: 1500000, stage: 'CUSTOMER' },
  { name: 'Blood Analyser Upgrade', amount: 3800000, stage: 'PROPOSAL' },
  { name: 'Physiotherapy Equipment Set', amount: 950000, stage: 'MEETING' },
  { name: 'OT Table Modernisation', amount: 2100000, stage: 'NEW' },
  { name: 'Dental Chair Package', amount: 780000, stage: 'CUSTOMER' },
  { name: 'Endoscopy Suite Expansion', amount: 7300000, stage: 'PROPOSAL' },
  { name: 'Radiation Therapy Planning', amount: 22000000, stage: 'SCREENING' },
  { name: 'NICU Equipment Bundle', amount: 9600000, stage: 'MEETING' },
  { name: 'EMR Software Integration', amount: 4500000, stage: 'NEW' },
  { name: 'Ambulance Fleet Upgrade', amount: 12000000, stage: 'PROPOSAL' },
  { name: 'Sterilisation Unit Replacement', amount: 2300000, stage: 'CUSTOMER' },
  { name: 'Dialysis Machine Procurement', amount: 6800000, stage: 'MEETING' },
  { name: 'Anaesthesia Workstation', amount: 3200000, stage: 'SCREENING' },
  { name: 'Infusion Pump Network', amount: 2700000, stage: 'PROPOSAL' },
  { name: 'Pulse Oximeter Bulk Order', amount: 480000, stage: 'NEW' },
  { name: 'Digital Pathology System', amount: 8900000, stage: 'MEETING' },
  { name: 'Foetal Monitor Upgrade', amount: 1600000, stage: 'CUSTOMER' },
  { name: 'Telemedicine Platform Setup', amount: 3100000, stage: 'PROPOSAL' },
  { name: 'Hospital Bed Modernisation', amount: 5400000, stage: 'SCREENING' },
  { name: 'Glucometer Fleet Renewal', amount: 340000, stage: 'NEW' },
  { name: 'Robotic Dispensing System', amount: 11000000, stage: 'MEETING' },
  { name: 'Cath Lab Equipment', amount: 28000000, stage: 'PROPOSAL' },
  { name: 'Surgical Light Tower Set', amount: 1900000, stage: 'CUSTOMER' },
  { name: 'PET-CT Scanner Procurement', amount: 65000000, stage: 'SCREENING' },
  { name: 'EEG Monitoring System', amount: 2400000, stage: 'MEETING' },
  { name: 'Oxygen Plant Installation', amount: 7600000, stage: 'NEW' },
  { name: 'CSSD Equipment Package', amount: 4100000, stage: 'PROPOSAL' },
  { name: 'Pharmacy Automation System', amount: 8200000, stage: 'CUSTOMER' },
  { name: 'Neonatal Warmer Procurement', amount: 1100000, stage: 'MEETING' },
  { name: 'Biomicroscopy Suite', amount: 3600000, stage: 'SCREENING' },
  { name: 'Audiometry Equipment', amount: 680000, stage: 'NEW' },
  { name: 'Laparoscopy Training Set', amount: 2900000, stage: 'PROPOSAL' },
  { name: 'Radiation Safety Equipment', amount: 1350000, stage: 'CUSTOMER' },
  { name: 'Pressure Ulcer Prevention System', amount: 760000, stage: 'MEETING' },
  { name: 'CPAP Machine Bundle', amount: 920000, stage: 'NEW' },
  { name: 'Gamma Camera Procurement', amount: 18000000, stage: 'PROPOSAL' },
  { name: 'Thermal Scanner Array', amount: 580000, stage: 'SCREENING' },
  { name: 'Surgical Microscope', amount: 4700000, stage: 'MEETING' },
  { name: 'Hospital HVAC Upgrade', amount: 9300000, stage: 'CUSTOMER' },
];

const GENERATE_OPPORTUNITY_SEEDS = (): OpportunityDataSeed[] => {
  const OPPORTUNITY_SEEDS: OpportunityDataSeed[] = [];

  for (let INDEX = 1; INDEX <= OPPORTUNITY_DATA_SEED_COUNT; INDEX++) {
    const TEMPLATE_INDEX = (INDEX - 1) % OPPORTUNITY_TEMPLATES.length;
    const TEMPLATE = OPPORTUNITY_TEMPLATES[TEMPLATE_INDEX];

    const DAYS_AHEAD = Math.floor(Math.random() * 90) + 1;
    const CLOSE_DATE = new Date();

    CLOSE_DATE.setDate(CLOSE_DATE.getDate() + DAYS_AHEAD);

    const workspaceMemberId = Object.values(WORKSPACE_MEMBER_DATA_SEED_IDS)[
      INDEX % 4
    ];
    const workspaceMember = WORKSPACE_MEMBER_DATA_SEEDS.find(
      (workspaceMember) => workspaceMember.id === workspaceMemberId,
    );
    const workspaceMemberName = isDefined(workspaceMember)
      ? `${workspaceMember?.nameFirstName} ${workspaceMember?.nameLastName}`
      : 'Unkonwn';

    const rawSeed: OpportunityDataSeed = {
      id: OPPORTUNITY_DATA_SEED_IDS[`ID_${INDEX}`],
      name: TEMPLATE.name,
      amountAmountMicros: TEMPLATE.amount * 1000000,
      amountCurrencyCode: 'INR',
      closeDate: CLOSE_DATE,
      stage: TEMPLATE.stage,
      position: INDEX,
      pointOfContactId:
        PERSON_DATA_SEED_IDS[
          `ID_${INDEX}` as keyof typeof PERSON_DATA_SEED_IDS
        ] || PERSON_DATA_SEED_IDS.ID_1,
      companyId:
        COMPANY_DATA_SEED_IDS[
          `ID_${Math.ceil(INDEX / 2)}` as keyof typeof COMPANY_DATA_SEED_IDS
        ] || COMPANY_DATA_SEED_IDS.ID_1,
      ownerId: WORKSPACE_MEMBER_DATA_SEED_IDS.TIM,
      createdBySource: 'MANUAL',
      updatedBySource: 'MANUAL',
      createdByWorkspaceMemberId: workspaceMemberId,
      createdByName: workspaceMemberName,
      updatedByWorkspaceMemberId: workspaceMemberId,
      updatedByName: workspaceMemberName,
    };

    const opportunityDataSeedWithSQLColumnOrder: OpportunityDataSeed =
      Object.fromEntries(
        OPPORTUNITY_DATA_SEED_COLUMNS.map((column) => [
          column,
          rawSeed[column as keyof OpportunityDataSeed],
        ]),
      ) as OpportunityDataSeed;

    OPPORTUNITY_SEEDS.push(opportunityDataSeedWithSQLColumnOrder);
  }

  return OPPORTUNITY_SEEDS;
};

export const OPPORTUNITY_DATA_SEEDS = GENERATE_OPPORTUNITY_SEEDS();
