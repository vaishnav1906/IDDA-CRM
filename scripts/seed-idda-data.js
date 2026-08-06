/**
 * IDDA CRM Direct Database Seeder
 * Seeds workspace members, sample IDDA data, and creates the two IDDA users.
 * Run with: node scripts/seed-idda-data.js
 */

const { Client } = require('/Users/vaishnav19naik/Developer/idda-crm/node_modules/pg');
const { createClient } = require('/Users/vaishnav19naik/Developer/idda-crm/node_modules/redis');

const DB_URL = 'postgres://postgres:postgres@localhost:5432/default';
const REDIS_URL = 'redis://localhost:6379';
const WORKSPACE_ID = '20202020-1c25-4d02-bf25-6aeccf7ea419';
const SCHEMA = 'workspace_1wgvd1injqtife6y4rvfbu3h5';

// User IDs for cache invalidation
const CHANDNI_USER_ID_FOR_CACHE = 'add10001-0000-4000-8000-000000000001';
const JLAKHANI_USER_ID_FOR_CACHE = 'add10001-0000-4000-8000-000000000002';
const CHANDNI_UW_ID_FOR_CACHE = 'add10002-0000-4000-8000-000000000001';
const JLAKHANI_UW_ID_FOR_CACHE = 'add10002-0000-4000-8000-000000000002';

// ── Pre-hashed passwords (bcrypt, cost 10) ──────────────────────────────────
const CHANDNI_HASH = '$2b$10$hUt/ESLnFO1e.J9/CCAILuX3VCzd6hGMAb2TZDp9BFSm1AtHh95Cu'; // IDDA@123
const JLAKHANI_HASH = '$2b$10$yaB9zmd01EcAvXxnW8sGt.y5kSu1PV1JF5ZrUzaQ/n0vR80Ch832.'; // IDDATech@123

// ── Stable UUIDs for the two new users ──────────────────────────────────────
const CHANDNI_USER_ID = 'add10001-0000-4000-8000-000000000001';
const JLAKHANI_USER_ID = 'add10001-0000-4000-8000-000000000002';
const CHANDNI_USER_WORKSPACE_ID = 'add10002-0000-4000-8000-000000000001';
const JLAKHANI_USER_WORKSPACE_ID = 'add10002-0000-4000-8000-000000000002';
const CHANDNI_WORKSPACE_MEMBER_ID = 'add10003-0000-4000-8000-000000000001';
const JLAKHANI_WORKSPACE_MEMBER_ID = 'add10003-0000-4000-8000-000000000002';

// ── Existing seed IDs ────────────────────────────────────────────────────────
const WORKSPACE_MEMBER_IDS = {
  TIM:   '20202020-0687-4c41-b707-ed1bfca972a7',
  JONY:  '20202020-77d5-4cb6-b60a-f4a835a85d61',
  PHIL:  '20202020-1553-45c6-a028-5a9064cce07f',
  JANE:  '20202020-463f-435b-828c-107e007a2711',
  SCOTT: '20202020-1111-4a01-8001-000000000003',
};

const USER_IDS = {
  TIM:   '20202020-9e3b-46d4-a556-88b9ddc2b034',
  JONY:  '20202020-3957-4908-9c36-2929a23f8357',
  PHIL:  '20202020-7169-42cf-bc47-1cfef15264b8',
  JANE:  '20202020-e6b5-4680-8a32-b8209737156b',
  SCOTT: '20202020-1111-4a01-8001-000000000001',
};

const USER_WORKSPACE_IDS = {
  TIM:   '20202020-9e3b-46d4-a556-88b9ddc2b035',
  JONY:  '20202020-3957-4908-9c36-2929a23f8353',
  PHIL:  '20202020-7169-42cf-bc47-1cfef15264b1',
  JANE:  '20202020-1e7c-43d9-a5db-685b5069d816',
  SCOTT: '20202020-1111-4a01-8001-000000000002',
};

// Role IDs are fetched dynamically at runtime (they change per DB reset)

