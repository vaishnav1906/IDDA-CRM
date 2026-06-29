# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is **IDDA CRM** — a branded, customised fork of Twenty (open-source CRM) built for IDDA's medical-sales workflow. It is organised as an Nx monorepo. The working directory for all changes is `/Users/vaishnav19naik/Developer/idda-crm/`; the directory `/Users/vaishnav19naik/Final CRM` is empty and unused.

## Key Commands

### Development
```bash
# Start development environment (frontend + backend + worker)
yarn start

# Individual package development
npx nx start twenty-front     # Start frontend dev server
npx nx start twenty-server    # Start backend server
npx nx run twenty-server:worker  # Start background worker
```

### Testing
```bash
# Run a single test file (PREFERRED — fast, no nx overhead)
node_modules/.bin/jest path/to/test.spec.ts --config=packages/PROJECT/jest.config.mjs --no-coverage

# Run a directory of tests
node_modules/.bin/jest "packages/twenty-server/src/path/to/tests/" --config packages/twenty-server/jest.config.mjs --no-coverage

# Run a pattern
cd packages/twenty-server && npx jest "pattern"

# All tests for a package
npx nx test twenty-front
npx nx test twenty-server
npx nx run twenty-server:test:integration:with-db-reset

# Standard application metadata tests (covers objects/fields/views — run after any metadata change)
node_modules/.bin/jest \
  "packages/twenty-server/src/engine/workspace-manager/twenty-standard-application/utils/__tests__/" \
  --config packages/twenty-server/jest.config.mjs --no-coverage --verbose

# Storybook
npx nx storybook:build twenty-front
npx nx storybook:test twenty-front
```

> **After adding metadata** (new fields, views, view-field-groups): run the standard-application tests above and update the snapshot with `--updateSnapshot` if the test fails due to new IDs being generated. The snapshot shift is expected — verify it by inspecting new entries in the snapshot for the names you added.

### Code Quality
```bash
# Linting (diff with main - fastest, always prefer this)
npx nx lint:diff-with-main twenty-front
npx nx lint:diff-with-main twenty-server
npx nx lint:diff-with-main twenty-front --configuration=fix  # Auto-fix

# Linting (full project - slower, use only when needed)
npx nx lint twenty-front
npx nx lint twenty-server

# Type checking
npx nx typecheck twenty-front
npx nx typecheck twenty-server

# Format code
npx nx fmt twenty-front
npx nx fmt twenty-server
```

### Build
```bash
# Build packages (twenty-shared must be built first)
npx nx build twenty-shared
npx nx build twenty-front
npx nx build twenty-server
```

### Database Operations
```bash
# Database management
npx nx database:reset twenty-server         # Reset database
npx nx run twenty-server:database:init:prod # Initialize database
npx nx run twenty-server:database:migrate:prod # Run instance commands (fast only)

# Generate an instance command (fast or slow)
npx nx run twenty-server:database:migrate:generate --name <name> --type <fast|slow>
```

### Database Inspection (Postgres MCP)

A read-only Postgres MCP server is configured in `.mcp.json`. Use it to:
- Inspect workspace data, metadata, and object definitions while developing
- Verify migration results (columns, types, constraints) after running migrations
- Explore the multi-tenant schema structure (core, metadata, workspace-specific schemas)
- Debug issues by querying raw data to confirm whether a bug is frontend, backend, or data-level
- Inspect metadata tables to debug GraphQL schema generation issues

This server is read-only — for write operations (reset, migrations, sync), use the CLI commands above.

### GraphQL
```bash
# Generate GraphQL types (run after schema changes)
npx nx run twenty-front:graphql:generate
npx nx run twenty-front:graphql:generate --configuration=metadata
```

## Architecture Overview

### Tech Stack
- **Frontend**: React 18, TypeScript, Jotai (state management), Linaria (styling), Vite
- **Backend**: NestJS, TypeORM, PostgreSQL, Redis, GraphQL (with GraphQL Yoga)
- **Monorepo**: Nx workspace managed with Yarn 4

### Package Structure
```
packages/
├── twenty-front/          # React frontend application
├── twenty-server/         # NestJS backend API
├── twenty-ui/             # Shared UI components library
├── twenty-shared/         # Common types and utilities
├── twenty-emails/         # Email templates with React Email
├── twenty-website/    # Next.js marketing website
├── twenty-docs/           # Documentation website
├── twenty-zapier/         # Zapier integration
└── twenty-e2e-testing/    # Playwright E2E tests
```

