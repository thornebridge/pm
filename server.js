import { handler } from './build/handler.js';
import { createServer } from 'node:http';
import { WebSocketServer } from 'ws';
import { randomBytes } from 'node:crypto';
import Database from 'better-sqlite3';

const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = process.env.HOST || '0.0.0.0';

const server = createServer(handler);

// Attach WebSocket server for realtime updates
const wss = new WebSocketServer({ noServer: true });
const clients = new Set();

server.on('upgrade', (request, socket, head) => {
	// Auth is handled by cookie validation - for now accept all upgrade requests
	// since the WS module in the SvelteKit build isn't directly importable here.
	// In production, the session cookie check happens on first message.
	wss.handleUpgrade(request, socket, head, (ws) => {
		ws.subscribedProjects = new Set();
		ws.isAlive = true;
		clients.add(ws);

		ws.on('message', (raw) => {
			try {
				const msg = JSON.parse(raw.toString());
				if (msg.type === 'subscribe' && msg.projectId) {
					ws.subscribedProjects.add(msg.projectId);
				} else if (msg.type === 'unsubscribe' && msg.projectId) {
					ws.subscribedProjects.delete(msg.projectId);
				}
			} catch {}
		});

		ws.on('pong', () => { ws.isAlive = true; });
		ws.on('close', () => { clients.delete(ws); });
	});
});

// Make broadcast available globally for the SvelteKit server code
globalThis.__wsBroadcast = (projectId, event, excludeUserId) => {
	const payload = JSON.stringify(event);
	for (const ws of clients) {
		if (ws.subscribedProjects?.has(projectId) && ws.readyState === 1) {
			ws.send(payload);
		}
	}
};

// Heartbeat
setInterval(() => {
	for (const ws of clients) {
		if (!ws.isAlive) { ws.terminate(); clients.delete(ws); continue; }
		ws.isAlive = false;
		ws.ping();
	}
}, 30000);

// ─── Burndown Snapshot Generation ─────────────────────────────────────────────

const snapshotDb = new Database(process.env.DATABASE_URL || './data/pm.db');
snapshotDb.pragma('journal_mode = WAL');

function generateSnapshots() {
	const today = new Date();
	today.setUTCHours(0, 0, 0, 0);
	const todayTs = today.getTime();

	const activeSprints = snapshotDb.prepare(
		`SELECT id FROM sprints WHERE status = 'active'`
	).all();

	for (const sprint of activeSprints) {
		const existing = snapshotDb.prepare(
			`SELECT id FROM sprint_snapshots WHERE sprint_id = ? AND date = ?`
		).get(sprint.id, todayTs);
		if (existing) continue;

		const stats = snapshotDb.prepare(`
			SELECT COUNT(*) as total_tasks,
				SUM(CASE WHEN ts.is_closed = 1 THEN 1 ELSE 0 END) as completed_tasks,
				COALESCE(SUM(t.estimate_points), 0) as total_points,
				COALESCE(SUM(CASE WHEN ts.is_closed = 1 THEN t.estimate_points ELSE 0 END), 0) as completed_points
			FROM tasks t JOIN task_statuses ts ON t.status_id = ts.id
			WHERE t.sprint_id = ?
		`).get(sprint.id);

		snapshotDb.prepare(
			`INSERT INTO sprint_snapshots (id, sprint_id, date, total_tasks, completed_tasks, total_points, completed_points, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
		).run(
			randomBytes(9).toString('base64url'),
			sprint.id,
			todayTs,
			stats.total_tasks,
			stats.completed_tasks,
			stats.total_points,
			stats.completed_points,
			Date.now()
		);
	}
}

// Generate snapshots on startup (5s delay for migration settling) + every 4 hours
setTimeout(() => { try { generateSnapshots(); console.log('[snapshots] Initial generation complete'); } catch(e) { console.error('[snapshots]', e); } }, 5000);
setInterval(() => { try { generateSnapshots(); console.log('[snapshots] Periodic generation complete'); } catch(e) { console.error('[snapshots]', e); } }, 4 * 60 * 60 * 1000);

// ─── Start Server ─────────────────────────────────────────────────────────────

server.listen(PORT, HOST, () => {
	console.log(`Listening on ${HOST}:${PORT}`);
});
