import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth/guard.js';
import { db } from '$lib/server/db/index.js';
import { pushSubscriptions } from '$lib/server/db/schema.js';
import { eq, and } from 'drizzle-orm';
import { nanoid } from 'nanoid';

export const POST: RequestHandler = async (event) => {
	const user = requireAuth(event);
	const { endpoint, keys } = await event.request.json();

	if (!endpoint || !keys?.p256dh || !keys?.auth) {
		return json({ error: 'Invalid subscription' }, { status: 400 });
	}

	// Upsert by endpoint
	const existing = db
		.select()
		.from(pushSubscriptions)
		.where(eq(pushSubscriptions.endpoint, endpoint))
		.get();

	if (existing) {
		db.update(pushSubscriptions)
			.set({ keysP256dh: keys.p256dh, keysAuth: keys.auth, userId: user.id })
			.where(eq(pushSubscriptions.id, existing.id))
			.run();
	} else {
		db.insert(pushSubscriptions)
			.values({
				id: nanoid(12),
				userId: user.id,
				endpoint,
				keysP256dh: keys.p256dh,
				keysAuth: keys.auth,
				createdAt: Date.now()
			})
			.run();
	}

	return json({ ok: true });
};

export const DELETE: RequestHandler = async (event) => {
	const user = requireAuth(event);
	const { endpoint } = await event.request.json();

	if (!endpoint) {
		return json({ error: 'endpoint is required' }, { status: 400 });
	}

	db.delete(pushSubscriptions)
		.where(and(eq(pushSubscriptions.userId, user.id), eq(pushSubscriptions.endpoint, endpoint)))
		.run();

	return json({ ok: true });
};