### Key Development Principles
- **Functional components only** (no class components)
- **Named exports only** (no default exports)
- **Types over interfaces** (except when extending third-party interfaces)
- **String literals over enums** (except for GraphQL enums)
- **No 'any' type allowed** — strict TypeScript enforced
- **Event handlers preferred over useEffect** for state updates
- **Props down, events up** — unidirectional data flow
- **Composition over inheritance**
- **No abbreviations** in variable names (`user` not `u`, `fieldMetadata` not `fm`)

### Naming Conventions
- **Variables/functions**: camelCase
- **Constants**: SCREAMING_SNAKE_CASE
- **Types/Classes**: PascalCase (suffix component props with `Props`, e.g. `ButtonProps`)
- **Files/directories**: kebab-case with descriptive suffixes (`.component.tsx`, `.service.ts`, `.entity.ts`, `.dto.ts`, `.module.ts`)
- **TypeScript generics**: descriptive names (`TData` not `T`)

### File Structure
- Components under 300 lines, services under 500 lines
- Components in their own directories with tests and stories
- Use `index.ts` barrel exports for clean imports
- Import order: external libraries first, then internal (`@/`), then relative

### Comments
- Use short-form comments (`//`), not JSDoc blocks
- Explain WHY (business logic), not WHAT
- Do not comment obvious code
- Multi-line comments use multiple `//` lines, not `/** */`

### State Management
- **Jotai** for global state: atoms for primitive state, selectors for derived state, atom families for dynamic collections
- Component-specific state with React hooks (`useState`, `useReducer` for complex logic)
- GraphQL cache managed by Apollo Client
- Use functional state updates: `setState(prev => prev + 1)`

### Backend Architecture
- **NestJS modules** for feature organization
- **TypeORM** for database ORM with PostgreSQL
- **GraphQL** API with code-first approach
- **Redis** for caching and session management
- **BullMQ** for background job processing

### Database & Upgrade Commands
- **PostgreSQL** as primary database
- **Redis** for caching and sessions
- **ClickHouse** for analytics (when enabled)
- When changing entity files, generate an **instance command** (`database:migrate:generate --name <name> --type <fast|slow>`)
- **Fast** instance commands handle schema changes; **slow** ones add a `runDataMigration` step for data backfills
- **Workspace commands** iterate over all active/suspended workspaces for per-workspace upgrades
- Commands use `@RegisteredInstanceCommand` and `@RegisteredWorkspaceCommand` decorators for automatic discovery
- Include both `up` and `down` logic in instance commands
- Never delete or rewrite committed instance command `up`/`down` logic
- See `packages/twenty-server/docs/UPGRADE_COMMANDS.md` for full documentation

### Utility Helpers
Use existing helpers from `twenty-shared` instead of manual type guards:
- `isDefined()`, `isNonEmptyString()`, `isNonEmptyArray()`

## Development Workflow

IMPORTANT: Use Context7 for code generation, setup or configuration steps, or library/API documentation. Automatically use the Context7 MCP tools to resolve library IDs and get library docs without waiting for explicit requests.

### Before Making Changes
1. Always run linting (`lint:diff-with-main`) and type checking after code changes
2. Test changes with relevant test suites (prefer single-file test runs)
3. Ensure instance commands are generated for entity changes (`database:migrate:generate`)
4. Check that GraphQL schema changes are backward compatible
5. Run `graphql:generate` after any GraphQL schema changes

### Code Style Notes
- Use **Linaria** for styling with zero-runtime CSS-in-JS (styled-components pattern)
- Follow **Nx** workspace conventions for imports
- Use **Lingui** for internationalization
- Apply security first, then formatting (sanitize before format)

### Testing Strategy
- **Test behavior, not implementation** — focus on user perspective
- **Test pyramid**: 70% unit, 20% integration, 10% E2E
- Query by user-visible elements (text, roles, labels) over test IDs
- Use `@testing-library/user-event` for realistic interactions
- Descriptive test names: "should [behavior] when [condition]"
- Clear mocks between tests with `jest.clearAllMocks()`

## Dev Environment Setup

All dev environments (Claude Code web, Cursor, local) use one script:

```bash
bash packages/twenty-utils/setup-dev-env.sh
```

This handles everything: starts Postgres + Redis (auto-detects local services vs Docker), creates databases, copies `.env` files, and initializes the database schema (runs migrations) on a fresh database. Idempotent — safe to run multiple times.

- `--docker` — force Docker mode (uses `packages/twenty-docker/docker-compose.dev.yml`)
- `--down` — stop services
- `--reset` — wipe data and restart fresh
- **Skip the setup script** for tasks that only read code — architecture questions, code review, documentation, etc.

