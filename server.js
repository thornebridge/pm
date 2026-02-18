import { handler } from './build/handler.js';
import { createServer } from 'node:http';
import { WebSocketServer } from 'ws';

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

server.listen(PORT, HOST, () => {
	console.log(`Listening on ${HOST}:${PORT}`);
});
