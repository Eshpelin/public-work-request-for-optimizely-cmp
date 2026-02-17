# Public Work Request for Optimizely CMP

> **This project is incomplete and actively being worked on. It is not an official Optimizely product and is not affiliated with or endorsed by Optimizely. Use at your own risk.**

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
4. The app validates and saves the submission, then creates a Work Request in CMP synchronously
5. The guest sees a success page or the actual CMP error if something goes wrong
6. If the CMP call fails, the submission is saved with FAILED status for automatic retry with exponential backoff

## Features

**Admin Panel**
- Local email/password authentication (no CMP login required for admins)
- CMP credential management with AES-256-GCM encryption at rest
- Form creation wizard with CMP template selection
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
- Synchronous CMP submission so guests see real errors instead of false confirmations
- Exponential backoff retry for failed submissions (1 min, 5 min, 15 min, 1 hr, 4 hr, max 5 attempts)
- Background cron jobs for retry processing and data cleanup
- Health check endpoint for monitoring

## Tech Stack

- **Frontend.** Next.js 16 (App Router), React 19, shadcn/ui (Radix UI), Tailwind CSS v4
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

### Docker Deployment (localhost)

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

### Deploying to Your Own Domain

The application is a standard Docker image that can run anywhere containers are supported. The key requirement is setting `APP_URL` to your public domain so that generated form URLs point to the right place.

**With a VPS or dedicated server (e.g. AWS EC2, DigitalOcean, Hetzner)**

1. Set up a server with Docker installed.

2. Clone the repository and create your `.env` file.

```bash
APP_URL=https://forms.yourdomain.com
DATABASE_URL=postgresql://user:pass@db:5432/public_work_request?schema=public
ENCRYPTION_KEY=<generate with the command above>
JWT_SECRET=<generate with the command above>
NODE_ENV=production
```

3. Update `docker-compose.yml` to set `APP_URL` to your domain.

```yaml
app:
  environment:
    APP_URL: "https://forms.yourdomain.com"
```

4. Run `docker compose up -d` to start the application on port 3000.

5. Put a reverse proxy (Nginx, Caddy, or Traefik) in front of port 3000 to handle TLS/SSL. A minimal Caddy example.

```
forms.yourdomain.com {
    reverse_proxy localhost:3000
}
```

Caddy handles Let's Encrypt certificates automatically. With Nginx, use certbot or similar.

6. Point your DNS A record for `forms.yourdomain.com` to the server IP.

7. Visit `https://forms.yourdomain.com/register` to create the first admin.

**With a managed container platform (e.g. Railway, Render, Fly.io)**

1. Create a PostgreSQL database on the platform.

2. Deploy the app using the included `Dockerfile`. Set the environment variables in the platform dashboard. Make sure `APP_URL` matches the URL the platform assigns (or your custom domain).

3. Run database migrations. Most platforms let you set a release command.

```bash
npx prisma migrate deploy
```

4. The app listens on port 3000 by default. Set the `PORT` environment variable if the platform requires a different port.

**Important notes for production**

- `APP_URL` must match the public URL exactly (including `https://`). This is used to generate shareable form links.
- Use a strong, unique `ENCRYPTION_KEY` and `JWT_SECRET`. Never reuse these across environments.
- The bundled `docker-compose.yml` uses default PostgreSQL credentials (`postgres/postgres`). Change these for production.
- The application runs background cron jobs (retry failed submissions every 2 minutes, cleanup daily at 3 AM) inside the same process. No separate worker is needed.
- If using an external PostgreSQL database, remove the `db` and `migrations` services from `docker-compose.yml` and run `npx prisma migrate deploy` manually or as a release command.

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
3. Go to **Forms** and click **Create Form**. Select a CMP template, configure the title and access type.
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
      v1/cmp/                  CMP proxy (templates)
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
- `GET /api/v1/cmp/templates` for CMP template proxy

**Public routes** (rate limited, no authentication).
- `GET /api/v1/public/forms/[token]` fetches the form configuration (30 req/min/IP)
- `POST /api/v1/public/submissions` submits form data (5 req/min/IP)

**Internal routes** (authenticated via server secret).
- `POST /api/v1/internal/retry-submissions`
- `POST /api/v1/internal/cleanup`
- `GET /api/health`

## CMP API Field Serialization

Each CMP form field type has a specific serialization format for the `POST /v3/work-requests` endpoint.

| Field Type | `values` Format |
|------------|----------------|
| `text`, `text_area` | `["plain string"]` |
| `brief`, `richtext` | `[{"type": "text_brief", "value": "<html>"}]` |
| `dropdown`, `label`, `radio_button` | `["choice_id"]` (single) or `["id1", "id2"]` (multi) |
| `checkbox` | `["choice_id_1", "choice_id_2"]` |
| `date` | `["2026-02-18T00:00:00Z"]` (ISO with timezone) |
| `percentage_number`, `currency_number` | `["42"]` (string, not number) |
| `file`, `instruction`, `section` | Skipped (not serialized) |

File uploads use the CMP 3-step presigned URL flow.

1. `GET /v3/upload-url` to obtain a presigned S3 URL and upload meta fields
2. `POST` the file to the presigned URL as `multipart/form-data` with meta fields before the file
3. `POST` JSON `{"key": "...", "name": "filename.ext"}` to `/v3/work-requests/{id}/attachments`

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