**Note:** CI workflows (GitHub Actions) manage services via Actions service containers and run setup steps individually — they don't use this script.

## Important Files
- `nx.json` — Nx workspace configuration with task definitions
- `tsconfig.base.json` — Base TypeScript configuration
- `package.json` — Root package with workspace definitions
- `.cursor/rules/` — Detailed development guidelines (architecture, code-style, syncable-entity pattern, testing, migrations)
- `packages/twenty-server/docs/UPGRADE_COMMANDS.md` — Full docs for instance/workspace commands

---

## IDDA CRM Customisations (Steps 1–9)

These changes live on top of the upstream Twenty codebase. All are committed in one commit on `main`.

### Domain model

| Twenty name | IDDA name | Notes |
|---|---|---|
| `company` | Clinic | Labels + icons changed; IDDA fields added |
| `person` | Doctor | Labels + icons changed; IDDA fields added |
| `lead` | Lead | New object — MedLeads staging area |
| `subscription` | Subscription | New object — active IDDA customer plans |

### IDDA-specific fields added to standard objects

- **Company (Clinic):** `phones`, `clinicType` (SELECT), `rating`, `reviewCount`, `mapsUrl`, `latitude`, `longitude`, `extractedAt`
- **Person (Doctor):** `specialization` (SELECT), `isPrimaryDoctor` (BOOLEAN), `otherDoctors`
- **Task:** `followUpType` (SELECT), `outcome` (SELECT), `nextFollowUpDate`

### Lead object fields

Raw MedLeads data: `clinicName`, `doctorName`, `specialization`, `otherDoctors`, `phone`, `address`, `town`, `city`, `state`, `category`, `rating`, `reviews`, `website` (LINKS), `mapsUrl` (LINKS), `latitude`, `longitude`, `extractedAt`

CRM qualification: `status` (SELECT: NEW/ASSIGNED/CONTACTED/INTERESTED/CONVERTED/REJECTED/DUPLICATE), `priority` (SELECT: LOW/MEDIUM/HIGH), `source`, `importedAt`

Relations: `clinic` → Company (MANY_TO_ONE), `doctor` → Person (MANY_TO_ONE), `assignedTo` → WorkspaceMember, plus `taskTargets`, `noteTargets`, `attachments`, `timelineActivities` (ONE_TO_MANY)

### Subscription object fields

`name`, `plan` (SELECT: BASIC/STANDARD/GOLD/PLATINUM), `status` (SELECT: ACTIVE/TRIAL/PENDING_RENEWAL/EXPIRED/CANCELLED), `startDate`, `endDate`, `renewalDate`, `billingCycle` (SELECT: MONTHLY/QUARTERLY/ANNUAL), `amount` (CURRENCY), `paymentStatus` (SELECT: PAID/PENDING/OVERDUE/WAIVED)

Relations: `clinic`, `doctor`, `assignedEmployee` → WorkspaceMember (all MANY_TO_ONE)

---

## Metadata Generation Architecture

This is the most complex part of the codebase. Understanding it is required for any object/field/view work.

### How Twenty builds workspace metadata

```
packages/twenty-shared/src/metadata/constants/standard-object.constant.ts
  └── STANDARD_OBJECTS — single source of truth for universalIdentifiers
        (every object, field, view, viewField, viewFieldGroup has a stable UUID here)

packages/twenty-server/src/engine/workspace-manager/twenty-standard-application/utils/
  ├── object-metadata/create-standard-flat-object-metadata.util.ts       — object declarations
  ├── field-metadata/
  │   ├── build-standard-flat-field-metadata-maps.util.ts                — registry (import here)
  │   └── compute-<object>-standard-flat-field-metadata.util.ts          — per-object fields
  ├── view/
  │   ├── build-standard-flat-view-metadata-maps.util.ts                 — registry
  │   └── compute-standard-<object>-views.util.ts                        — TABLE + FIELDS_WIDGET views
  ├── view-field/
  │   ├── build-standard-flat-view-field-metadata-maps.util.ts           — registry
  │   └── compute-standard-<object>-view-fields.util.ts                  — which fields appear in each view
  └── view-field-group/
      ├── build-standard-flat-view-field-group-metadata-maps.util.ts     — registry
      └── compute-standard-<object>-view-field-groups.util.ts            — record-page field groups
```

### Adding a new standard object — checklist

