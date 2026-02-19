import type { RequestHandler } from './$types';
import { requireAdmin } from '$lib/server/auth/guard.js';
import { env } from '$env/dynamic/private';
import fs from 'node:fs';
import path from 'node:path';

export const GET: RequestHandler = async (event) => {
	requireAdmin(event);

	const dbPath = env.DATABASE_URL || './data/pm.db';

	if (!fs.existsSync(dbPath)) {
		return new Response(JSON.stringify({ error: 'Database file not found' }), {
			status: 404,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	const data = fs.readFileSync(dbPath);
	const filename = `pm-backup-${new Date().toISOString().slice(0, 10)}.db`;

	return new Response(data, {
		headers: {
			'Content-Type': 'application/octet-stream',
			'Content-Disposition': `attachment; filename="${filename}"`,
			'Content-Length': String(data.length)
		}
	});
};
