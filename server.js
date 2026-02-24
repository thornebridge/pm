import { handler } from './build/handler.js';
import { createServer } from 'node:http';
import { WebSocketServer } from 'ws';
import { startHeartbeat, reportError } from '@thornebridge/watchtower-client';

const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = process.env.HOST || '0.0.0.0';

const server = createServer(handler);

// Attach WebSocket server for realtime updates
const wss = new WebSocketServer({ noServer: true });
const clients = new Set();

server.on('upgrade', (request, socket, head) => {
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

// Broadcast to ALL connected clients (workspace-level events like sidebar, dashboard, my-tasks)
globalThis.__wsBroadcastAll = (event) => {
	const payload = JSON.stringify(event);
	for (const ws of clients) {
		if (ws.readyState === 1) {
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

// ─── Redis Subscriber (multi-instance WS relay) ──────────────────────────────

if (process.env.REDIS_URL) {
	import('ioredis').then(({ default: Redis }) => {
		const redisSub = new Redis(process.env.REDIS_URL);
		redisSub.subscribe('ws:project', 'ws:all').catch(() => {});
		redisSub.on('message', (channel, message) => {
			try {
				const data = JSON.parse(message);
				if (channel === 'ws:project' && data.projectId && data.event) {
					const payload = JSON.stringify(data.event);
					for (const ws of clients) {
						if (ws.subscribedProjects?.has(data.projectId) && ws.readyState === 1) {
							ws.send(payload);
						}
					}
				} else if (channel === 'ws:all' && data.event) {
					const payload = JSON.stringify(data.event);
					for (const ws of clients) {
						if (ws.readyState === 1) {
							ws.send(payload);
						}
					}
				}
			} catch {}
		});
		redisSub.on('error', (err) => {
			console.error('[redis-sub]', err.message);
		});
		console.log('[redis-sub] Subscribed to ws:project, ws:all');
	}).catch(() => {
		console.warn('[redis-sub] ioredis not available, skipping Redis subscriber');
	});
}

// ─── Start Server ─────────────────────────────────────────────────────────────

server.listen(PORT, HOST, () => {
	console.log(`Listening on ${HOST}:${PORT}`);
	startHeartbeat('vps3.pm');
});

process.on('uncaughtException', (err) => {
	reportError(err);
	console.error('[uncaught]', err);
});
process.on('unhandledRejection', (reason) => {
	const err = reason instanceof Error ? reason : new Error(String(reason));
	reportError(err);
	console.error('[unhandled]', err);
});