// ── Sample clinic IDs (first 20 from COMPANY_DATA_SEED_IDS) ─────────────────
const CLINIC_IDS = [
  '20202020-a305-41e7-8c72-ba44072a4c58',
  '20202020-a225-4b3d-a89c-7f6c30df998a',
  '20202020-a8b0-422c-8fcf-5b7496f94975',
  '20202020-aaf7-41d6-87a9-7add07bebfd8',
  '20202020-a19d-422b-9cb2-5f8382a56877',
  '20202020-a39c-4644-867d-e8e1851b3ee8',
  '20202020-a0eb-4c51-aa03-c4cd2423d7cb',
  '20202020-a9b5-48ec-97c0-dbbfcbe8df1b',
  '20202020-a89d-44f9-ac9c-25e462460cb0',
  '20202020-a377-4693-a2d9-89dc9188a1dc',
];

const CLINICS = [
  { id: CLINIC_IDS[0], name: 'Apollo Mumbai Hospitals', city: 'Mumbai', domain: 'https://apollohospitals.mumbai.in' },
  { id: CLINIC_IDS[1], name: 'Fortis Delhi Clinics', city: 'Delhi', domain: 'https://fortishealthcare.delhi.in' },
  { id: CLINIC_IDS[2], name: 'Max Bengaluru Medical Centre', city: 'Bengaluru', domain: 'https://maxhealthcare.bengaluru.in' },
  { id: CLINIC_IDS[3], name: 'Manipal Hyderabad Hospitals', city: 'Hyderabad', domain: 'https://manipalhospitals.hyderabad.in' },
  { id: CLINIC_IDS[4], name: 'Aster Chennai Clinics', city: 'Chennai', domain: 'https://asterhospitals.chennai.in' },
  { id: CLINIC_IDS[5], name: 'Narayana Pune Healthcare', city: 'Pune', domain: 'https://narayanahealthcare.pune.in' },
  { id: CLINIC_IDS[6], name: 'Columbia Asia Kolkata Hospitals', city: 'Kolkata', domain: 'https://columbiaasia.kolkata.in' },
  { id: CLINIC_IDS[7], name: 'Medanta Ahmedabad Super Specialty', city: 'Ahmedabad', domain: 'https://medanta.ahmedabad.in' },
  { id: CLINIC_IDS[8], name: 'Yashoda Jaipur Medical Centre', city: 'Jaipur', domain: 'https://yashodahospitals.jaipur.in' },
  { id: CLINIC_IDS[9], name: 'Kokilaben Lucknow Diagnostics', city: 'Lucknow', domain: 'https://kokilabenhospital.lucknow.in' },
];

// ── Sample doctor IDs ────────────────────────────────────────────────────────
const DOCTOR_IDS = [
  '20202020-b305-41e7-8c72-ba44072a4c58',
  '20202020-b225-4b3d-a89c-7f6c30df998a',
  '20202020-b8b0-422c-8fcf-5b7496f94975',
  '20202020-baf7-41d6-87a9-7add07bebfd8',
  '20202020-b19d-422b-9cb2-5f8382a56877',
  '20202020-b39c-4644-867d-e8e1851b3ee8',
  '20202020-b0eb-4c51-aa03-c4cd2423d7cb',
  '20202020-b9b5-48ec-97c0-dbbfcbe8df1b',
  '20202020-b89d-44f9-ac9c-25e462460cb0',
  '20202020-b377-4693-a2d9-89dc9188a1dc',
];

