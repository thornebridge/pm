import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth/guard.js';
import { db } from '$lib/server/db/index.js';
import { notificationPreferences } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';

const DEFAULTS = {
	onAssigned: true,
	onStatusChange: true,
	onComment: true,
	emailEnabled: true,
	reminderDueSoon: true,
	reminderDueToday: true,
	reminderOverdue: true,
	dueDateEmailMode: 'off' as const,
	digestDay: 1,
	digestHour: 8
};

const VALID_EMAIL_MODES = ['off', 'each', 'daily', 'weekly'] as const;

export const GET: RequestHandler = async (event) => {
	const user = requireAuth(event);

	const [prefs] = await db
		.select()
		.from(notificationPreferences)
		.where(eq(notificationPreferences.userId, user.id));

	return json(prefs || DEFAULTS);
};

export const PUT: RequestHandler = async (event) => {
	const user = requireAuth(event);
	const body = await event.request.json();

	// Validate dueDateEmailMode
	if (body.dueDateEmailMode !== undefined && !VALID_EMAIL_MODES.includes(body.dueDateEmailMode)) {
		return json({ error: 'Invalid dueDateEmailMode' }, { status: 400 });
	}
	// Validate digestDay (0-6)
	if (body.digestDay !== undefined && (typeof body.digestDay !== 'number' || body.digestDay < 0 || body.digestDay > 6)) {
		return json({ error: 'digestDay must be 0-6' }, { status: 400 });
	}
	// Validate digestHour (0-23)
	if (body.digestHour !== undefined && (typeof body.digestHour !== 'number' || body.digestHour < 0 || body.digestHour > 23)) {
		return json({ error: 'digestHour must be 0-23' }, { status: 400 });
	}

	const [existing] = await db
		.select()
		.from(notificationPreferences)
		.where(eq(notificationPreferences.userId, user.id));

	if (existing) {
		await db.update(notificationPreferences)
			.set({
				onAssigned: body.onAssigned ?? existing.onAssigned,
				onStatusChange: body.onStatusChange ?? existing.onStatusChange,
				onComment: body.onComment ?? existing.onComment,
				emailEnabled: body.emailEnabled ?? existing.emailEnabled,
				reminderDueSoon: body.reminderDueSoon ?? existing.reminderDueSoon,
				reminderDueToday: body.reminderDueToday ?? existing.reminderDueToday,
				reminderOverdue: body.reminderOverdue ?? existing.reminderOverdue,
				dueDateEmailMode: body.dueDateEmailMode ?? existing.dueDateEmailMode,
				digestDay: body.digestDay ?? existing.digestDay,
				digestHour: body.digestHour ?? existing.digestHour
			})
			.where(eq(notificationPreferences.userId, user.id));
	} else {
		await db.insert(notificationPreferences)
			.values({
				id: nanoid(12),
				userId: user.id,
				onAssigned: body.onAssigned ?? DEFAULTS.onAssigned,
				onStatusChange: body.onStatusChange ?? DEFAULTS.onStatusChange,
				onComment: body.onComment ?? DEFAULTS.onComment,
				emailEnabled: body.emailEnabled ?? DEFAULTS.emailEnabled,
				reminderDueSoon: body.reminderDueSoon ?? DEFAULTS.reminderDueSoon,
				reminderDueToday: body.reminderDueToday ?? DEFAULTS.reminderDueToday,
				reminderOverdue: body.reminderOverdue ?? DEFAULTS.reminderOverdue,
				dueDateEmailMode: body.dueDateEmailMode ?? DEFAULTS.dueDateEmailMode,
				digestDay: body.digestDay ?? DEFAULTS.digestDay,
				digestHour: body.digestHour ?? DEFAULTS.digestHour
			});
	}

	return json({ ok: true });
};