1. **`standard-object.constant.ts`** — Add `universalIdentifier` for the object, every field, every view, every viewField, every viewFieldGroup. These UUIDs must never change after first deploy.
2. **`create-standard-flat-object-metadata.util.ts`** — Declare the object (labels, icon, description).
3. **`compute-<object>-standard-flat-field-metadata.util.ts`** — Declare every field (type, label, icon, options for SELECT fields, relation settings for RELATION fields).
4. **`build-standard-flat-field-metadata-maps.util.ts`** — Import and register the compute function.
5. **Workspace entity** — `packages/twenty-server/src/modules/<object>/standard-objects/<object>.workspace-entity.ts` — TypeScript type mirror (no decorators needed; used for type safety).
6. **View files** (3 files: view, view-field, view-field-group) + register each in the corresponding builder map.
7. **Run metadata tests** — `node_modules/.bin/jest "...twenty-standard-application/utils/__tests__/"` and update snapshot with `--updateSnapshot`.

### Adding a field to an existing object

1. Add `universalIdentifier` in `standard-object.constant.ts` under the object's `fields`.
2. Add the field declaration in `compute-<object>-standard-flat-field-metadata.util.ts`.
3. If the field should appear in a view, add it in `compute-standard-<object>-view-fields.util.ts` and add its `universalIdentifier` under `views.<viewName>.viewFields` in the constant.
4. Run and update snapshot.

### Relation field conventions

```typescript
// MANY_TO_ONE (the FK lives on this object)
createStandardRelationFieldFlatMetadata({
  context: {
    type: FieldMetadataType.RELATION,
    morphId: null,
    fieldName: 'clinic',
    targetObjectName: 'company',
    targetFieldName: 'leads',          // inverse field name on Company
    settings: {
      relationType: RelationType.MANY_TO_ONE,
      onDelete: RelationOnDeleteAction.SET_NULL,
      joinColumnName: 'clinicId',
    },
  },
});

// ONE_TO_MANY (inverse, no FK on this object)
settings: { relationType: RelationType.ONE_TO_MANY }
```

The inverse field (`leads` on Company, `subscriptions` on Company, etc.) must also be declared in the target object's `compute-*-flat-field-metadata` file.

### WorkspaceMember back-relations added for IDDA

`packages/twenty-server/src/engine/workspace-manager/twenty-standard-application/utils/field-metadata/compute-workspace-member-standard-flat-field-metadata.util.ts` — `assignedLeads` (ONE_TO_MANY → Lead) and `managedSubscriptions` (ONE_TO_MANY → Subscription).

---

## Backend Module Pattern

A typical feature module in `packages/twenty-server/src/modules/<feature>/`:

```
<feature>/
├── <feature>.module.ts          — NestJS module (imports, providers, controllers, exports)
├── standard-objects/
│   └── <feature>.workspace-entity.ts   — workspace entity type
├── services/
│   └── <feature>.service.ts
├── controllers/
│   └── <feature>.controller.ts
└── dtos/
    └── <feature>.dto.ts
```

NestJS controllers use `@Controller()`, `@Post()`, etc. Guards used widely:
- `WorkspaceAuthGuard` — requires a valid workspace JWT
- `PublicEndpointGuard + NoPermissionGuard` — unauthenticated public routes

Exception pattern:
```typescript
// 1. Exception code enum
export enum MyFeatureExceptionCode { THING_NOT_FOUND = 'THING_NOT_FOUND' }
// 2. Exception class extending BaseException
export class MyFeatureException extends BaseException { ... }
// 3. API exception filter extending BaseExceptionFilter
// 4. @UseFilters(MyFeatureApiExceptionFilter) on the controller
```

### TwentyORM (workspace data access)

Standard TypeORM repositories are **not** used for workspace data. Use `TwentyORM`:

```typescript
// In a service constructor:
@InjectWorkspaceRepository(LeadWorkspaceEntity)
private readonly leadRepository: WorkspaceRepository<LeadWorkspaceEntity>,

// Then:
await this.leadRepository.find({ where: { workspaceId } });
await this.leadRepository.save(entity);
```

`WorkspaceRepository` behaves like a TypeORM repository but routes queries to the correct per-workspace PostgreSQL schema.

### Syncable entity pattern (for metadata entities)

When creating a new syncable entity (e.g., a new metadata concept like a skill, role, or agent), follow the 6-step process documented in `.cursor/rules/creating-syncable-entity.mdc`:

1. Types & constants (TypeORM entity + flat entity types + register in 5 central constants)
2. Cache & transform (cache service + DTO → universal flat entity conversion)
3. Builder & validation (validator that never throws, builder wired into orchestrator)
4. Runner & actions (create/update/delete action handlers)
5. Integration (register in 3 NestJS modules)
6. Integration tests (mandatory)

This is a separate, more complex flow from the standard object / workspace entity pattern above.
