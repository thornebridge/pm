import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAdmin } from '$lib/server/auth/guard.js';
import { db } from '$lib/server/db/index.js';
import { webhooks } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import crypto from 'node:crypto';

export const GET: RequestHandler = async (event) => {
	requireAdmin(event);
	const all = db.select().from(webhooks).orderBy(webhooks.createdAt).all();
	return json(all);
};

export const POST: RequestHandler = async (event) => {
	const user = requireAdmin(event);
	const { url, events, secret } = await event.request.json();

	if (!url?.trim()) return json({ error: 'URL is required' }, { status: 400 });
	if (!events || !Array.isArray(events) || events.length === 0) {
		return json({ error: 'At least one event is required' }, { status: 400 });
	}

	const webhook = {
		id: nanoid(12),
		url: url.trim(),
		secret: secret?.trim() || crypto.randomBytes(16).toString('hex'),
		events: JSON.stringify(events),
		active: true,
		createdBy: user.id,
		createdAt: Date.now()
	};

	db.insert(webhooks).values(webhook).run();
	return json(webhook, { status: 201 });
};

export const PATCH: RequestHandler = async (event) => {
	requireAdmin(event);
	const { id, active } = await event.request.json();

	if (!id) return json({ error: 'ID is required' }, { status: 400 });

	db.update(webhooks).set({ active }).where(eq(webhooks.id, id)).run();
	return json({ ok: true });
};

export const DELETE: RequestHandler = async (event) => {
	requireAdmin(event);
	const { id } = await event.request.json();
	db.delete(webhooks).where(eq(webhooks.id, id)).run();
	return json({ ok: true });
};