const DOCTORS = [
  { id: DOCTOR_IDS[0], first: 'Amit', last: 'Sharma', job: 'Cardiologist', clinic: CLINIC_IDS[0], email: 'dr.amit.sharma@apollomumbai.in', phone: '9800000001' },
  { id: DOCTOR_IDS[1], first: 'Priya', last: 'Patel', job: 'Neurologist', clinic: CLINIC_IDS[1], email: 'dr.priya.patel@fortisdelhi.in', phone: '9800000002' },
  { id: DOCTOR_IDS[2], first: 'Rajesh', last: 'Kumar', job: 'Orthopedic Surgeon', clinic: CLINIC_IDS[2], email: 'dr.rajesh.kumar@maxbengaluru.in', phone: '9800000003' },
  { id: DOCTOR_IDS[3], first: 'Sunita', last: 'Singh', job: 'Pediatrician', clinic: CLINIC_IDS[3], email: 'dr.sunita.singh@manipalhyd.in', phone: '9800000004' },
  { id: DOCTOR_IDS[4], first: 'Vikram', last: 'Reddy', job: 'Oncologist', clinic: CLINIC_IDS[4], email: 'dr.vikram.reddy@asterchennai.in', phone: '9800000005' },
  { id: DOCTOR_IDS[5], first: 'Deepa', last: 'Nair', job: 'Gynecologist', clinic: CLINIC_IDS[5], email: 'dr.deepa.nair@narayanapune.in', phone: '9800000006' },
  { id: DOCTOR_IDS[6], first: 'Sanjay', last: 'Iyer', job: 'Gastroenterologist', clinic: CLINIC_IDS[6], email: 'dr.sanjay.iyer@columbiakolkata.in', phone: '9800000007' },
  { id: DOCTOR_IDS[7], first: 'Pooja', last: 'Gupta', job: 'Dermatologist', clinic: CLINIC_IDS[7], email: 'dr.pooja.gupta@medantaahmedabad.in', phone: '9800000008' },
  { id: DOCTOR_IDS[8], first: 'Arjun', last: 'Verma', job: 'Endocrinologist', clinic: CLINIC_IDS[8], email: 'dr.arjun.verma@yashodajaipur.in', phone: '9800000009' },
  { id: DOCTOR_IDS[9], first: 'Kavya', last: 'Mehta', job: 'Pulmonologist', clinic: CLINIC_IDS[9], email: 'dr.kavya.mehta@kokilabenlucknow.in', phone: '9800000010' },
];

// ── Sample opportunity IDs ───────────────────────────────────────────────────
const OPP_IDS = [
  '50505050-0001-4e7c-8001-123456789abc',
  '50505050-0002-4e7c-8001-123456789abc',
  '50505050-0003-4e7c-8001-123456789abc',
  '50505050-0004-4e7c-8001-123456789abc',
  '50505050-0005-4e7c-8001-123456789abc',
];

const OPPORTUNITIES = [
  { id: OPP_IDS[0], name: 'MRI Machine Evaluation', amount: 45000000000000, clinic: CLINIC_IDS[0], doctor: DOCTOR_IDS[0], stage: 'MEETING', close: '2026-09-30' },
  { id: OPP_IDS[1], name: 'Cardiac Monitor Procurement', amount: 2800000000000, clinic: CLINIC_IDS[1], doctor: DOCTOR_IDS[1], stage: 'PROPOSAL', close: '2026-08-31' },
  { id: OPP_IDS[2], name: 'ICU Ventilator Package', amount: 6200000000000, clinic: CLINIC_IDS[2], doctor: DOCTOR_IDS[2], stage: 'NEW', close: '2026-10-15' },
  { id: OPP_IDS[3], name: 'Digital X-Ray Installation', amount: 3400000000000, clinic: CLINIC_IDS[3], doctor: DOCTOR_IDS[3], stage: 'CUSTOMER', close: '2026-07-31' },
  { id: OPP_IDS[4], name: 'Surgical Robot Demo', amount: 35000000000000, clinic: CLINIC_IDS[4], doctor: DOCTOR_IDS[4], stage: 'SCREENING', close: '2026-11-30' },
];

