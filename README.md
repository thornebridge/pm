# PM — Project Management & CRM

A lightweight, self-hosted project management platform with CRM, double-entry financials, automation engine, and Telnyx telephony integration. Built with SvelteKit and SQLite for zero-dependency deployments.

## Features

### Project Management
- **Kanban boards** — Drag-and-drop task management with customizable columns
- **Sprints** — Sprint planning with burndown charts and velocity tracking
- **Task management** — Types (task, bug, feature, improvement), priorities, labels, checklists, time tracking
- **Multiple views** — Board, list, calendar, Gantt, and home views with saved view presets
- **Task templates** — Reusable templates for common task types
- **Comments & reactions** — Threaded discussions with emoji reactions
- **File attachments** — Attach files to tasks

### CRM (Sales)
- **Companies & contacts** — Full contact management with ownership and source tracking
- **Pipeline** — Drag-and-drop opportunity pipeline with customizable stages and probabilities
- **Activities** — Call, email, meeting, and note tracking with history
- **Products & pricing** — Product catalog with flexible pricing tiers (one-time, recurring, per-unit, tiered)
- **Proposals** — Generate and send proposals with line items and discount logic
- **CRM tasks** — Sales-specific task management

### Telephony (Telnyx Integration)
- **One-click calling** — Click any phone number in the CRM to dial via browser WebRTC
- **Inbound calls** — Receive calls in the browser with automatic caller lookup against CRM contacts
- **Call recording** — Optional call recording with in-app playback
- **Auto call logging** — Completed calls automatically create CRM activities with duration
- **Multi-number rotation** — Configure multiple caller IDs that rotate round-robin per call
- **Floating dialer** — Persistent dialer widget with keypad, mute, and call controls
- **Admin toggle** — Enable/disable from Admin > Telephony with API key configuration

### Financials
- **Double-entry bookkeeping** — Chart of accounts, journal entries, posting
- **Bank reconciliation** — Match transactions against bank statements
- **Recurring transactions** — Automated recurring journal entries
- **Budget management** — Per-account budgets with period tracking
- **Financial reports** — Balance sheet, P&L, cash flow, trial balance
- **CRM sync** — Automatic revenue recognition when opportunities are won

### Automation & Collaboration
- **Automation engine** — Rules with triggers (task created, status changed, assigned, etc.), conditions, and actions
- **Webhooks** — Outbound webhooks for task and comment events
- **Real-time collaboration** — WebSocket-powered live updates across all connected clients
- **Push notifications** — Browser push for assignments, comments, mentions, and due dates
- **Email notifications** — Via Resend with digest mode (immediate, daily, weekly)
- **Themes** — Built-in themes and custom theme import (dark/light modes)

### Administration
- **Invite-only auth** — Admin-controlled registration via invite tokens
- **Role-based access** — Admin and member roles
- **Audit log** — Track all task actions by user, project, and action type
- **Backup/restore** — Download full SQLite database backups
- **Keyboard shortcuts** — Full keyboard navigation with customizable shortcuts

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | SvelteKit 2 |
| Language | TypeScript |
| Frontend | Svelte 5 (runes) |
| Database | PostgreSQL 17 |
| ORM | Drizzle ORM |
| Cache/Pub-Sub | Redis 7 (optional) |
| Styling | Tailwind CSS 4 |
| Auth | Argon2 password hashing + session cookies |
| Real-time | WebSocket (ws) + Redis pub/sub |
| Push | Web Push API (VAPID) |
| Email | Resend API |
| Telephony | Telnyx WebRTC |
| Monitoring | Watchtower client |
| Runtime | Node.js 22+ |

## Getting Started

```bash
# Clone
git clone https://github.com/thornebridge/pm.git
cd pm

# Install dependencies
pnpm install

# Configure environment
cp .env.example .env
# Edit .env — set PM_ADMIN_PASSWORD and generate VAPID keys:
# npx web-push generate-vapid-keys

# Run database migrations
pnpm drizzle-kit push

# Start development server
pnpm dev
```

The app will be available at `http://localhost:5173`.

## Environment Variables

| Variable | Description | Required |
|----------|------------|----------|
| `DATABASE_URL` | Path to SQLite database file | Yes |
| `PM_ADMIN_EMAIL` | Admin account email | Yes |
| `PM_ADMIN_PASSWORD` | Admin account password | Yes |
| `PM_VAPID_PUBLIC_KEY` | VAPID public key for push notifications | Yes |
| `PM_VAPID_PRIVATE_KEY` | VAPID private key for push notifications | Yes |
| `PM_VAPID_EMAIL` | Contact email for VAPID (mailto: format) | Yes |
| `RESEND_API_KEY` | Resend API key for email notifications | No |

## Telnyx Telephony Setup

The telephony integration is configured entirely in-app (Admin > Telephony). No environment variables needed.

1. Create a [Telnyx](https://telnyx.com) account
2. Buy US phone number(s)
3. Create a **Credential Connection** and note the Connection ID
4. Create a **Telephony Credential** under that connection (via API or portal) and note the Credential ID
5. Set the webhook URL on your connection to `https://your-domain.com/api/webhooks/telnyx` (API v2)
6. In PM, go to **Admin > Telephony**, enable the integration, and enter your API Key, Connection ID, Credential ID, and phone numbers

## Docker Deployment

```bash
docker build -t pm .
docker run -d \
  --name pm \
  -p 3000:3000 \
  -v pm_data:/app/data \
  --env-file .env \
  pm
```

## License

[MIT](LICENSE)
