# Public Work Request for Optimizely CMP

A self-hosted web application that lets admins expose Optimizely CMP Work Request forms as public URLs. Guests can fill out and submit these forms without needing CMP credentials. Submissions flow through to CMP as real Work Requests.

## Why This Exists

Optimizely CMP Work Requests are only accessible to authenticated CMP users. This application bridges that gap by providing a public-facing form experience that anyone with a link can use, while the backend handles authentication and submission to CMP on their behalf.

## How It Works

```
Guest Browser  -->  Next.js App  -->  Optimizely CMP API
                        |
                   PostgreSQL DB
```

1. An admin logs in, connects their CMP credentials, and creates a public form by selecting a CMP template
2. The app generates a shareable URL (permanent or single-use)
3. A guest opens the URL, fills out the form, and submits
4. The app saves the submission to the database immediately and returns a confirmation
5. In the background, the app creates a Work Request in CMP via the API
6. If the CMP call fails, automatic retries with exponential backoff handle transient errors

## Features

**Admin Panel**
- Local email/password authentication (no CMP login required for admins)
- CMP credential management with AES-256-GCM encryption at rest
- Form creation wizard with template and workflow selection
- Two access modes. permanent open URLs or single-use URLs with optional expiry
- Bulk URL generation (up to 500 per batch)
- Submission monitoring with status tracking

**Public Forms**
- All 14 CMP field types supported. text, textarea, richtext, checkbox, radio button, dropdown, label (tag picker), date, file upload, brief, instruction, section, percentage, and currency
- Conditional logic. jump-to (skip fields) and show-values (filter choices) rules
- Client-side and server-side validation using shared logic
- Honeypot field for basic bot protection
- Rate limiting on public endpoints

**Reliability**
- Fire-and-forget submission pattern. guests get instant confirmation regardless of CMP availability
- Exponential backoff retry (1 min, 5 min, 15 min, 1 hr, 4 hr, max 5 attempts)
- Background cron jobs for retry processing and data cleanup
- Health check endpoint for monitoring

## Tech Stack

- **Frontend.** Next.js 16 (App Router), React 19, HeroUI, Tailwind CSS v4
- **Backend.** Next.js API Routes, Prisma ORM, PostgreSQL 16
- **Security.** bcrypt, JWT (httpOnly cookies), AES-256-GCM, jose
- **Tooling.** Zod validation, Pino logging, node-cron
- **Deployment.** Docker Compose (app + database + migrations)

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL 16 (or use Docker)
- Optimizely CMP account with API credentials (Client ID and Client Secret)

### Local Development

1. Clone the repository and install dependencies.

```bash
git clone <repo-url>
cd public-work-request-for-optimizely-cmp
npm install
```

2. Create your environment file.

```bash
cp .env.example .env
```

3. Generate the required secrets and add them to `.env`.

```bash
# Generate ENCRYPTION_KEY (32 bytes, base64)
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Generate JWT_SECRET
node -e "console.log(require('crypto').randomBytes(64).toString('base64'))"
```

4. Start PostgreSQL and run migrations.

```bash
# Option A. Use Docker for the database only
docker compose up db -d

# Run migrations
npm run db:migrate
```

5. Start the development server.

```bash
npm run dev
```

6. Open `http://localhost:3000/register` to create the first admin account.

### Docker Deployment

1. Create your `.env` file with production values (see above).

2. Launch all services.

```bash
docker compose up -d
```

This starts three containers.
- **db** PostgreSQL 16 with persistent volume
- **migrations** Runs `prisma migrate deploy` and exits
- **app** Next.js application on port 3000

3. Visit `http://localhost:3000/register` to set up the first admin.

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `APP_URL` | Public-facing URL of the application | Yes |
| `ENCRYPTION_KEY` | 32-byte key, base64 encoded, for AES-256-GCM | Yes |
| `JWT_SECRET` | Secret for signing JWT tokens | Yes |
| `NODE_ENV` | `development` or `production` | No (defaults to development) |

## First-Time Setup

After the application is running.

1. Navigate to `/register` and create your admin account. Registration locks after the first account is created.
2. Log in and go to **Settings** to add your CMP API credentials (Client ID and Client Secret from Optimizely).
3. Go to **Forms** and click **Create Form**. Select a CMP template, configure the title and access type, and optionally assign a workflow.
4. Share the generated URL with your intended audience.

## Project Structure

```
prisma/schema.prisma          Database schema (6 models)
server.ts                      Custom server with cron jobs
docker-compose.yml             Docker deployment config
src/
  app/
    (admin)/                   Admin panel pages (dashboard, forms, settings)
    (auth)/                    Login and registration pages
    f/[token]/                 Public form and success pages
    api/
      v1/auth/                 Login, register, logout
      v1/cmp/                  CMP proxy (templates, workflows)
      v1/forms/                Form CRUD, URL generation, submissions
      v1/public/               Public form fetch, submission
      v1/internal/             Retry and cleanup jobs
      v1/settings/             Credential management
    health/                    Health check
  components/public/
    DynamicForm.tsx            Form state management with useReducer
    FieldRenderer.tsx          Field type dispatcher
    useConditionalLogic.ts     Jump-to and show-values logic
    fields/                    14 field type components
  lib/
    cmp-client/                CMP API client with OAuth2 and retry
    db/                        Prisma client singleton
    form-engine/               Validators, serializers, types
    security/                  Encryption, tokens, rate limiting, CSRF, auth
    logging/                   Pino structured logger
    errors/                    Error codes and formatting
  types/                       TypeScript type definitions
```

## Database Models

- **AdminUser** Admin accounts with bcrypt-hashed passwords
- **CmpCredential** Encrypted CMP API credentials (only one active at a time)
- **PublicForm** Form configurations with snapshotted template fields
- **FormUrl** Shareable URL tokens (permanent or single-use with expiry)
- **Submission** Form submissions with status tracking and retry state
- **AuditLog** Action log for compliance and debugging

## Background Jobs

Two cron jobs run inside the application process via `node-cron`.

- **Every 2 minutes.** Retry failed/pending CMP submissions
- **Daily at 3 AM.** Clean up expired URLs (30+ days old) and old audit logs (90+ days old)

## API Overview

**Admin routes** (require JWT authentication).
- `POST /api/v1/auth/login` and `/register` and `/logout`
- `GET/POST /api/v1/forms` and `GET/PATCH/DELETE /api/v1/forms/[formId]`
- `POST /api/v1/forms/[formId]/urls` for generating shareable URLs
- `GET /api/v1/forms/[formId]/submissions` for viewing submissions
- `GET/POST/PATCH /api/v1/settings/credentials` for CMP credentials
- `GET /api/v1/cmp/templates` and `/workflows` for CMP data proxy

**Public routes** (rate limited, no authentication).
- `GET /api/v1/public/forms/[token]` fetches the form configuration (30 req/min/IP)
- `POST /api/v1/public/submissions` submits form data (5 req/min/IP)

**Internal routes** (authenticated via server secret).
- `POST /api/v1/internal/retry-submissions`
- `POST /api/v1/internal/cleanup`
- `GET /api/health`

## Security

- **URL tokens.** 256-bit cryptographically random, base64url encoded
- **Credentials.** Encrypted with AES-256-GCM before storage
- **Passwords.** bcrypt with cost factor 12
- **Sessions.** JWT in httpOnly, Secure, SameSite=Lax cookies (24h expiry)
- **Rate limiting.** In-memory per-IP rate limiting on public endpoints
- **Bot protection.** Honeypot field on public forms
- **Information hiding.** Same 404 response for not-found, expired, and used tokens

## License

Private. Internal use only.
