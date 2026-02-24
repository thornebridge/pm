import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/auth/guard.js';
import { db } from '$lib/server/db/index.js';
import { crmActivities } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';

export const PATCH: RequestHandler = async (event) => {
	requireAuth(event);
	const { activityId } = event.params;

	const [existing] = await db
		.select()
		.from(crmActivities)
		.where(eq(crmActivities.id, activityId));
	if (!existing) return json({ error: 'Activity not found' }, { status: 404 });

	const body = await event.request.json();
	const updates: Record<string, unknown> = { updatedAt: Date.now() };

	const fields = [
		'type',
		'subject',
		'description',
		'companyId',
		'contactId',
		'opportunityId',
		'scheduledAt',
		'completedAt',
		'durationMinutes'
	];
	for (const f of fields) {
		if (f in body) updates[f] = body[f];
	}

	await db.update(crmActivities).set(updates).where(eq(crmActivities.id, activityId));
	const [updated] = await db.select().from(crmActivities).where(eq(crmActivities.id, activityId));
	return json(updated);
};

export const DELETE: RequestHandler = async (event) => {
	requireAuth(event);
	const { activityId } = event.params;

	const [existing] = await db
		.select()
		.from(crmActivities)
		.where(eq(crmActivities.id, activityId));
	if (!existing) return json({ error: 'Activity not found' }, { status: 404 });

	await db.delete(crmActivities).where(eq(crmActivities.id, activityId));
	return json({ ok: true });
};
