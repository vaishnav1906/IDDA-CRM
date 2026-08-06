const { Client } = require('/Users/vaishnav19naik/Developer/idda-crm/node_modules/pg');
const { createClient } = require('/Users/vaishnav19naik/Developer/idda-crm/node_modules/redis');
const { v4 } = require('/Users/vaishnav19naik/Developer/idda-crm/node_modules/uuid');

const DB_URL      = 'postgres://postgres:postgres@localhost:5432/default';
const REDIS_URL   = 'redis://localhost:6379';
const WORKSPACE_ID = '20202020-1c25-4d02-bf25-6aeccf7ea419';
const SCHEMA      = 'workspace_1wgvd1injqtife6y4rvfbu3h5';

const USER_ID = 'add10001-0000-4000-8000-000000000003';
const UW_ID   = 'add10002-0000-4000-8000-000000000003';
const WM_ID   = 'add10003-0000-4000-8000-000000000003';
const HASH    = '$2b$10$J4eKAS16oc7PJtkfIKhyZuscb9pcQJgxmupGQCn9ZjzhpgfrjohqW'; // shriaansh@123

async function run() {
  const db = new Client({ connectionString: DB_URL });
  await db.connect();
  console.log('✓ Connected to database');

  await db.query(
    `INSERT INTO core.user (id, email, "passwordHash", "firstName", "lastName", "isEmailVerified", "canImpersonate", "canAccessFullAdminPanel", "createdAt", "updatedAt")
     VALUES ($1, $2, $3, 'Shriaansh', '', true, false, false, now(), now()) ON CONFLICT DO NOTHING`,
    [USER_ID, 'shriaansh.iddassurance@gmail.com', HASH]
  );

  await db.query(
    `INSERT INTO core."userWorkspace" (id, "userId", "workspaceId", "createdAt", "updatedAt")
     VALUES ($1, $2, $3, now(), now()) ON CONFLICT DO NOTHING`,
    [UW_ID, USER_ID, WORKSPACE_ID]
  );

  await db.query(
    `INSERT INTO "${SCHEMA}"."workspaceMember" (id, "nameFirstName", "nameLastName", "colorScheme", locale, "userEmail", "userId", "createdBySource", "createdByName", "updatedBySource", "updatedByName", position)
     VALUES ($1, 'Shriaansh', '', 'SYSTEM', 'en', 'shriaansh.iddassurance@gmail.com', $2, 'MANUAL', 'IDDA CRM', 'MANUAL', 'IDDA CRM', 8) ON CONFLICT DO NOTHING`,
    [WM_ID, USER_ID]
  );

  console.log('✓ Shriaansh user created (shriaansh.iddassurance@gmail.com)');
  await db.end();

  // Flush Redis caches
  console.log('\n── Flushing Redis caches...');
  const redis = createClient({ url: REDIS_URL });
  await redis.connect();

  let cursor = 0;
  const keys = [];
  do {
    const reply = await redis.scan(cursor, { MATCH: `*${WORKSPACE_ID}*`, COUNT: 100 });
    cursor = reply.cursor;
    keys.push(...reply.keys);
  } while (cursor !== 0);
  if (keys.length) {
    await redis.del(keys);
    console.log(`  ✓ Flushed ${keys.length} workspace cache keys`);
  }

  await redis.del([
    `engine:core-entity:user:${USER_ID}:data`,
    `engine:core-entity:user:${USER_ID}:hash`,
    `engine:core-entity:user-workspace:${UW_ID}:data`,
    `engine:core-entity:user-workspace:${UW_ID}:hash`,
  ]);
  console.log('  ✓ Flushed user cache keys');
  await redis.disconnect();
  console.log('\n✅ Done!');
}

run().catch(e => { console.error('❌', e.message); process.exit(1); });