async function run() {
  const client = new Client({ connectionString: DB_URL });
  await client.connect();
  console.log('✓ Connected to database');

  try {
    // ── Seed original workspace members ────────────────────────────────────
    console.log('\n── Seeding workspace members...');
    const wmSeeds = [
      { id: WORKSPACE_MEMBER_IDS.TIM,   first: 'Tim',   last: 'Apple',    email: 'tim@apple.dev',             userId: USER_IDS.TIM,   color: 'SYSTEM', locale: 'en' },
      { id: WORKSPACE_MEMBER_IDS.JONY,  first: 'Jony',  last: 'Ive',      email: 'jony.ive@apple.dev',        userId: USER_IDS.JONY,  color: 'SYSTEM', locale: 'en' },
      { id: WORKSPACE_MEMBER_IDS.PHIL,  first: 'Phil',  last: 'Schiler',  email: 'phil.schiler@apple.dev',    userId: USER_IDS.PHIL,  color: 'SYSTEM', locale: 'en' },
      { id: WORKSPACE_MEMBER_IDS.JANE,  first: 'Jane',  last: 'Austen',   email: 'jane.austen@apple.dev',     userId: USER_IDS.JANE,  color: 'SYSTEM', locale: 'en' },
      { id: WORKSPACE_MEMBER_IDS.SCOTT, first: 'Scott', last: 'Forstall', email: 'scott.forstall@apple.dev',  userId: USER_IDS.SCOTT, color: 'SYSTEM', locale: 'en' },
    ];

    for (const wm of wmSeeds) {
      await client.query(
        `INSERT INTO "${SCHEMA}"."workspaceMember" (id, "nameFirstName", "nameLastName", "colorScheme", locale, "userEmail", "userId")
         VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT DO NOTHING`,
        [wm.id, wm.first, wm.last, wm.color, wm.locale, wm.email, wm.userId]
      );
    }
    console.log('  ✓ 5 workspace members seeded');

    // ── Seed clinics ────────────────────────────────────────────────────────
    console.log('\n── Seeding clinics...');
    for (let i = 0; i < CLINICS.length; i++) {
      const c2 = CLINICS[i];
      const ownerKey = Object.keys(WORKSPACE_MEMBER_IDS)[i % 4];
      const ownerId = WORKSPACE_MEMBER_IDS[ownerKey];
      await client.query(
        `INSERT INTO "${SCHEMA}".company (id, name, "domainNamePrimaryLinkUrl", "addressAddressCity", "accountOwnerId", "createdBySource", "createdByName", "updatedBySource", "updatedByName", position)
         VALUES ($1, $2, $3, $4, $5, 'MANUAL', 'IDDA CRM', 'MANUAL', 'IDDA CRM', $6) ON CONFLICT DO NOTHING`,
        [c2.id, c2.name, c2.domain, c2.city, ownerId, i + 1]
      );
    }
    console.log(`  ✓ ${CLINICS.length} clinics seeded`);

    // ── Seed doctors ────────────────────────────────────────────────────────
    console.log('\n── Seeding doctors...');
    for (let i = 0; i < DOCTORS.length; i++) {
      const d = DOCTORS[i];
      await client.query(
        `INSERT INTO "${SCHEMA}".person (id, "nameFirstName", "nameLastName", "jobTitle", "companyId", "emailsPrimaryEmail", "phonesPrimaryPhoneNumber", "phonesPrimaryPhoneCountryCode", "phonesPrimaryPhoneCallingCode", "createdBySource", "createdByName", "updatedBySource", "updatedByName", position)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'IN', '+91', 'MANUAL', 'IDDA CRM', 'MANUAL', 'IDDA CRM', $8) ON CONFLICT DO NOTHING`,
        [d.id, d.first, d.last, d.job, d.clinic, d.email, d.phone, i + 1]
      );
    }
    console.log(`  ✓ ${DOCTORS.length} doctors seeded`);

    // ── Seed opportunities ──────────────────────────────────────────────────
    console.log('\n── Seeding opportunities...');
    for (let i = 0; i < OPPORTUNITIES.length; i++) {
      const o = OPPORTUNITIES[i];
      await client.query(
        `INSERT INTO "${SCHEMA}".opportunity (id, name, "amountAmountMicros", "amountCurrencyCode", "closeDate", stage, "companyId", "pointOfContactId", "ownerId", "createdBySource", "createdByName", "updatedBySource", "updatedByName", position)
         VALUES ($1, $2, $3, 'INR', $4, $5, $6, $7, $8, 'MANUAL', 'IDDA CRM', 'MANUAL', 'IDDA CRM', $9) ON CONFLICT DO NOTHING`,
        [o.id, o.name, o.amount, o.close, o.stage, o.clinic, o.doctor, WORKSPACE_MEMBER_IDS.TIM, i + 1]
      );
    }
    console.log(`  ✓ ${OPPORTUNITIES.length} opportunities seeded`);

    // ── Add IDDA users ──────────────────────────────────────────────────────
    console.log('\n── Creating IDDA users...');

    // Chandni
    await client.query(
      `INSERT INTO core.user (id, email, "passwordHash", "firstName", "lastName", "isEmailVerified", "canImpersonate", "canAccessFullAdminPanel", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, 'Chandni', '', true, false, true, now(), now()) ON CONFLICT DO NOTHING`,
      [CHANDNI_USER_ID, 'chandni@iddassurance.com', CHANDNI_HASH]
    );

    await client.query(
      `INSERT INTO core."userWorkspace" (id, "userId", "workspaceId", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, now(), now()) ON CONFLICT DO NOTHING`,
      [CHANDNI_USER_WORKSPACE_ID, CHANDNI_USER_ID, WORKSPACE_ID]
    );

    await client.query(
      `INSERT INTO "${SCHEMA}"."workspaceMember" (id, "nameFirstName", "nameLastName", "colorScheme", locale, "userEmail", "userId", "createdBySource", "createdByName", "updatedBySource", "updatedByName", position)
       VALUES ($1, 'Chandni', '', 'SYSTEM', 'en', 'chandni@iddassurance.com', $2, 'MANUAL', 'IDDA CRM', 'MANUAL', 'IDDA CRM', 6) ON CONFLICT DO NOTHING`,
      [CHANDNI_WORKSPACE_MEMBER_ID, CHANDNI_USER_ID]
    );

    // jlakhani
    await client.query(
      `INSERT INTO core.user (id, email, "passwordHash", "firstName", "lastName", "isEmailVerified", "canImpersonate", "canAccessFullAdminPanel", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, 'J', 'Lakhani', true, false, false, now(), now()) ON CONFLICT DO NOTHING`,
      [JLAKHANI_USER_ID, 'jlakhani.idda@gmail.com', JLAKHANI_HASH]
    );

    await client.query(
      `INSERT INTO core."userWorkspace" (id, "userId", "workspaceId", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, now(), now()) ON CONFLICT DO NOTHING`,
      [JLAKHANI_USER_WORKSPACE_ID, JLAKHANI_USER_ID, WORKSPACE_ID]
    );

    await client.query(
      `INSERT INTO "${SCHEMA}"."workspaceMember" (id, "nameFirstName", "nameLastName", "colorScheme", locale, "userEmail", "userId", "createdBySource", "createdByName", "updatedBySource", "updatedByName", position)
       VALUES ($1, 'J', 'Lakhani', 'SYSTEM', 'en', 'jlakhani.idda@gmail.com', $2, 'MANUAL', 'IDDA CRM', 'MANUAL', 'IDDA CRM', 7) ON CONFLICT DO NOTHING`,
      [JLAKHANI_WORKSPACE_MEMBER_ID, JLAKHANI_USER_ID]
    );

    console.log('  ✓ chandni@iddassurance.com created');
    console.log('  ✓ jlakhani.idda@gmail.com created');

    // ── Assign roles ────────────────────────────────────────────────────────
    console.log('\n── Assigning roles...');
    const { v4 } = require('/Users/vaishnav19naik/Developer/idda-crm/node_modules/uuid');

    // Fetch current role IDs (they change per DB reset)
    const rolesResult = await client.query(
      `SELECT id, label FROM core.role WHERE label IN ('Admin', 'CTO')`
    );
    const ADMIN_ROLE_ID = rolesResult.rows.find(r => r.label === 'Admin')?.id;
    const CTO_ROLE_ID = rolesResult.rows.find(r => r.label === 'CTO')?.id;
    if (!ADMIN_ROLE_ID || !CTO_ROLE_ID) {
      throw new Error('Admin or CTO role not found — run workspace:seed:dev first');
    }

    // Get applicationId for the workspace's CUSTOM application (not the standard Twenty app)
    // roleTargets must belong to the custom workspace application, same as seeded workspace members
    const appResult = await client.query(
      `SELECT id FROM core.application WHERE "workspaceId" = $1 AND "universalIdentifier" != '20202020-64aa-4b6f-b003-9c74b97cee20' LIMIT 1`,
      [WORKSPACE_ID]
    );
    const appId = appResult.rows[0]?.id;

    // Chandni → Admin
    await client.query(
      `INSERT INTO core."roleTarget" (id, "workspaceId", "roleId", "userWorkspaceId", "universalIdentifier", "applicationId", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, now(), now()) ON CONFLICT DO NOTHING`,
      [v4(), WORKSPACE_ID, ADMIN_ROLE_ID, CHANDNI_USER_WORKSPACE_ID, v4(), appId]
    );

    // jlakhani → CTO
    await client.query(
      `INSERT INTO core."roleTarget" (id, "workspaceId", "roleId", "userWorkspaceId", "universalIdentifier", "applicationId", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, now(), now()) ON CONFLICT DO NOTHING`,
      [v4(), WORKSPACE_ID, CTO_ROLE_ID, JLAKHANI_USER_WORKSPACE_ID, v4(), appId]
    );

    console.log('  ✓ Chandni → Admin role');
    console.log('  ✓ jlakhani → CTO role');

    // ── Seed missing IDDA roles ──────────────────────────────────────────────
    console.log('\n── Seeding IDDA company roles (HR, Tech, BD, BrandComm)...');

    // Get the workspace custom application ID
    const appIdResult = await client.query(
      `SELECT id FROM core.application WHERE "workspaceId" = $1 AND "universalIdentifier" != '20202020-64aa-4b6f-b003-9c74b97cee20' LIMIT 1`,
      [WORKSPACE_ID]
    );
    const APP_ID = appIdResult.rows[0]?.id;
    if (!APP_ID) throw new Error('Workspace custom application not found');

    const IDDA_ROLES = [
      {
        label: 'HR',
        description: 'Full access to candidates, hiring pipelines, and people data.',
        icon: 'IconHeartHandshake',
        universalIdentifier: 'a1d40007-0000-4000-8000-000000000007',
        canReadAll: true, canUpdateAll: true, canSoftDeleteAll: true, canDestroyAll: false,
        canUpdateAllSettings: false, canAccessAllTools: true,
      },
      {
        label: 'Tech',
        description: 'Technical and admin support access; no candidate data.',
        icon: 'IconCpu',
        universalIdentifier: 'a1d40008-0000-4000-8000-000000000008',
        canReadAll: true, canUpdateAll: true, canSoftDeleteAll: false, canDestroyAll: false,
        canUpdateAllSettings: false, canAccessAllTools: true,
      },
      {
        label: 'Business Development',
        description: 'Access to leads, clinics, doctors, opportunities, tasks, and notes.',
        icon: 'IconTrendingUp',
        universalIdentifier: 'a1d40009-0000-4000-8000-000000000009',
        canReadAll: true, canUpdateAll: true, canSoftDeleteAll: false, canDestroyAll: false,
        canUpdateAllSettings: false, canAccessAllTools: false,
      },
      {
        label: 'Brand Communication',
        description: 'Campaigns, email, and communication access; leads, clinics, opportunities.',
        icon: 'IconSpeakerphone',
        universalIdentifier: 'a1d4000a-0000-4000-8000-00000000000a',
        canReadAll: true, canUpdateAll: true, canSoftDeleteAll: false, canDestroyAll: false,
        canUpdateAllSettings: false, canAccessAllTools: false,
      },
    ];

    for (const role of IDDA_ROLES) {
      await client.query(
        `INSERT INTO core.role (
          id, label, description, icon,
          "isEditable", "canUpdateAllSettings", "canAccessAllTools",
          "canReadAllObjectRecords", "canUpdateAllObjectRecords",
          "canSoftDeleteAllObjectRecords", "canDestroyAllObjectRecords",
          "canBeAssignedToUsers", "canBeAssignedToAgents", "canBeAssignedToApiKeys",
          "workspaceId", "universalIdentifier", "applicationId"
        ) VALUES (
          gen_random_uuid(), $1, $2, $3,
          true, $4, $5,
          $6, $7, $8, $9,
          true, false, false,
          $10, $11, $12
        ) ON CONFLICT (label, "workspaceId") DO NOTHING`,
        [
          role.label, role.description, role.icon,
          role.canUpdateAllSettings, role.canAccessAllTools,
          role.canReadAll, role.canUpdateAll, role.canSoftDeleteAll, role.canDestroyAll,
          WORKSPACE_ID, role.universalIdentifier, APP_ID
        ]
      );
    }
    console.log('  ✓ HR, Tech, Business Development, Brand Communication roles upserted');

    // ── Set Candidates object permissions ────────────────────────────────────
    console.log('\n── Enforcing Candidates object permissions...');

    // Resolve the candidates objectMetadataId dynamically (survives DB reset)
    const candidatesObjResult = await client.query(
      `SELECT id FROM core."objectMetadata" WHERE "workspaceId" = $1 AND "nameSingular" = 'candidates'`,
      [WORKSPACE_ID]
    );
    const CANDIDATES_OBJECT_ID = candidatesObjResult.rows[0]?.id;
    if (!CANDIDATES_OBJECT_ID) {
      console.warn('  ⚠️  Candidates object not found — skipping permission seeding');
    } else {
      // DENY access for all roles except Admin, CTO, CEO, HR
      await client.query(
        `INSERT INTO core."objectPermission" (
          "roleId", "objectMetadataId",
          "canReadObjectRecords", "canUpdateObjectRecords",
          "canSoftDeleteObjectRecords", "canDestroyObjectRecords",
          "workspaceId", "universalIdentifier", "applicationId"
        )
        SELECT
          r.id,
          $1,
          false, false, false, false,
          $2,
          gen_random_uuid(),
          $3
        FROM core.role r
        WHERE r."workspaceId" = $2
          AND r.label NOT IN ('Admin', 'CTO', 'CEO', 'HR')
        ON CONFLICT ("objectMetadataId", "roleId") DO UPDATE SET
          "canReadObjectRecords"       = false,
          "canUpdateObjectRecords"     = false,
          "canSoftDeleteObjectRecords" = false,
          "canDestroyObjectRecords"    = false,
          "updatedAt"                  = now()`,
        [CANDIDATES_OBJECT_ID, WORKSPACE_ID, APP_ID]
      );
      console.log('  ✓ Candidates: DENY inserted for non-HR/non-Admin/non-CTO/non-CEO roles');
      console.log('  ✓ Candidates: Admin, CTO, CEO, HR retain full access');
    }

    console.log('\n✅ All IDDA seed data inserted successfully!');

  } catch (err) {
    console.error('\n❌ Error:', err.message);
    throw err;
  } finally {
    await client.end();
  }

  // ── Flush stale Redis caches so the backend picks up new users immediately ──
  console.log('\n── Flushing stale Redis caches...');
  const redis = createClient({ url: REDIS_URL });
  try {
    await redis.connect();

    // 1. Flush all workspace-scoped cache keys (role-target, userWorkspaceRoleMap, etc.)
    const workspacePattern = `*${WORKSPACE_ID}*`;
    let cursor = 0;
    const workspaceKeys = [];
    do {
      const reply = await redis.scan(cursor, { MATCH: workspacePattern, COUNT: 100 });
      cursor = reply.cursor;
      workspaceKeys.push(...reply.keys);
    } while (cursor !== 0);

    if (workspaceKeys.length > 0) {
      await redis.del(workspaceKeys);
      console.log(`  ✓ Flushed ${workspaceKeys.length} workspace cache keys`);
    }

    // 2. Flush core-entity caches for the two new users
    const coreEntityKeys = [
      `engine:core-entity:user:${CHANDNI_USER_ID_FOR_CACHE}:data`,
      `engine:core-entity:user:${CHANDNI_USER_ID_FOR_CACHE}:hash`,
      `engine:core-entity:user:${JLAKHANI_USER_ID_FOR_CACHE}:data`,
      `engine:core-entity:user:${JLAKHANI_USER_ID_FOR_CACHE}:hash`,
      `engine:core-entity:user-workspace:${CHANDNI_UW_ID_FOR_CACHE}:data`,
      `engine:core-entity:user-workspace:${CHANDNI_UW_ID_FOR_CACHE}:hash`,
      `engine:core-entity:user-workspace:${JLAKHANI_UW_ID_FOR_CACHE}:data`,
      `engine:core-entity:user-workspace:${JLAKHANI_UW_ID_FOR_CACHE}:hash`,
    ];
    await redis.del(coreEntityKeys);
    console.log('  ✓ Flushed core-entity caches for Chandni and JLakhani');
    console.log('  → Backend will rebuild all caches from DB on next request');
  } catch (redisErr) {
    console.warn('  ⚠️  Redis flush failed (server may rebuild cache on next restart):', redisErr.message);
  } finally {
    await redis.disconnect();
  }
}

run().catch(function(e) {
  console.error(e.message);
  process.exit(1);
});
