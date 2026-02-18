# PM — Project Management

A lightweight, self-hosted project management app with Kanban boards, real-time collaboration, and push notifications. Built with SvelteKit and SQLite for zero-dependency deployments.

## Features

- **Kanban boards** — Drag-and-drop task management with customizable columns
- **Real-time collaboration** — WebSocket-powered live updates across all connected clients
- **Push notifications** — Browser push notifications for task assignments and updates
- **Invite-only auth** — Admin-controlled user registration via invite tokens
- **SQLite storage** — Single-file database, no external DB server required
- **Projects & tasks** — Organize work into projects with slugs, labels, and priorities
- **Comments** — Threaded task discussions
- **Admin panel** — User management and invite generation

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | SvelteKit 2 |
| Language | TypeScript |
| Database | SQLite via better-sqlite3 |
| ORM | Drizzle ORM |
| Styling | Tailwind CSS 4 |
| Auth | Argon2 password hashing + session cookies |
| Real-time | WebSocket (ws) |
| Push | Web Push API (VAPID) |
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
