import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth/guard.js';
import { db } from '$lib/server/db/index.js';
import { gmailThreads, emailReminders } from '$lib/server/db/schema.js';
import { eq, and } from 'drizzle-orm';
import { nanoid } from 'nanoid';

export const POST: RequestHandler = async (event) => {
	const user = requireAuth(event);
	const { threadId } = event.params;

	const [thread] = await db.select()
		.from(gmailThreads)
		.where(and(eq(gmailThreads.id, threadId), eq(gmailThreads.userId, user.id)));

	if (!thread) {
		return new Response(JSON.stringify({ error: 'Thread not found' }), {
			status: 404,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	const body = await event.request.json();
	const { type, remindAt, delayDays } = body as {
		type: 'follow_up' | 'snooze';
		remindAt?: number;
		delayDays?: number;
	};

	if (!type || !['follow_up', 'snooze'].includes(type)) {
		return new Response(JSON.stringify({ error: 'Invalid type' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	const computedRemindAt = remindAt || (delayDays ? Date.now() + delayDays * 86400000 : null);
	if (!computedRemindAt) {
		return new Response(JSON.stringify({ error: 'Must provide remindAt or delayDays' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	const now = Date.now();
	const reminder = {
		id: nanoid(12),
		userId: user.id,
		threadId,
		type,
		remindAt: computedRemindAt,
		messageCountAtCreation: type === 'follow_up' ? thread.messageCount : null,
		status: 'pending' as const,
		firedAt: null,
		cancelledAt: null,
		cancelReason: null,
		createdAt: now
	};

	await db.insert(emailReminders).values(reminder);

	return Response.json(reminder, { status: 201 });
};

export const GET: RequestHandler = async (event) => {
	const user = requireAuth(event);
	const { threadId } = event.params;

	const reminders = await db.select()
		.from(emailReminders)
		.where(and(
			eq(emailReminders.threadId, threadId),
			eq(emailReminders.userId, user.id),
			eq(emailReminders.status, 'pending')
		));

	return Response.json({ reminders });
};

export const DELETE: RequestHandler = async (event) => {
	const user = requireAuth(event);

	const body = await event.request.json();
	const { reminderId } = body as { reminderId: string };

	if (!reminderId) {
		return new Response(JSON.stringify({ error: 'Missing reminderId' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	const [reminder] = await db.select()
		.from(emailReminders)
		.where(and(eq(emailReminders.id, reminderId), eq(emailReminders.userId, user.id)));

	if (!reminder) {
		return new Response(JSON.stringify({ error: 'Reminder not found' }), {
			status: 404,
			headers: { 'Content-Type': 'application/json' }
		});
	}

	await db.update(emailReminders)
		.set({ status: 'cancelled', cancelledAt: Date.now() })
		.where(eq(emailReminders.id, reminderId));

	return Response.json({ ok: true });
};
